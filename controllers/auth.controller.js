import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import models from '../models/index.js'

const { User } = models

// Chuỗi bí mật dùng để tạo token
const JWT_SECRET = 'e-commerce-filter-secret'

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
    })

    // Không trả password về cho frontend
    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    })
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

    // Tạo token để frontend lưu lại
    const token = jwt.sign({ id: matchUser.id, email: matchUser.email }, JWT_SECRET, {
      expiresIn: '7d',
    })

    res.status(200).json({
      token: token,
      user: {
        id: matchUser.id,
        name: matchUser.name,
        email: matchUser.email,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}
