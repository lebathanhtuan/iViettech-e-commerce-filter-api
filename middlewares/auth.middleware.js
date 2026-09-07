import jwt from 'jsonwebtoken'

// Kiểm tra access token gửi lên trong header: Authorization: Bearer <token>
export const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không có token' })
  }

  const token = authorization.split(' ')[1]

  try {
    // Giải mã token -> lấy được { id, email, role } đã ký lúc login
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    req.user = decoded
    next()
  } catch {
    // Token hết hạn hoặc sai -> trả 401 để frontend gọi API refresh token
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' })
  }
}

// Chỉ cho phép admin đi tiếp (phải dùng sau verifyToken)
export const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập' })
  }
  next()
}
