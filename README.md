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

### Product - dành cho ADMIN (cần token + role `admin`)

| Method | Đường dẫn | Ghi chú |
| --- | --- | --- |
| GET | `/admin/products` | Query giống `/products` (mặc định 10/trang) |
| POST | `/admin/products` | `{ name, price, categoryId, image, description }` |
| PATCH | `/admin/products/:id` | `{ name, price, categoryId, image, description }` |
| DELETE | `/admin/products/:id` | |

Không có token -> `401`, có token nhưng không phải admin -> `403`.

## Cấu trúc thư mục

```
app.js                      # Khởi tạo express, khai báo routes
config/db.js                # Kết nối Sequelize (đọc từ .env)
models/                     # Model Sequelize (User có thêm role, refresh_token)
middlewares/auth.middleware.js  # verifyToken, checkAdmin
controllers/                # Xử lý logic cho từng API
routes/
├── auth.route.js
├── category.route.js
├── product.route.js        # API user
└── admin/product.route.js  # API admin (router.use(verifyToken, checkAdmin))
database/migration.sql      # Thêm cột role, refresh_token + tài khoản admin mẫu
```
