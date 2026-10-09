# Quên mật khẩu và đặt lại mật khẩu qua email

## Luồng sử dụng

1. Chọn **Quên mật khẩu?** ở `/login`, nhập email tại `/forgot-password`.
2. Giao diện báo đã nhận yêu cầu; có nút gửi lại sau 60 giây và nhập email khác.
   Thông báo giống nhau cho email có/không có tài khoản để không lộ danh sách user.
3. Email có link `${CLIENT_URL}/reset-password#token=...`. Link hết hạn sau 15 phút.
4. Trang reset kiểm tra link trước khi hiển thị form mật khẩu mới và xác nhận.
   Mở link không tiêu thụ token, nên email preview không làm mất link.
5. Đặt lại thành công thì hiển thị màn hình thành công và nút đăng nhập.
   Link hết hạn, thiếu, sai hoặc đã dùng hiển thị màn hình yêu cầu link mới.
   Lỗi mạng khi kiểm tra có nút thử lại.

## Cấu hình local

Các cột quên mật khẩu (`reset_password_*`, `auth_version`) nằm trong bảng `users` của `database/schema.sql`.
DB tạo từ file này đã có sẵn, chỉ cần chạy backend:

```bash
npm run dev
```

Không chạy `seed.sql` trên DB cần giữ dữ liệu. Model `models/user.js` được sinh
từ database bằng sequelize-auto, không sửa tay.

Backend dùng lại Nodemailer, transporter và các biến `MAIL_*` của email đơn hàng:

```dotenv
CLIENT_URL=http://localhost:5173
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM="MyShop <your-email@gmail.com>"
```

`CLIENT_URL` phải khớp địa chỉ frontend thực tế (ví dụ đổi thành port 5174
nếu Vite đang chạy ở 5174). Với Gmail, dùng App Password như hướng dẫn
[email đơn hàng](order-email-nodemailer.md). Khởi động lại backend sau khi đổi `.env`.
Frontend gọi backend qua `VITE_API_URL` trong `.env` của project web.

Thiếu SMTP hoặc `CLIENT_URL` không hợp lệ thì `/forgot-password` trả `503`
cho mọi email. Khi đã cấu hình, API trả thông báo chung sau khi ghi DB,
không chờ kết nối SMTP. Nếu SMTP thất bại, server hủy token của lần gửi đó và
cho yêu cầu lại; log chỉ ghi mã lỗi, không ghi token hoặc mật khẩu.
Thông báo đã nhận yêu cầu không có nghĩa email đã đến hộp thư.

## API công khai

| Method | Đường dẫn | Body | Kết quả |
| --- | --- | --- | --- |
| POST | `/forgot-password` | `{ email }` | `200`, thông báo chung + `resendAfter: 60` |
| POST | `/reset-password/validate` | `{ token }` | `200`, `{ valid: true }` |
| POST | `/reset-password` | `{ token, newPassword, confirmPassword }` | `200`, yêu cầu đăng nhập lại |

Link sai/hết hạn/đã dùng trả `400` với `code: INVALID_RESET_LINK`. Mật khẩu
mới tối thiểu 8 ký tự, tối đa 72 byte UTF-8 (giới hạn bcrypt), không chỉ có
khoảng trắng và phải khớp xác nhận. Token được gửi trong body POST; phần
`#token` không nằm trong HTTP request tới server frontend. Trang reset xóa
token khỏi URL sau khi thành công.

## Dữ liệu và phiên đăng nhập

- Token ngẫu nhiên 32 byte từ `crypto.randomBytes`; DB chỉ lưu SHA-256 trong
  `users.reset_password_token_hash`, thời hạn ở `reset_password_expires_at`.
- Mỗi user chỉ có một link đang hiệu lực. Yêu cầu link mới sau thời gian chờ
  sẽ thay token cũ. Đổi mật khẩu trong profile cũng hủy link reset đang có.
- Reset khóa dòng user trong transaction, cập nhật password và xóa token cùng
  lúc. Hai request cùng token chỉ một request thành công.
- Reset tăng `auth_version`, xóa refresh token và ngắt socket đang mở.
  JWT version cũ bị từ chối ở REST, refresh và khi kết nối socket.
- Gửi lại theo tài khoản tối thiểu 60 giây. Giới hạn IP mỗi 15 phút:
  10 yêu cầu gửi mail, 60 kiểm tra link, 20 reset; vượt giới hạn trả `429`
  và header `Retry-After`.

Tham khảo: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Deploy

1. Tạo DB từ `database/schema.sql` (hoặc `npm run db:sync`) trước khi khởi động backend; giữ `MAIL_*`,
   DB và JWT secrets trong biến môi trường của host.
2. Đặt `CLIENT_URL=https://domain-frontend-cua-ban` và `VITE_API_URL` là URL
   backend. Link được tạo từ `CLIENT_URL` tin cậy, không lấy từ header `Host`.
3. Cấu hình frontend trả `index.html` cho các route React Router, để mở link
   `/reset-password` trực tiếp từ email vẫn hoạt động.
4. Chọn SMTP mà host cho phép kết nối; cấu hình sender/domain theo nhà cung cấp.
   Dùng một tài khoản test của bạn để kiểm tra email thực tế và thư rác.

Bản đồ án chạy một tiến trình backend thường trực. Nếu chạy nhiều instance,
dùng rate limiter có kho chung (Redis/gateway) và Socket.IO Redis adapter để
ngắt các phiên socket trên mọi instance. Sau reverse proxy, cấu hình Express
`trust proxy` theo đúng hạ tầng để giới hạn theo IP client thực tế.
Gửi SMTP hiện chạy sau response trong tiến trình Node: với serverless hoặc
nếu cần bảo đảm không mất tác vụ khi restart, chuyển sang queue/outbox có worker.
