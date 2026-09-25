# E-commerce Filter API

Backend (Node.js + Express + Sequelize + PostgreSQL) cho bài tập E-commerce Product Filter.

## Cách chạy

```bash
npm install
cp .env.example .env   # rồi sửa thông tin DB nếu cần
npm run dev
```

Chạy file `database/migration.sql` để thêm các cột / bảng mới (chạy lại nhiều lần cũng không sao).
File này cũng tạo sẵn tài khoản admin: `admin@example.com` / `123456`.

## Database

| Bảng | Các cột | Ghi chú |
| --- | --- | --- |
| `users` | `id, name, email, password, role, refresh_token, phone, avatar` | `avatar` lưu đường dẫn `/uploads/...` |
| `categories` | `id, name` | |
| `products` | `id, name, price, category_id, image, description` | `description` là HTML từ Quill editor |
| `cart_items` | `id, user_id, product_id, quantity` | Unique `(user_id, product_id)` -> thêm trùng thì tăng `quantity` |
| `orders` | `id, code, user_id, full_name, phone, address, total_price` | `code`: mã đơn 8 ký tự (chữ in hoa + số), `UNIQUE` |
| `order_items` | `id, order_id, product_id, price, quantity` | `price` là giá lúc mua. Xóa sản phẩm thì `product_id = NULL` |
| `reviews` | `id, user_id, product_id, rating, comment` | `rating` từ 1 đến 5. Unique `(user_id, product_id)`: mỗi user chỉ đánh giá 1 lần |
| `favorites` | `id, user_id, product_id` | Unique `(user_id, product_id)` |

Ngoài các cột trên, **tất cả các bảng** đều có thêm `created_at`, `updated_at`, `deleted_at` -> model dùng:

- `timestamps: true`: Sequelize tự ghi `created_at` khi tạo, `updated_at` khi sửa.
- `paranoid: true`: `destroy()` là **xóa mềm**, chỉ ghi thời gian vào `deleted_at`. Các hàm `findAll`, `findByPk`... tự bỏ qua dòng đã xóa. Muốn lấy cả dòng đã xóa thì thêm `paranoid: false`, muốn xóa hẳn thì `destroy({ force: true })`.
- `underscored: true`: dùng tên cột `created_at` (snake_case) thay vì `createdAt`. Trong code vẫn đọc qua thuộc tính `order.createdAt`.

Vì xóa mềm vẫn giữ dòng cũ, unique `(user_id, product_id)` của `cart_items`, `favorites`, `reviews` là unique index có điều kiện `WHERE deleted_at IS NULL` (nếu không thì xóa khỏi giỏ xong sẽ không thêm lại được).

Riêng giỏ hàng (`cart_items`) luôn **xóa cứng** bằng `destroy({ force: true })` (xóa khỏi giỏ, đặt hàng xong xóa giỏ) vì không cần giữ lịch sử.

Khi admin xóa sản phẩm (xóa mềm): giỏ hàng + yêu thích tự ẩn sản phẩm đó (`include` có `required: true`), lịch sử đơn hàng vẫn hiện đủ (`include` có `paranoid: false`).

## Sinh model từ database (sequelize-auto)

```bash
npm run generate-models
```

Chạy `scripts/generate-models.js`: đọc thông tin kết nối từ `.env` rồi sinh lại toàn bộ `models/` (kể cả `init-models.js`). Cấu hình tương đương câu lệnh:

```bash
npx sequelize-auto -o "./models" -d <DB_NAME> -h <DB_HOST> -u <DB_USER> -x <DB_PASSWORD> -p <DB_PORT> \
  -e postgres -s public -l esm --caseFile c --caseModel p --caseProp o --singularize
```

cộng thêm `additional: { underscored: true }`. sequelize-auto thấy bảng có `created_at / updated_at / deleted_at` sẽ tự thêm `timestamps: true`, `paranoid: true`.

> Sửa DB (thêm cột / bảng) -> cập nhật `database/migration.sql`, chạy lại nó rồi chạy `npm run generate-models`. Không sửa tay trong `models/` vì lần sinh sau sẽ bị ghi đè.

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
| GET | `/profile` | ✓ | Thông tin user đang đăng nhập `{ id, name, email, role, phone, avatar }` |
| PATCH | `/profile` | ✓ | `{ name, phone }` - không cho đổi email |
| PATCH | `/profile/password` | ✓ | `{ currentPassword, newPassword }` |
| PATCH | `/profile/avatar` | ✓ | `multipart/form-data`, field file tên `avatar` |

### Category

