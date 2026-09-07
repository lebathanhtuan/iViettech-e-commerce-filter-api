import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import models from '../models/index.js'

const { User } = models

// Tạo access token (sống ngắn) - dùng để gọi các API cần đăng nhập
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
  )
}

// Tạo refresh token (sống dài) - chỉ dùng để xin access token mới
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  })
}

// Chuyển dữ liệu user về dạng trả cho frontend (không có password, refresh_token)
function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

// POST /register - đăng ký tài khoản, body: { fullName, email, password }
export async function register(req, res) {
  try {
    const { fullName, email, password } = req.body

    // Không cho đăng ký trùng email
    const existUser = await User.findOne({ where: { email: email } })
    if (existUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' })
    }

    // Mã hóa mật khẩu trước khi lưu vào database
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await User.create({
      name: fullName,
      email: email,
      password: hashedPassword,
      role: 'user', // Tài khoản đăng ký luôn là user, admin được set trực tiếp trong DB
    })

    res.status(201).json(formatUser(newUser))
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// POST /login - đăng nhập, body: { email, password }
export async function login(req, res) {
  try {
    const { email, password } = req.body

    const matchUser = await User.findOne({ where: { email: email } })
    if (!matchUser) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' })
    }

    // So sánh mật khẩu người dùng nhập với mật khẩu đã mã hóa trong database
    const isMatchPassword = await bcrypt.compare(password, matchUser.password)
    if (!isMatchPassword) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' })
    }

    const accessToken = generateAccessToken(matchUser)
    const refreshToken = generateRefreshToken(matchUser)

    // Lưu refresh token vào DB để sau này kiểm tra khi cấp lại access token
    await matchUser.update({ refresh_token: refreshToken })

    res.status(200).json({
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: formatUser(matchUser),
    })
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// POST /refresh-token - cấp lại access token, body: { refreshToken }
export async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(401).json({ message: 'Không có refresh token' })
    }

    // Kiểm tra refresh token còn hạn và đúng chữ ký không
    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch (error) {
      return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' })
    }

    // Refresh token phải trùng với token đang lưu trong DB (đã logout thì không dùng được nữa)
    const matchUser = await User.findByPk(decoded.id)
    if (!matchUser || matchUser.refresh_token !== refreshToken) {
      return res.status(401).json({ message: 'Refresh token không hợp lệ' })
    }

    const newAccessToken = generateAccessToken(matchUser)

    res.status(200).json({ accessToken: newAccessToken })
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// POST /logout - đăng xuất (cần token): xóa refresh token trong DB
export async function logout(req, res) {
  try {
    await User.update({ refresh_token: null }, { where: { id: req.user.id } })

    res.status(200).json({ message: 'Đăng xuất thành công' })
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// GET /profile - lấy thông tin user đang đăng nhập (cần token)
export async function getMyProfile(req, res) {
  try {
    const result = await User.findByPk(req.user.id)
    if (!result) {
      return res.status(404).json({ message: 'Không tìm thấy user' })
    }

    res.status(200).json(formatUser(result))
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}
