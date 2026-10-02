# Sổ địa chỉ và địa chỉ giao hàng

User quản lý địa chỉ tại `/profile?tab=addresses`: thêm, sửa, xóa, đặt mặc định.
Mỗi địa chỉ có tên gợi nhớ (không bắt buộc), người nhận, số điện thoại, tỉnh/thành,
phường/xã/đặc khu và địa chỉ chi tiết. Không có bước chọn quận/huyện.

## 1. Cài đặt

Chạy migration trên database của dự án, rồi khởi động lại backend:

```bash
psql -h localhost -U postgres -d e-commerce-filter_db -f database/migration.sql
npm run dev
```

Phần 5 của migration tạo bảng `addresses` và index. Model `Address` đã được sinh
bằng `sequelize-auto` và commit cùng code. Nếu sửa schema sau này, chạy
`npm run generate-models` theo quy ước chung. Không cần cài thêm thư viện.

Frontend: chạy `npm run dev`, đăng nhập, vào Tài khoản của tôi → Sổ địa chỉ.

## 2. Hai API địa danh mới

Nguồn: [Province Open API](https://provinces.open-api.vn/),
[tài liệu v2](https://provinces.open-api.vn/api/v2/docs).
**Dùng v2** (sau sáp nhập 07/2025), không dùng v1 (địa giới cũ).

| Mục đích | Endpoint nguồn | Endpoint trong dự án |
| --- | --- | --- |
| Danh sách tỉnh/thành | `GET https://provinces.open-api.vn/api/v2/p/` | `GET /locations/provinces` |
| Phường/xã theo tỉnh/thành | `GET https://provinces.open-api.vn/api/v2/p/{provinceCode}?depth=2` | `GET /locations/provinces/:code/wards` |

Ví dụ tỉnh Hà Nội có mã `1`; lấy phường/xã bằng `/api/v2/p/1?depth=2`.
Endpoint nguồn trả object tỉnh có mảng `wards`; backend trả riêng mảng
`[{ code, name }]` để frontend dễ dùng.

Đã kiểm tra ngày **02/10/2026**: hai endpoint nguồn trả HTTP 200,
`Access-Control-Allow-Origin: *` khi gửi `Origin: http://localhost:5173`.
Danh sách trả 34 tỉnh/thành. API không cần key và dùng được từ localhost,
nên không cần tạo hai bảng tỉnh/thành và phường/xã bằng SQL.
Dữ liệu địa danh do nhà cung cấp duy trì; v2 xác định mô hình sau sáp nhập,
không phải cam kết rằng mọi thay đổi địa danh sau này đều đã được cập nhật.

Frontend gọi backend qua `VITE_API_URL`. Backend cache theo endpoint 24 giờ,
gộp request trùng nhau và giới hạn thời gian đợi nguồn ở 8 giây. Nếu nguồn lỗi
nhưng đã có cache thì dùng dữ liệu cache; nếu chưa có cache, trả 503 và giao diện
hiện nút thử lại. Cache ở RAM, mất khi restart. Checkout bằng địa chỉ đã lưu
không cần gọi nguồn địa danh; thêm/sửa hoặc nhập địa chỉ mới cần nguồn hoặc cache.

Có thể đổi nguồn bằng biến môi trường `VIETNAM_PROVINCES_API_URL` nếu server mới
có cùng cấu trúc response và các endpoint `/p/`, `/p/:code?depth=2`.
Mặc định không cần điền biến này. Khi deploy, server cần kết nối HTTPS ra nguồn;
frontend chỉ cần cấu hình đúng `VITE_API_URL`.

## 3. Quy tắc địa chỉ mặc định

- Địa chỉ đầu tiên tự trở thành mặc định, dù không tick checkbox.
- Mỗi user có đúng một mặc định khi Sổ địa chỉ còn địa chỉ.
- Có thể tick mặc định lúc thêm/sửa hoặc bấm **Đặt làm mặc định** ở danh sách.
- Sửa địa chỉ đang mặc định không làm mất mặc định. Để đổi, chọn địa chỉ khác.
- Xóa mặc định: địa chỉ còn lại có ID nhỏ nhất được chọn thay.
- Xóa hết: lần thêm kế tiếp lại tự là mặc định.

Các thao tác thay đổi chạy trong transaction và khóa dòng user bằng
`SELECT ... FOR UPDATE`, nên hai request của cùng user không thể cùng đặt hai
mặc định. Partial unique index trong PostgreSQL là lớp bảo vệ bổ sung:

```sql
CREATE UNIQUE INDEX addresses_one_default_per_user
  ON addresses (user_id) WHERE is_default = TRUE AND deleted_at IS NULL;
```

Địa chỉ dùng xóa mềm (`paranoid: true`) giống phần lớn bảng trong dự án.
Mọi API đều lọc theo `req.user.id`; frontend không được truyền user ID của chủ địa chỉ.
Tên tỉnh/phường lấy từ API nguồn sau khi kiểm tra mã phường thuộc tỉnh;
backend không tin tên tỉnh/phường do client gửi lên.

## 4. API Sổ địa chỉ (cần đăng nhập)

| Method | URL | Ý nghĩa |
| --- | --- | --- |
| GET | `/profile/addresses` | Danh sách địa chỉ, mặc định đứng đầu |
| POST | `/profile/addresses` | Thêm địa chỉ |
| PATCH | `/profile/addresses/:id` | Sửa toàn bộ thông tin địa chỉ |
| PATCH | `/profile/addresses/:id/default` | Đặt địa chỉ làm mặc định |
| DELETE | `/profile/addresses/:id` | Xóa địa chỉ |

Body thêm/sửa:

```json
{
  "label": "Nhà riêng",
  "fullName": "Nguyễn Văn An",
  "phone": "0901234567",
  "provinceCode": 1,
  "wardCode": 4,
  "addressLine": "12 Đường Điện Biên Phủ",
  "isDefault": true
}
```

Response còn có `id`, `provinceName`, `wardName`, `fullAddress`, `isDefault`.
Họ tên tối đa 100 ký tự; tên gợi nhớ 100; chi tiết địa chỉ 160; số điện thoại
10 chữ số bắt đầu bằng 0; địa chỉ ghép đầy đủ tối đa 255 (theo cột `orders.address`).
Đổi tỉnh trên form sẽ xóa lựa chọn phường cũ và tải lại phường thuộc tỉnh mới.

## 5. Checkout

Khi mở checkout, mặc định được chọn tự động và thông tin người nhận được điền.
User có thể chọn địa chỉ khác đã lưu hoặc chọn **Nhập địa chỉ khác**. Nếu Sổ địa chỉ
trống, form nhập mới xuất hiện. Nhập mới tại checkout chỉ dùng cho đơn đó;
thêm vào Sổ địa chỉ qua tab trong profile.

Đặt bằng địa chỉ đã lưu: `POST /orders` với `{ "addressId": 1 }`.
Server tự đọc địa chỉ thuộc user đăng nhập. Đặt bằng địa chỉ nhập mới: gửi
`fullName`, `phone`, `provinceCode`, `wardCode`, `addressLine`.
Body cũ `{ fullName, phone, address }` vẫn được hỗ trợ, có kiểm tra đầu vào.

Đơn lưu **bản chụp thông tin giao hàng lúc đặt** vào `orders.full_name`, `phone`,
`address`. Sửa/xóa địa chỉ sau này không đổi đơn cũ và không làm mất thông tin
trong email xác nhận. Thông tin thẻ vẫn chỉ là giả lập ở frontend.

## 6. File chính

- Backend: `controllers/address.controller.js`, `routes/address.route.js`,
  `routes/location.route.js`, `utils/locations.js`, `models/address.js`.
- Frontend: `components/AddressFields`, `pages/Profile/components/AddressBook.jsx`,
  `redux/slices/address.slice.js`, `redux/thunks/address.thunk.js`, các address/location service.
- Checkout: `pages/Checkout/index.jsx`, `controllers/order.controller.js`.