| Method | Đường dẫn | Cần token |
| --- | --- | --- |
| GET | `/categories` | ✗ |

### Product - dành cho USER

| Method | Đường dẫn | Cần token | Ghi chú |
| --- | --- | --- | --- |
| GET | `/products` | ✗ | Query: `keyword, categoryId, sort, page, limit` (mặc định 8/trang) |
| GET | `/products/:id` | ✗ | Chi tiết sản phẩm |
| GET | `/products/:id/reviews` | ✗ | Danh sách đánh giá `[{ id, rating, comment, createdAt, user: { id, name, avatar } }]` |
| POST | `/products/:id/reviews` | ✓ | `{ rating, comment }` - đã đánh giá rồi thì trả `400` |

Kết quả của API danh sách gồm 2 phần: `data` là danh sách sản phẩm của trang hiện tại, `meta` là thông tin phân trang.

```json
{
  "data": [{ "id": 1, "name": "MacBook Air M4", "price": 26990000, "image": "...", "categoryId": 1, "categoryName": "Laptop" }],
  "meta": { "page": 1, "limit": 8, "total": 18, "totalPages": 3 }
}
```

### Giỏ hàng (cần token)

| Method | Đường dẫn | Body / Ghi chú |
| --- | --- | --- |
| GET | `/cart` | `[{ id, quantity, product }]` |
| POST | `/cart` | `{ productId, quantity }` - sản phẩm đã có trong giỏ thì cộng dồn `quantity` |
| PATCH | `/cart/:id` | `{ quantity }` - `id` là id của cart item |
| DELETE | `/cart/:id` | |

### Đơn hàng (cần token)

| Method | Đường dẫn | Body / Ghi chú |
| --- | --- | --- |
| POST | `/orders` | `{ fullName, phone, address }` -> `{ id, code, totalPrice }`. Lấy sản phẩm từ giỏ, tạo đơn, xóa giỏ (trong 1 transaction) |
| GET | `/orders` | Lịch sử đơn hàng, mới nhất lên đầu, kèm `items` |
| GET | `/orders/:code` | Chi tiết 1 đơn theo mã đơn (chỉ xem được đơn của mình) |

Thông tin thanh toán (thẻ) chỉ là form giả lập ở frontend, không gửi lên server.

### Yêu thích (cần token)

| Method | Đường dẫn | Body / Ghi chú |
| --- | --- | --- |
| GET | `/favorites` | Mảng sản phẩm yêu thích |
| POST | `/favorites` | `{ productId }` - đã có thì bỏ qua (`findOrCreate`) |
| DELETE | `/favorites/:productId` | |

### Product - dành cho ADMIN (cần token + role `admin`)

| Method | Đường dẫn | Ghi chú |
| --- | --- | --- |
| GET | `/admin/products` | Query giống `/products` (mặc định 10/trang), kết quả cũng có `data` + `meta` |
| POST | `/admin/products` | Body `multipart/form-data`: `name, price, categoryId, description, image (file)` |
| PATCH | `/admin/products/:id` | Body `multipart/form-data`, giống POST. Không gửi `image` thì giữ ảnh cũ |
| DELETE | `/admin/products/:id` | |

Không có token -> `401`, có token nhưng không phải admin -> `403`.

## Upload ảnh sản phẩm (Multer)

- `middlewares/upload.middleware.js`: cấu hình `multer.diskStorage` lưu file vào thư mục `uploads/`, tên file `<fieldname>-<uuid>.<ext>` (vd: `image-...jpg`, `avatar-...jpg`), chỉ nhận JPG/PNG/WEBP, tối đa 5 MB.
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
models/                     # Model sinh bằng sequelize-auto (npm run generate-models), không sửa tay
scripts/generate-models.js  # Chạy sequelize-auto với thông tin DB lấy từ .env
middlewares/
├── auth.middleware.js      # verifyToken, checkAdmin
├── upload.middleware.js    # Multer: diskStorage, fileFilter, limits
└── error.middleware.js     # Bắt lỗi Multer
controllers/                # Xử lý logic cho từng API
utils/format.js             # formatProduct, formatUser, getImageUrl (dùng chung)
routes/
├── auth.route.js           # Đăng nhập, đăng ký, profile
├── category.route.js
├── product.route.js        # API user + reviews
├── cart.route.js
├── order.route.js
├── favorite.route.js
└── admin/product.route.js  # API admin (router.use(verifyToken, checkAdmin))
database/migration.sql      # Thêm cột / bảng mới + tài khoản admin mẫu
uploads/                    # File ảnh upload (không commit)
```
