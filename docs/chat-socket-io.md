# Chat giữa user và admin (Socket.IO)

Khách hàng đã đăng nhập chat với shop qua nút chat nổi ở góc phải màn hình. Admin trả lời ở trang `/admin/chat`. Tin nhắn hiện ra ngay ở cả 2 phía, không cần F5.

Mỗi user chỉ có **1 cuộc trò chuyện** với shop. Tất cả admin dùng chung cuộc trò chuyện đó: admin nào cũng thấy và trả lời được.

## 1. Cài đặt

### Backend (`e-commerce-api`)

```bash
npm install            # package socket.io đã có sẵn trong package.json
```

Tạo bảng `messages` bằng cách chạy lại `migration.sql` (chạy lại nhiều lần cũng không sao):

```bash
psql -U postgres -d e-commerce-filter_db -f database/migration.sql
```

Không cần thêm biến môi trường nào. Socket dùng chung port (`PORT`) và `JWT_ACCESS_SECRET` với API.

### Frontend (`e-commerce-web`)

```bash
npm install            # package socket.io-client đã có sẵn trong package.json
```

Frontend kết nối socket tới đúng địa chỉ `VITE_API_URL` trong `.env`, không cần cấu hình thêm.

### Chạy thử

1. Chạy `npm run dev` ở cả 2 project.
2. Mở 2 trình duyệt khác nhau (hoặc 1 cửa sổ thường + 1 cửa sổ ẩn danh), vì token lưu trong `localStorage` nên 2 tab cùng trình duyệt sẽ dùng chung 1 tài khoản.
3. Cửa sổ 1: đăng nhập `an@example.com` / `123456` rồi bấm nút chat ở góc phải.
4. Cửa sổ 2: đăng nhập `admin@example.com` / `123456`, vào menu **Chat với khách hàng**.
5. Nhắn qua lại giữa 2 cửa sổ.

> `database/seed.sql` có sẵn vài tin nhắn mẫu của `an@example.com` và `binh@example.com`.

## 2. Cách hoạt động

```
 User (ChatBox)                     Server                          Admin (/admin/chat)
      |                               |                                    |
      |-- kết nối, gửi access token ->|  io.use(): kiểm tra token          |
      |   join room "user:2"          |<- kết nối, gửi access token -------|
      |                               |   join room "admins"               |
      |                               |                                    |
      |-- emit "chat:send" ---------->|  lưu vào bảng messages             |
      |   { content }                 |                                    |
      |<- emit "chat:message" --------|-- emit "chat:message" ------------>|
      |   (gửi vào room "user:2" và room "admins")                          |
```

- **Room**: gửi vào room nào thì mọi socket trong room đó đều nhận được. Mỗi user có 1 room riêng `user:<id>` (mở nhiều tab thì tab nào cũng nhận). Tất cả admin chung room `admins`.
- **Người gửi cũng nhận lại event `chat:message`**. Frontend chỉ thêm tin nhắn lên màn hình khi nhận được event này (không tự thêm lúc bấm gửi), nên tin nào đã lưu vào DB thì mới hiện.
- **Lịch sử chat lấy bằng REST API**. Socket chỉ dùng để gửi và nhận tin nhắn mới.

### Bảng `messages`

| Cột | Ý nghĩa |
| --- | --- |
| `user_id` | Cuộc trò chuyện này là của khách nào |
| `sender_id` | Ai gửi tin: chính khách đó, hoặc admin |
| `content` | Nội dung (text thường, tối đa 1000 ký tự) |

`sender_id = user_id` là tin của khách, khác nhau là tin của admin. API trả về sẵn field `fromAdmin: true/false`.

### Socket events

| Event | Chiều | Dữ liệu |
| --- | --- | --- |
| `chat:send` | client -> server | User: `{ content }`. Admin: `{ content, userId }` (`userId` là khách đang được trả lời) |
| ack của `chat:send` | server -> client vừa gửi | `{ success: true }` hoặc `{ error: 'message lỗi' }` |
| `chat:message` | server -> client | `{ id, userId, senderId, fromAdmin, content, createdAt }` |

Ack (acknowledgement) là callback truyền vào tham số cuối của `emit`. Server gọi callback đó để báo kết quả cho đúng client vừa gửi:

```js
socket.emit('chat:send', { content: 'Xin chào' }, (response) => {
  if (response.error) { /* hiển thị lỗi */ }
})
```

### REST API (cần token)

