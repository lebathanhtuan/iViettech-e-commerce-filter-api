import jwt from 'jsonwebtoken'
import models from '../models/index.js'

// Dùng chung cho REST và Socket.IO. Token phát trước tính năng này được xem là version 0.
export async function authenticateAccessToken(token) {
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
  } catch {
    const error = new Error('Token không hợp lệ hoặc đã hết hạn')
    error.status = 401
    throw error
  }
  const user = await models.User.findByPk(decoded.id)
  if (!user || user.auth_version !== (decoded.version ?? 0)) {
    const error = new Error('Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.')
    error.status = 401
    throw error
  }
  return { id: user.id, email: user.email, role: user.role, version: user.auth_version }
}
