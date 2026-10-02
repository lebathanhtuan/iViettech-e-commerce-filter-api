import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import models, { sequelize } from '../models/index.js'
import { isMailConfigured } from '../config/mail.js'
import { sendPasswordResetEmail } from '../utils/mail.js'
import { disconnectUserSockets } from '../socket/index.js'

const { User } = models
const TOKEN_TTL = 15 * 60 * 1000
const RESEND_COOLDOWN = 60 * 1000
const REQUEST_MESSAGE = 'Nếu email thuộc một tài khoản, bạn sẽ nhận được link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư và thư rác.'
const INVALID_LINK_MESSAGE = 'Link đặt lại mật khẩu không hợp lệ, đã hết hạn hoặc đã được sử dụng.'
const hashToken = (token) => createHash('sha256').update(token).digest('hex')
const validTokenFormat = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
const invalidLink = (res) => res.status(400).json({ code: 'INVALID_RESET_LINK', message: INVALID_LINK_MESSAGE })

export async function forgotPassword(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Email không đúng định dạng' })
  }
  let clientUrl
  try { clientUrl = new URL(process.env.CLIENT_URL) } catch { /* thiếu cấu hình */ }
  if (!isMailConfigured || !clientUrl || !['http:', 'https:'].includes(clientUrl.protocol)) {
    return res.status(503).json({ message: 'Chức năng gửi email chưa sẵn sàng. Vui lòng thử lại sau.' })
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const user = await sequelize.transaction(async (transaction) => {
    // So khớp email không phân biệt hoa/thường, không thay đổi email đang lưu của user.
    const current = await User.findOne({ where: sequelize.where(
      sequelize.fn('lower', sequelize.col('email')), email.toLowerCase()),
    transaction, lock: transaction.LOCK.UPDATE })
    if (!current) return null
    const now = Date.now()
    if (current.reset_password_requested_at && now - current.reset_password_requested_at.getTime() < RESEND_COOLDOWN) return null
    await current.update({ reset_password_token_hash: tokenHash,
      reset_password_expires_at: new Date(now + TOKEN_TTL), reset_password_requested_at: new Date(now) }, { transaction })
    return current
  })

  if (user) {
    // Không chờ SMTP để thời gian trả response không làm lộ email có tài khoản hay không.
    // Khác email đơn hàng: SMTP lỗi thì xóa token đúng lần gửi đó, cho phép yêu cầu lại.
    sendPasswordResetEmail(user, token).catch(async (error) => {
      console.error('Gửi email reset mật khẩu thất bại:', error.code || 'SMTP_ERROR')
      try {
        await User.update({ reset_password_token_hash: null, reset_password_expires_at: null, reset_password_requested_at: null },
          { where: { id: user.id, reset_password_token_hash: tokenHash } })
      } catch { console.error('Không thể hủy token reset sau lỗi SMTP') }
    })
  }
  res.json({ message: REQUEST_MESSAGE, resendAfter: 60 })
}

export async function validateResetPasswordLink(req, res) {
  res.set('Cache-Control', 'no-store')
  if (!validTokenFormat(req.body?.token)) return invalidLink(res)
  const user = await User.findOne({ where: {
    reset_password_token_hash: hashToken(req.body.token), reset_password_expires_at: { [Op.gt]: new Date() },
  } })
  if (!user) return invalidLink(res)
  res.json({ valid: true }) // Chỉ kiểm tra, không tiêu thụ token khi mở link/email preview.
}

export async function resetPassword(req, res) {
  res.set('Cache-Control', 'no-store')
  if (!validTokenFormat(req.body?.token)) return invalidLink(res)
  const { newPassword, confirmPassword } = req.body
  if (typeof newPassword !== 'string' || newPassword.length < 8 || !/\S/.test(newPassword) || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte UTF-8' })
  }
  if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp' })
  const userId = await sequelize.transaction(async (transaction) => {
    // Khóa user + tiêu thụ token cùng transaction: hai request đồng thời chỉ một thành công.
    const user = await User.findOne({ where: { reset_password_token_hash: hashToken(req.body.token),
      reset_password_expires_at: { [Op.gt]: new Date() } }, transaction, lock: transaction.LOCK.UPDATE })
    if (!user) return null
    const password = await bcrypt.hash(newPassword, 10)
    await user.update({ password, reset_password_token_hash: null, reset_password_expires_at: null,
      reset_password_requested_at: null, refresh_token: null, auth_version: user.auth_version + 1 }, { transaction })
    return user.id
  })
  if (!userId) return invalidLink(res)
  disconnectUserSockets(userId)
  res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' })
}
