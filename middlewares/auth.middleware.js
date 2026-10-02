import { authenticateAccessToken } from '../utils/auth.js'

// Kiểm tra access token gửi lên trong header: Authorization: Bearer <token>
export const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không có token' })
  }

  const token = authorization.split(' ')[1]

  try {
    // Giải mã token -> lấy được { id, email, role } đã ký lúc login
    req.user = await authenticateAccessToken(token)
    next()
  } catch (error) {
    if (error.status === 401) return res.status(401).json({ message: error.message })
    next(error)
  }
}

// Chỉ cho phép admin đi tiếp (phải dùng sau verifyToken)
export const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập' })
  }
  next()
}