| Method | Đường dẫn | Ai dùng | Kết quả |
| --- | --- | --- | --- |
| GET | `/chat/messages` | User | Lịch sử chat của mình (100 tin gần nhất, cũ ở trên) |
| GET | `/admin/chat/conversations` | Admin | `[{ user, lastMessage }]`, người nhắn gần nhất lên đầu |
| GET | `/admin/chat/conversations/:userId/messages` | Admin | Lịch sử chat với 1 khách |

### Xác thực socket

- Frontend gửi access token lúc kết nối: `io(URL, { auth: (cb) => cb({ token }) })`. Dùng hàm thay vì object để mỗi lần kết nối lại đều lấy token mới nhất trong `localStorage`.
- Server kiểm tra token và `users.auth_version` trong `io.use()` qua `utils/auth.js`. Token sai, hết hạn hoặc phiên đã bị thu hồi thì trả lỗi `UNAUTHORIZED`.
- Frontend nhận lỗi ở `connect_error`, gọi `refreshAccessToken()` (dùng chung với interceptor axios) rồi `socket.connect()` lại. Server từ chối kết nối thì socket.io **không tự kết nối lại**, nên phải gọi `connect()` bằng tay.
- Token chỉ được kiểm tra **lúc kết nối**. Đang kết nối mà token hết hạn thì vẫn chat bình thường.
- Khi reset mật khẩu qua email, server ngắt ngay tất cả socket của user trong room `session:<id>`. Access/refresh token cũ không thể kết nối lại. Xem [reset mật khẩu](password-reset.md).

## 3. Các file liên quan

### Backend

```
socket/index.js                  # Khởi tạo socket.io, xác thực, room, event "chat:send"
controllers/chat.controller.js   # API lấy lịch sử chat + danh sách cuộc trò chuyện
routes/chat.route.js             # GET /chat/messages
routes/admin/chat.route.js       # GET /admin/chat/... (verifyToken + checkAdmin)
utils/format.js                  # formatMessage()
models/message.js                # Sinh bằng npm run generate-models
app.js                           # http.createServer(app) + initSocket(server)
```

Trong `app.js`, thay `app.listen()` bằng HTTP server tự tạo để gắn socket.io vào, nên API và socket dùng chung 1 port:

```js
const server = http.createServer(app)
initSocket(server)
server.listen(PORT)
```

> Lỗi trong event socket **không** đi qua `errorHandler` của Express. Vì vậy handler `chat:send` phải tự `try/catch`, nếu không lỗi có thể làm sập server.

### Frontend

```
src/services/socket.js                  # connectSocket, disconnectSocket, sendChatMessage
src/services/chatService.js             # Gọi REST API lấy lịch sử
src/hooks/useChatSocket.js              # Mount: kết nối + lắng nghe "chat:message"; unmount: ngắt kết nối
src/redux/slices/chat.slice.js          # messageList, conversationList + reducer addMessage, updateConversation
src/redux/thunks/chat.thunk.js
src/components/ChatConversation/        # Khung hiển thị tin nhắn + ô nhập (dùng chung cho user và admin)
src/components/ChatBox/                 # Nút chat nổi của user (render trong UserLayout)
src/pages/admin/Chat/                   # Trang /admin/chat
```

- `ChatBox` chỉ render khi đã đăng nhập và không phải admin. Đăng xuất thì component bị gỡ nên socket tự ngắt.
- Chỉ kết nối socket khi đang mở `ChatBox` (user) hoặc trang `/admin/chat` (admin). Admin ở trang khác sẽ không nhận tin realtime, quay lại trang chat thì danh sách được tải lại.
- Trạng thái "chưa đọc" (badge của user, chấm đỏ bên admin) chỉ lưu trên giao diện và mất khi F5. Muốn lưu lâu dài thì cần thêm cột `read_at` vào bảng `messages`.

## 4. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách sửa |
| --- | --- |
| Không hiện nút chat | Chưa đăng nhập, hoặc đang đăng nhập bằng admin (admin dùng trang `/admin/chat`) |
| `relation "messages" does not exist` | Chưa chạy lại `database/migration.sql` |
| Gửi tin báo "Không gửi được tin nhắn" | Backend chưa chạy, hoặc `VITE_API_URL` sai địa chỉ |
| 2 tab cùng trình duyệt thấy chung 1 tài khoản | Token lưu ở `localStorage` dùng chung cho mọi tab. Test bằng 2 trình duyệt, hoặc 1 cửa sổ ẩn danh |
| Deploy lên server thật mà socket không kết nối được | Reverse proxy (Nginx...) phải cho phép WebSocket: `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` |
