import express from 'express'
import {
  getConversations,
  getConversationMessages,
} from '../../controllers/chat.controller.js'
import { verifyToken, checkAdmin } from '../../middlewares/auth.middleware.js'

const router = express.Router()

// Tất cả API trong file này đều phải đăng nhập và có role admin
router.use(verifyToken, checkAdmin)

router.get('/conversations', getConversations)
router.get('/conversations/:userId/messages', getConversationMessages)

export default router
