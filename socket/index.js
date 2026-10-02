import { Server } from 'socket.io'
import { authenticateAccessToken } from '../utils/auth.js'

import models from '../models/index.js'
import { formatMessage } from '../utils/format.js'

const { Message, User } = models

const MAX_CONTENT_LENGTH = 1000

// Room (phòng) của socket.io: gửi vào room nào thì mọi socket trong room đó đều nhận được
// - Mỗi user có 1 room riêng "user:<id>" (mở nhiều tab thì các tab cùng nằm trong room này)
// - Tất cả admin chung 1 room "admins" -> admin nào cũng thấy tin nhắn của khách
const ADMIN_ROOM = 'admins'
const getUserRoom = (userId) => `user:${userId}`
const getSessionRoom = (userId) => `session:${userId}`
let socketServer

export function disconnectUserSockets(userId) {
  socketServer?.in(getSessionRoom(userId)).disconnectSockets(true)
}

// Gắn socket.io vào HTTP server (dùng chung port với Express)
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })
  socketServer = io

  // Middleware xác thực: chạy 1 lần khi client kết nối
  // Frontend gửi access token qua: io(URL, { auth: { token } })
  io.use(async (socket, next) => {
    try {
      // Giống verifyToken của Express: giải mã ra { id, email, role }
      socket.user = await authenticateAccessToken(socket.handshake.auth.token)
      next()
    } catch {
      // Frontend nhận được lỗi này ở sự kiện "connect_error" -> refresh token rồi kết nối lại
      next(new Error('UNAUTHORIZED'))
    }
  })

  io.on('connection', (socket) => {
    const { id, role } = socket.user
    socket.join(getSessionRoom(id))

    if (role === 'admin') {
      socket.join(ADMIN_ROOM)
    } else {
      socket.join(getUserRoom(id))
    }

    // Client gửi tin nhắn: socket.emit('chat:send', { content, userId }, callback)
    // - User gửi: chỉ cần content (luôn gửi vào cuộc trò chuyện của chính mình)
    // - Admin gửi: cần thêm userId để biết đang trả lời khách nào
    // callback là "acknowledgement": server gọi lại để báo kết quả cho đúng client vừa gửi
    socket.on('chat:send', async (data, callback) => {
      // Client có thể không truyền callback -> dùng hàm rỗng để không bị lỗi khi gọi
      const reply = typeof callback === 'function' ? callback : () => {}

      // Lỗi trong event của socket KHÔNG được errorHandler của Express bắt
      // -> phải tự try/catch, nếu không lỗi có thể làm sập server
      try {
        const content = String(data?.content || '').trim()
        if (!content) {
          return reply({ error: 'Nội dung tin nhắn không được để trống' })
        }
        if (content.length > MAX_CONTENT_LENGTH) {
          return reply({ error: `Tin nhắn tối đa ${MAX_CONTENT_LENGTH} ký tự` })
        }

        let userId = id
        if (role === 'admin') {
          const customer = await User.findByPk(data?.userId)
          if (!customer) {
            return reply({ error: 'Không tìm thấy khách hàng' })
          }
          userId = customer.id
        }

        const message = await Message.create({
          user_id: userId,
          sender_id: id,
          content: content,
        })

        // Gửi tin nhắn mới tới khách + tất cả admin (kể cả người vừa gửi, để hiển thị lên màn hình)
        io.to(getUserRoom(userId)).to(ADMIN_ROOM).emit('chat:message', formatMessage(message))

        reply({ success: true })
      } catch (error) {
        console.error(error)
        reply({ error: 'Lỗi server' })
      }
    })
  })

  return io
}
