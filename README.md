# E-commerce Filter API

Backend (Node.js + Express + Sequelize + PostgreSQL) cho bài tập E-commerce Product Filter.

## Cách chạy

```bash
npm install
cp .env.example .env   # rồi sửa thông tin DB nếu cần
npm run dev
```

Nếu bảng `users` chưa có 2 cột `role`, `refresh_token` thì chạy file `database/migration.sql`
(file này cũng tạo sẵn tài khoản admin: `admin@example.com` / `123456`).

## Biến môi trường (.env)

| Biến | Ý nghĩa |
| --- | --- |
| `PORT` | Port chạy server (mặc định 3000) |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Thông tin kết nối PostgreSQL |
| `JWT_ACCESS_SECRET` | Chuỗi bí mật ký access token |
| `JWT_REFRESH_SECRET` | Chuỗi bí mật ký refresh token |
| `ACCESS_TOKEN_EXPIRES_IN` | Thời gian sống access token (vd: `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN` | Thời gian sống refresh token (vd: `7d`) |
| `BASE_URL` | Địa chỉ public của server, dùng để ghép link ảnh upload (vd: `http://localhost:3000`) |

## Luồng xác thực

1. `POST /login` trả về `accessToken` (sống ngắn) + `refreshToken` (sống dài). Refresh token được lưu vào cột `users.refresh_token`.
2. Frontend gửi `Authorization: Bearer <accessToken>` ở các API cần đăng nhập.
3. Access token hết hạn -> API trả `401` -> frontend gọi `POST /refresh-token` với `refreshToken` để lấy access token mới.
4. `POST /logout` xóa refresh token trong DB -> refresh token cũ không dùng được nữa.

## Danh sách API

### Auth

| Method | Đường dẫn | Cần token | Body / Ghi chú |
| --- | --- | --- | --- |
| POST | `/register` | ✗ | `{ fullName, email, password }` - role luôn là `user` |
| POST | `/login` | ✗ | `{ email, password }` -> `{ accessToken, refreshToken, user }` |
| POST | `/refresh-token` | ✗ | `{ refreshToken }` -> `{ accessToken }` |
| POST | `/logout` | ✓ | Xóa refresh token trong DB |
| GET | `/profile` | ✓ | Thông tin user đang đăng nhập `{ id, name, email, role }` |

### Category

| Method | Đường dẫn | Cần token |
| --- | --- | --- |
| GET | `/categories` | ✗ |

### Product - dành cho USER

| Method | Đường dẫn | Cần token | Ghi chú |
| --- | --- | --- | --- |
| GET | `/products` | ✗ | Query: `keyword, categoryId, sort, page, limit` (mặc định 8/trang) |
| GET | `/products/:id` | ✗ | Chi tiết sản phẩm |

Kết quả của API danh sách gồm 2 phần: `data` là danh sách sản phẩm của trang hiện tại, `meta` là thông tin phân trang.

```json
{
  "data": [{ "id": 1, "name": "MacBook Air M4", "price": 26990000, "image": "...", "categoryId": 1, "categoryName": "Laptop" }],
  "meta": { "page": 1, "limit": 8, "total": 18, "totalPages": 3 }
}
```

### Product - dành cho ADMIN (cần token + role `admin`)

| Method | Đường dẫn | Ghi chú |
| --- | --- | --- |
| GET | `/admin/products` | Query giống `/products` (mặc định 10/trang), kết quả cũng có `data` + `meta` |
| POST | `/admin/products` | Body `multipart/form-data`: `name, price, categoryId, description, image (file)` |
| PATCH | `/admin/products/:id` | Body `multipart/form-data`, giống POST. Không gửi `image` thì giữ ảnh cũ |
| DELETE | `/admin/products/:id` | |

Không có token -> `401`, có token nhưng không phải admin -> `403`.

## Upload ảnh sản phẩm (Multer)

- `middlewares/upload.middleware.js`: cấu hình `multer.diskStorage` lưu file vào thư mục `uploads/`, tên file `image-<uuid>.<ext>`, chỉ nhận JPG/PNG/WEBP, tối đa 5 MB.
- Route dùng `upload.single('image')` -> file nằm trong `req.file`, các field text nằm trong `req.body`.
- DB chỉ lưu đường dẫn tương đối `/uploads/<filename>` (cột `products.image`). Khi trả về frontend, controller ghép `BASE_URL` thành link đầy đủ.
- `app.js` dùng `express.static` để truy cập file: `http://localhost:3000/uploads/<filename>`.
- Lỗi Multer (file quá lớn, sai loại) được bắt ở `middlewares/error.middleware.js`, đặt sau routes.
- Thư mục `uploads/` nằm trong `.gitignore`, server tự tạo khi chạy.

## Xử lý lỗi tập trung

Tất cả controller đều **không viết try/catch**. Express 5 tự bắt lỗi (kể cả lỗi trong hàm `async`) rồi chuyển sang middleware xử lý lỗi ở cuối `app.js`:

```js
app.use('/products', productRoute)
// ... các route khác

// Middleware xử lý lỗi phải đặt sau routes
app.use(errorHandler)
```

`middlewares/error.middleware.js` chia 3 trường hợp:

| Loại lỗi | Ví dụ | Trả về |
| --- | --- | --- |
| Lỗi Multer | File > 5 MB | `400` + message cụ thể |
| Lỗi chủ động (có `error.status`) | `fileFilter` báo sai loại file | `error.status` + `error.message` |
| Lỗi ngoài dự tính | Lỗi database, lỗi code | `500` + `{ message: 'Lỗi server' }`, log full lỗi ra terminal |

Cách tạo lỗi chủ động ở bất kỳ đâu:

```js
const error = new Error('Chỉ cho phép upload file JPG, PNG hoặc WEBP')
error.status = 400
throw error // hoặc cb(error) khi ở trong Multer
```

Những trường hợp **không phải lỗi** thì vẫn `return` response ngay trong controller cho dễ đọc:

```js
if (!product) {
  return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
}
```

Hai chỗ vẫn giữ try/catch có chủ đích, vì token sai là tình huống bình thường và cần trả `401` chứ không phải `500`: `verifyToken` trong `middlewares/auth.middleware.js` và `jwt.verify` trong API `/refresh-token`.

> Express 4 không tự bắt lỗi của hàm `async`. Nếu dùng Express 4 thì controller phải viết `try { ... } catch (error) { next(error) }`.

## Cấu trúc thư mục

```
app.js                      # Khởi tạo express, khai báo routes
config/db.js                # Kết nối Sequelize (đọc từ .env)
models/                     # Model Sequelize (User có thêm role, refresh_token)
middlewares/
├── auth.middleware.js      # verifyToken, checkAdmin
├── upload.middleware.js    # Multer: diskStorage, fileFilter, limits
└── error.middleware.js     # Bắt lỗi Multer
controllers/                # Xử lý logic cho từng API
routes/
├── auth.route.js
├── category.route.js
├── product.route.js        # API user
└── admin/product.route.js  # API admin (router.use(verifyToken, checkAdmin))
database/migration.sql      # Thêm cột role, refresh_token + tài khoản admin mẫu
uploads/                    # File ảnh upload (không commit)
```
