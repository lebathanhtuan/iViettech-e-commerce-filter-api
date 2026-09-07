import express from 'express'
import {
  register,
  login,
  refreshToken,
  logout,
  getMyProfile,
} from '../controllers/auth.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh-token', refreshToken)

// Các API dưới đây cần đăng nhập (gửi access token)
router.post('/logout', verifyToken, logout)
router.get('/profile', verifyToken, getMyProfile)

export default router
