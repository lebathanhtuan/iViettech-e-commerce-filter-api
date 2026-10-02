import express from 'express'
import {
  register,
  login,
  refreshToken,
  logout,
  getMyProfile,
  updateMyProfile,
  changePassword,
  updateAvatar,
} from '../controllers/auth.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'
import upload from '../middlewares/upload.middleware.js'
import { forgotPassword, resetPassword, validateResetPasswordLink } from '../controllers/password-reset.controller.js'
import { passwordResetRateLimit } from '../middlewares/password-reset.middleware.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh-token', refreshToken)
router.post('/forgot-password', passwordResetRateLimit(10), forgotPassword)
router.post('/reset-password/validate', passwordResetRateLimit(60), validateResetPasswordLink)
router.post('/reset-password', passwordResetRateLimit(20), resetPassword)

// Các API dưới đây cần đăng nhập (gửi access token)
router.post('/logout', verifyToken, logout)
router.get('/profile', verifyToken, getMyProfile)
router.patch('/profile', verifyToken, updateMyProfile)
router.patch('/profile/password', verifyToken, changePassword)
router.patch('/profile/avatar', verifyToken, upload.single('avatar'), updateAvatar)

export default router
