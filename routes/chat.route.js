import express from 'express'
import { getMyMessages } from '../controllers/chat.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(verifyToken)

// Chỉ dùng để lấy lịch sử. Gửi tin nhắn đi qua socket.io (event "chat:send"), xem socket/index.js
router.get('/messages', getMyMessages)

export default router
