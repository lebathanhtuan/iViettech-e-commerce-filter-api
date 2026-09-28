import { fn, col } from 'sequelize'

import models from '../models/index.js'
import { formatMessage, formatUser } from '../utils/format.js'

const { Message, User } = models

// Chỉ lấy 100 tin gần nhất cho nhẹ (chat đơn giản, chưa làm "tải thêm tin cũ")
const MESSAGE_LIMIT = 100

// Lấy các tin nhắn trong cuộc trò chuyện của 1 user, cũ nhất ở trên
async function findMessagesOfUser(userId) {
  const messages = await Message.findAll({
    where: { user_id: userId },
    order: [['id', 'DESC']],
    limit: MESSAGE_LIMIT,
  })

  // Lấy DESC để có 100 tin MỚI nhất, rồi đảo lại để hiển thị từ cũ -> mới
  return messages.reverse().map(formatMessage)
}

// GET /chat/messages - lịch sử chat của user đang đăng nhập với shop
export async function getMyMessages(req, res) {
  const messages = await findMessagesOfUser(req.user.id)
  res.status(200).json(messages)
}

// GET /admin/chat/conversations - danh sách user đã từng chat, người nhắn gần nhất lên đầu
// Kết quả: [{ user: { id, name, email, avatar, ... }, lastMessage: { id, content, fromAdmin, createdAt, ... } }]
export async function getConversations(req, res) {
  // Bước 1: tìm id tin nhắn mới nhất của từng user
  // SELECT MAX(id) AS id FROM messages GROUP BY user_id
  const lastMessageIds = await Message.findAll({
    attributes: [[fn('MAX', col('id')), 'id']],
    group: ['user_id'],
    raw: true,
  })

  // Bước 2: lấy các tin nhắn đó kèm thông tin user
  const lastMessages = await Message.findAll({
    where: { id: lastMessageIds.map((item) => item.id) },
    include: [{ model: User, as: 'user' }],
    order: [['id', 'DESC']],
  })

  res.status(200).json(
    lastMessages.map((message) => ({
      user: formatUser(message.user),
      lastMessage: formatMessage(message),
    }))
  )
}

// GET /admin/chat/conversations/:userId/messages - lịch sử chat với 1 user
export async function getConversationMessages(req, res) {
  const messages = await findMessagesOfUser(req.params.userId)
  res.status(200).json(messages)
}
