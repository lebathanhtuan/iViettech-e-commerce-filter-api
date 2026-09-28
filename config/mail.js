import nodemailer from 'nodemailer'

// Thông tin SMTP đọc từ file .env (xem docs/order-email-nodemailer.md)
// Chưa điền MAIL_USER / MAIL_PASSWORD -> coi như chưa cấu hình, server vẫn chạy bình thường nhưng không gửi mail
export const isMailConfigured = Boolean(
  process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASSWORD
)

// Transporter: "người đưa thư", giữ thông tin kết nối tới SMTP server để gửi mail
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === 'true', // true với port 465, false với port 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
})

export default transporter
