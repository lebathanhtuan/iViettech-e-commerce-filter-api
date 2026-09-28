# Gửi email xác nhận đơn hàng (Nodemailer + Gmail)

Đặt hàng thành công (`POST /orders`) thì server gửi email xác nhận tới **email tài khoản** của người đặt. Email gồm mã đơn, ngày đặt, danh sách sản phẩm, tổng tiền, thông tin giao hàng và nút "Xem đơn hàng".

Mục lục:

1. [Email được gửi đi như thế nào](#1-email-được-gửi-đi-như-thế-nào)
2. [Setup với Gmail](#2-setup-với-gmail)
3. [Cách hoạt động trong code](#3-cách-hoạt-động-trong-code)
4. [Mở rộng: gửi thêm loại email khác](#4-mở-rộng-gửi-thêm-loại-email-khác)
5. [Giới hạn và lưu ý](#5-giới-hạn-và-lưu-ý)
6. [Lỗi thường gặp](#6-lỗi-thường-gặp)

---

## 1. Email được gửi đi như thế nào

Server Node.js không tự gửi email thẳng tới hộp thư người nhận. Server nhờ một **SMTP server** (ở đây là của Gmail) gửi giúp, giống như mang thư ra bưu điện:

```
 Server Node.js                     SMTP server của Gmail                Hộp thư người nhận
 (Nodemailer)                       smtp.gmail.com                       (Gmail, Outlook, Yahoo...)
      |                                    |                                     |
      |-- 1. mở kết nối (port 465, SSL) -->|                                     |
      |-- 2. đăng nhập: user + password -->|  kiểm tra tài khoản                 |
      |-- 3. gửi nội dung email ---------->|                                     |
      |<- 4. "250 OK" (đã nhận thư) -------|                                     |
      |                                    |-- 5. chuyển thư tới người nhận ---->|
```

- **SMTP** (Simple Mail Transfer Protocol): giao thức chuẩn để gửi email. Gmail, Outlook, Mailtrap... đều có SMTP server.
- **Nodemailer**: thư viện Node.js lo hết bước 1 đến 4 (mở kết nối, mã hóa, đăng nhập, đóng gói nội dung theo chuẩn email). Mình chỉ cần đưa thông tin SMTP và nội dung thư.
- Bước 4 thành công chỉ có nghĩa là **Gmail đã nhận thư**, chưa chắc thư đã tới hộp thư người nhận. Nếu địa chỉ người nhận không tồn tại, Gmail sẽ gửi lại một thư báo lỗi ("Address not found") vào hộp thư **của tài khoản gửi**, còn server Node.js không biết gì cả.

---

## 2. Setup với Gmail

### Bước 1: Tạo App Password

Google không cho ứng dụng bên ngoài đăng nhập SMTP bằng mật khẩu Gmail thường. Phải tạo một **App Password** (Mật khẩu ứng dụng) riêng:

1. Bật **Xác minh 2 bước** cho tài khoản Google: <https://myaccount.google.com/security>. Chưa bật thì không tạo được App Password.
2. Vào <https://myaccount.google.com/apppasswords>, đặt tên tùy ý (vd: `MyShop`) rồi bấm **Tạo**.
3. Google hiện một mật khẩu 16 ký tự dạng `abcd efgh ijkl mnop`. **Copy ngay**, vì đóng hộp thoại là không xem lại được nữa (quên thì xóa đi tạo cái mới).

> Nên dùng một tài khoản Gmail riêng cho shop, không dùng Gmail cá nhân. App Password có quyền truy cập tài khoản, lộ ra thì người khác gửi được mail bằng tài khoản đó. Nếu lỡ lộ, vào lại trang App Passwords để xóa.

### Bước 2: Điền vào `.env`

`.env` đã có sẵn cấu hình SMTP của Gmail. Chỉ cần điền 3 dòng cuối:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=yourshop@gmail.com              # Gmail dùng để gửi
MAIL_PASSWORD=abcdefghijklmnop            # App Password, viết liền không có dấu cách
MAIL_FROM="MyShop <yourshop@gmail.com>"   # Tên hiển thị <email>, email phải trùng MAIL_USER

CLIENT_URL=http://localhost:5173          # Dùng cho link "Xem đơn hàng" trong email
```

| Biến | Ý nghĩa |
| --- | --- |
| `MAIL_HOST` | Địa chỉ SMTP server của Gmail |
| `MAIL_PORT` | `465`: kết nối mã hóa SSL ngay từ đầu (khuyên dùng). Có thể dùng `587` (xem [mục 3.1](#31-port-và-secure)) |
| `MAIL_SECURE` | `true` với port 465, `false` với port 587 |
| `MAIL_USER` | Tài khoản Gmail dùng để đăng nhập SMTP |
| `MAIL_PASSWORD` | App Password vừa tạo |
| `MAIL_FROM` | Người gửi hiển thị trong hộp thư, dạng `"Tên <email>"`. Bỏ trống thì dùng `MAIL_USER`. Gmail luôn gửi bằng email của `MAIL_USER`, ghi email khác vào đây thì Gmail cũng tự đổi lại |

Có dấu cách hoặc dấu `<>` thì phải bọc cả giá trị trong dấu nháy kép `"..."`.

### Bước 3: Kiểm tra kết nối

Chạy lệnh sau ở thư mục `e-commerce-api`. Lệnh chỉ đăng nhập thử vào Gmail, không gửi thư:

```bash
node --input-type=module -e "import 'dotenv/config'; const { default: transporter } = await import('./config/mail.js'); await transporter.verify(); console.log('Kết nối SMTP thành công')"
```

- In ra `Kết nối SMTP thành công`: cấu hình đúng.
- Báo lỗi: tra ở [mục 6](#6-lỗi-thường-gặp).

### Bước 4: Gửi thử

1. **Khởi động lại backend** (`npm run dev`). `nodemon` chỉ theo dõi file code, sửa `.env` thì nó không tự restart.
2. Các tài khoản mẫu dùng email giả (`an@example.com`...) nên thư sẽ không tới đâu. Vào trang `/register` trên frontend, **đăng ký một tài khoản bằng email thật** của bạn.
3. Đăng nhập bằng tài khoản đó, thêm sản phẩm vào giỏ rồi thanh toán.
4. Terminal của backend in `Đã gửi email đơn hàng <mã đơn> tới <email>`. Mở hộp thư để xem, nhớ xem cả mục **Spam**.

---

## 3. Cách hoạt động trong code

Có 3 file liên quan:

```
config/mail.js                      # Tạo transporter từ biến MAIL_* trong .env
utils/mail.js                       # Tạo nội dung HTML + hàm sendOrderConfirmationEmail(orderId)
controllers/order.controller.js     # Tạo đơn xong thì gọi sendOrderConfirmationEmail
```

Luồng chạy khi user bấm "Đặt hàng":

```
POST /orders
  └─ createOrder (controllers/order.controller.js)
       ├─ 1. transaction: tạo order + order_items, xóa giỏ hàng
       ├─ 2. sendOrderConfirmationEmail(newOrder.id)     <- gọi nhưng KHÔNG await
       └─ 3. res.status(201).json(...)                   <- trả kết quả ngay cho frontend
                │
                └─ (chạy ngầm, song song với bước 3) utils/mail.js
                     ├─ a. chưa cấu hình MAIL_* -> in cảnh báo rồi dừng
                     ├─ b. lấy lại order kèm user + sản phẩm từ DB
                     ├─ c. tạo nội dung HTML
                     ├─ d. transporter.sendMail(...)   (mất 1 đến vài giây)
                     └─ e. log thành công, hoặc log lỗi
```

### 3.1. Port và secure

Dữ liệu đi qua mạng phải được mã hóa (TLS/SSL), nếu không người khác có thể đọc được mật khẩu và nội dung thư. Gmail có 2 cách:

| Port | `MAIL_SECURE` | Cách mã hóa |
| --- | --- | --- |
| `465` | `true` | **SSL/TLS**: mã hóa ngay từ lúc mở kết nối |
| `587` | `false` | **STARTTLS**: mở kết nối thường, rồi gửi lệnh `STARTTLS` để chuyển sang mã hóa trước khi đăng nhập. Nodemailer tự làm bước này |

`MAIL_SECURE=false` **không có nghĩa là gửi không mã hóa**. Nó chỉ có nghĩa là "chưa mã hóa lúc mới mở kết nối", sau đó Nodemailer vẫn tự nâng cấp lên TLS. Hai giá trị phải đi đúng cặp: ghép sai (465 + `false`, 587 + `true`) sẽ bị lỗi ngay lúc kết nối (xem [mục 6](#6-lỗi-thường-gặp)).

### 3.2. `config/mail.js`: transporter

```js
export const isMailConfigured = Boolean(
  process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASSWORD
)

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
})
```

- **Transporter** là object giữ thông tin kết nối tới SMTP server, có thể hiểu là "người đưa thư". Chỉ tạo **1 lần** khi server khởi động rồi dùng lại cho mọi lần gửi. `createTransport` chưa kết nối gì cả, lúc `sendMail` mới thật sự kết nối.
- Giá trị trong `.env` luôn là **chuỗi**, nên phải tự chuyển kiểu:
  - `Number(process.env.MAIL_PORT)`: `'465'` -> `465`.
  - `process.env.MAIL_SECURE === 'true'`: chuỗi `'false'` vẫn là truthy, nên không viết `secure: process.env.MAIL_SECURE` được.
- `isMailConfigured`: kiểm tra đã điền đủ thông tin chưa. Chưa điền thì server vẫn chạy bình thường, chỉ bỏ qua bước gửi mail.
- File này đọc `process.env` ngay lúc được import, nên `.env` phải được nạp trước. Đó là lý do `import 'dotenv/config'` phải là **dòng import đầu tiên** trong `app.js`.

### 3.3. `transporter.sendMail()`: gửi 1 email

```js
await transporter.sendMail({
  from: process.env.MAIL_FROM || process.env.MAIL_USER,
  to: order.user.email,
  subject: `[MyShop] Xác nhận đơn hàng #${order.code}`,
  html: buildOrderEmailHtml(order),
})
```

Các option hay dùng:

| Option | Ý nghĩa |
| --- | --- |
| `from` | Người gửi, vd `"MyShop <yourshop@gmail.com>"` |
| `to` | Người nhận. Nhiều người thì dùng mảng hoặc chuỗi cách nhau bằng dấu phẩy |
| `cc`, `bcc` | Đồng gửi / gửi ẩn danh (người nhận không thấy danh sách `bcc`) |
| `subject` | Tiêu đề. Có tiếng Việt cũng được, Nodemailer tự mã hóa UTF-8 |
| `html` | Nội dung dạng HTML |
| `text` | Nội dung dạng text thường, dùng khi hộp thư của người nhận không hiển thị được HTML (project này chưa dùng) |
| `attachments` | File đính kèm, vd `[{ filename: 'hoa-don.pdf', path: './invoices/abc.pdf' }]` |

`sendMail` trả về Promise. Thành công thì trả về object `info`, ví dụ:

```js
{
  messageId: '<eba07c96-4430-b4ca-3ffe-df3a6e5c7454@gmail.com>',
  accepted: ['khach@gmail.com'],   // SMTP server đã nhận thư cho các địa chỉ này
  rejected: [],                    // Các địa chỉ bị từ chối ngay
  response: '250 2.0.0 OK ...',    // Câu trả lời của SMTP server
}
```

Thất bại (sai mật khẩu, mất mạng...) thì Promise bị **reject**, tức là `await` sẽ ném lỗi.

### 3.4. Vì sao KHÔNG `await` việc gửi mail?

Trong `createOrder`:

```js
const newOrder = await sequelize.transaction(async (transaction) => { ... })

sendOrderConfirmationEmail(newOrder.id) // không có await

res.status(201).json({ ... })
```

Gọi hàm async mà không `await` thì hàm vẫn chạy, nhưng code phía sau **không chờ** nó xong. Đây là kiểu "fire and forget" (bắn rồi quên). So sánh 2 cách:

| | Có `await` | Không `await` (đang dùng) |
| --- | --- | --- |
| Thời gian chờ của user | Chờ gửi mail xong (1 đến vài giây) mới thấy trang "Đặt hàng thành công" | Thấy kết quả ngay |
| Gửi mail bị lỗi | Lỗi được ném ra, `errorHandler` trả về `500 Lỗi server`. Nhưng **đơn hàng đã được tạo** và giỏ hàng đã bị xóa rồi, nên user tưởng đặt thất bại và có thể đặt lại, tạo ra đơn trùng | Đơn hàng vẫn thành công, lỗi chỉ được log ra terminal |

Email chỉ là thông báo phụ, không được phép làm hỏng việc chính (đặt hàng), nên không `await`.

### 3.5. Vì sao `sendOrderConfirmationEmail` phải tự `try/catch`?

```js
export async function sendOrderConfirmationEmail(orderId) {
  if (!isMailConfigured) {
    console.warn('Chưa cấu hình MAIL_* trong .env -> bỏ qua gửi email đơn hàng')
    return
  }

  try {
    const order = await Order.findByPk(orderId, { include: [...] })
    await transporter.sendMail({ ... })
    console.log(`Đã gửi email đơn hàng ${order.code} tới ${order.user.email}`)
  } catch (error) {
    console.error('Gửi email đơn hàng thất bại:', error)
  }
}
```

Các controller khác không cần `try/catch` vì Express 5 tự bắt lỗi của controller. Hàm này thì khác:

- Hàm được gọi **không có `await`**, lúc nó lỗi thì controller đã trả response xong từ lâu, nên Express không bắt được và `errorHandler` cũng không nhận được lỗi.
- Một Promise bị reject mà không có ai bắt gọi là **unhandled rejection**. Từ Node.js 15 trở đi, unhandled rejection sẽ **làm dừng (crash) cả server**.

Vì vậy hàm phải tự bắt mọi lỗi bên trong và chỉ log ra terminal.

### 3.6. Vì sao truyền `orderId` rồi query lại, không truyền luôn `newOrder`?

`newOrder` trả về từ `Order.create()` chỉ có các cột của bảng `orders`. Email cần thêm:

- **email + tên người đặt** (bảng `users`), vì mail gửi tới email tài khoản chứ không phải thông tin giao hàng
- **danh sách sản phẩm** (bảng `order_items` + `products`)

Nên hàm gửi mail tự query lại bằng `findByPk` kèm `include`. Controller chỉ cần 1 dòng `sendOrderConfirmationEmail(newOrder.id)`, không phải lo chuẩn bị dữ liệu cho email. Sản phẩm dùng `paranoid: false` giống lịch sử đơn hàng, để sản phẩm vừa bị admin xóa mềm vẫn hiện tên trong mail.

### 3.7. Nội dung HTML của email (`buildOrderEmailHtml`)

Nội dung email là một chuỗi HTML tạo bằng template string. Danh sách sản phẩm được `map` ra từng dòng `<tr>` rồi `join('')` lại:

```js
const itemRows = order.order_items
  .map((item) => `
    <tr>
      <td>${escapeHtml(item.product?.name || 'Sản phẩm đã bị xóa')}</td>
      <td>${item.quantity}</td>
      ...
    </tr>`)
  .join('')
```

Vài điểm cần chú ý:

**a. Escape HTML dữ liệu do user nhập.** Họ tên, số điện thoại, địa chỉ là do user gõ vào. Nếu ghép thẳng vào HTML, user có thể chèn thẻ HTML vào nội dung email:

```
User nhập họ tên:   Trần <b>Thị</b> Bình
Không escape:       Trần Thị Bình   (chữ "Thị" bị in đậm, tức HTML của user đã chạy)
Có escapeHtml():    Trần &lt;b&gt;Thị&lt;/b&gt; Bình   -> hộp thư hiển thị đúng chữ "Trần <b>Thị</b> Bình"
```

`escapeHtml()` đổi các ký tự đặc biệt `& < > " '` thành dạng `&amp; &lt; &gt; &quot; &#39;`. Chúng hiển thị ra đúng ký tự đó nhưng không còn được hiểu là thẻ HTML nữa. Đây cũng là lý do bình luận của user trên web không dùng `dangerouslySetInnerHTML`.

**b. CSS phải viết inline.** Gmail, Outlook... xóa bớt hoặc bỏ qua thẻ `<style>` và file CSS bên ngoài. Cách chắc chắn nhất là viết `style="..."` trực tiếp trên từng thẻ, và dùng `<table>` để chia bố cục (hộp thư không hỗ trợ tốt flex/grid).

**c. Múi giờ.** Server khi deploy thường chạy giờ UTC. Nên phải chỉ rõ múi giờ Việt Nam khi hiển thị ngày đặt:

```js
order.createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
// "14:56:40 28/9/2026"
```

**d. Link "Xem đơn hàng"** ghép từ `CLIENT_URL` (địa chỉ frontend) + `/checkout/success/<mã đơn>`. Deploy lên server thật thì đổi `CLIENT_URL` thành domain thật.

**e. Không có ảnh sản phẩm.** Ảnh upload có địa chỉ `http://localhost:3000/uploads/...`. Người nhận mở mail trên máy của họ nên không tải được ảnh từ `localhost`. Muốn có ảnh thì ảnh phải nằm ở một địa chỉ public trên internet.

---

## 4. Mở rộng: gửi thêm loại email khác

Dùng lại `transporter`, chỉ cần viết thêm hàm trong `utils/mail.js`. Ví dụ email chào mừng khi đăng ký:

```js
// utils/mail.js
export async function sendWelcomeEmail(user) {
  if (!isMailConfigured) {
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: user.email,
      subject: 'Chào mừng bạn đến với MyShop',
      html: `<p>Xin chào <strong>${escapeHtml(user.name)}</strong>, cảm ơn bạn đã đăng ký tài khoản!</p>`,
    })
  } catch (error) {
    console.error('Gửi email chào mừng thất bại:', error)
  }
}
```

```js
// controllers/auth.controller.js - trong hàm register, sau User.create(...)
sendWelcomeEmail(newUser) // cũng không await, lý do giống mục 3.4
```

Nhớ giữ đủ 3 quy tắc: kiểm tra `isMailConfigured`, tự `try/catch`, và escape dữ liệu do user nhập.

---

## 5. Giới hạn và lưu ý

- **Giới hạn gửi của Gmail**: tài khoản Gmail thường gửi được khoảng **500 thư/ngày**. Vượt quá thì Gmail khóa gửi tạm thời (khoảng 24 giờ). Đủ để học và demo, nhưng shop thật nên dùng dịch vụ chuyên gửi mail (SendGrid, Amazon SES, Resend...). Đổi sang dịch vụ đó chỉ cần sửa `MAIL_*` trong `.env`, code giữ nguyên.
- **Gửi lỗi là mất luôn**: code hiện tại không gửi lại (retry). Muốn chắc chắn thư tới nơi thì phải lưu "việc cần gửi" vào DB hoặc hàng đợi (vd: BullMQ) rồi gửi lại khi lỗi. Với bài tập này, log lỗi là đủ.
- **Thư có thể vào Spam**, nhất là lúc mới dùng tài khoản gửi. Có thể bấm "Không phải thư rác" để Gmail học dần.
- **Không commit `.env`**: `.env` đã nằm trong `.gitignore`. Chỉ ghi App Password vào `.env`, không ghi vào `.env.example` hay vào code.

---

## 6. Lỗi thường gặp

Các lỗi được in ra terminal của backend, sau dòng `Gửi email đơn hàng thất bại:`. Khi test bằng lệnh kiểm tra ở [Bước 3](#bước-3-kiểm-tra-kết-nối), lỗi in ra ngay trên terminal.

| Lỗi | Nguyên nhân / cách sửa |
| --- | --- |
| `Chưa cấu hình MAIL_* trong .env -> bỏ qua gửi email đơn hàng` | Chưa điền `MAIL_USER` / `MAIL_PASSWORD`, hoặc sửa `.env` xong chưa restart server |
| `Invalid login: 535-5.7.8 Username and Password not accepted` (`code: 'EAUTH'`) | Đang dùng mật khẩu Gmail thường, hoặc App Password bị gõ sai / còn dấu cách / đã bị xóa. Tạo lại App Password ([Bước 1](#bước-1-tạo-app-password)) |
| Trang App Passwords báo "Không có sẵn cài đặt bạn đang tìm" | Chưa bật Xác minh 2 bước, hoặc tài khoản do công ty/trường quản lý đã tắt tính năng này. Dùng tài khoản Gmail cá nhân khác |
| `SSL routines:...:wrong version number` (`code: 'ESOCKET'`) | Dùng port 587 nhưng `MAIL_SECURE=true`. Sửa thành `false`, hoặc đổi sang port 465 |
| `Connection closed` hoặc `Greeting never received` | Dùng port 465 nhưng `MAIL_SECURE=false`. Sửa thành `true` |
| `ECONNREFUSED`, `ETIMEDOUT`, `EHOSTUNREACH` | Sai `MAIL_HOST` (vd gõ nhầm `smtp.gmial.com`), hoặc mạng (wifi công ty, trường...) chặn port SMTP. Thử đổi port 465 <-> 587 (nhớ đổi `MAIL_SECURE` theo), hoặc dùng mạng khác (4G) |
| Terminal báo đã gửi nhưng không thấy thư | Xem mục Spam. Gửi tới email giả (`@example.com`) thì thư không tới đâu cả, Gmail sẽ gửi thư báo lỗi "Address not found" về hộp thư của `MAIL_USER` |
| `Daily user sending limit exceeded` | Vượt giới hạn khoảng 500 thư/ngày của Gmail, chờ khoảng 24 giờ |
