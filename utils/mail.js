import models from '../models/index.js'
import transporter, { isMailConfigured } from '../config/mail.js'

const { Order, OrderItem, Product, User } = models

// Tên, địa chỉ... do user nhập -> phải escape trước khi ghép vào HTML,
// tránh user nhập "<script>" hay thẻ HTML làm hỏng nội dung email
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const formatPrice = (price) => `${Number(price).toLocaleString('vi-VN')} đ`

// Email client (Gmail, Outlook...) chỉ hỗ trợ CSS viết inline -> dùng style="..." trên từng thẻ
function buildOrderEmailHtml(order) {
  const orderDate = order.createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  const orderUrl = `${process.env.CLIENT_URL}/checkout/success/${order.code}`

  const itemRows = order.order_items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.product?.name || 'Sản phẩm đã bị xóa')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
        </tr>`
    )
    .join('')

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #1677ff;">MyShop - Đặt hàng thành công</h2>
      <p>Xin chào <strong>${escapeHtml(order.user.name)}</strong>,</p>
      <p>Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đã được ghi nhận:</p>

      <p>
        Mã đơn hàng: <strong>${order.code}</strong><br />
        Ngày đặt: ${orderDate}
      </p>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; text-align: left;">Sản phẩm</th>
            <th style="padding: 8px;">SL</th>
            <th style="padding: 8px; text-align: right;">Đơn giá</th>
            <th style="padding: 8px; text-align: right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <p style="text-align: right; font-size: 18px;">
        Tổng tiền: <strong style="color: #ff4d4f;">${formatPrice(order.total_price)}</strong>
      </p>

      <h3>Thông tin giao hàng</h3>
      <p>
        Người nhận: ${escapeHtml(order.full_name)}<br />
        Số điện thoại: ${escapeHtml(order.phone)}<br />
        Địa chỉ: ${escapeHtml(order.address)}
      </p>

      <p>
        <a href="${orderUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1677ff; color: #fff; text-decoration: none; border-radius: 4px;">
          Xem đơn hàng
        </a>
      </p>
    </div>`
}

// Gửi email xác nhận đơn hàng cho chủ tài khoản đã đặt đơn
// Hàm tự bắt lỗi bên trong (chỉ log ra terminal), vì gửi mail lỗi không được làm hỏng việc đặt hàng
export async function sendOrderConfirmationEmail(orderId) {
  if (!isMailConfigured) {
    console.warn('Chưa cấu hình MAIL_* trong .env -> bỏ qua gửi email đơn hàng')
    return
  }

  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user' },
        {
          model: OrderItem,
          as: 'order_items',
          include: [{ model: Product, as: 'product', paranoid: false }],
        },
      ],
      order: [[{ model: OrderItem, as: 'order_items' }, 'id', 'ASC']],
    })

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: order.user.email,
      subject: `[MyShop] Xác nhận đơn hàng #${order.code}`,
      html: buildOrderEmailHtml(order),
    })

    console.log(`Đã gửi email đơn hàng ${order.code} tới ${order.user.email}`)
  } catch (error) {
    console.error('Gửi email đơn hàng thất bại:', error)
  }
}

// Reset password phải báo lỗi cho caller để hủy token nếu SMTP không nhận thư.
// URL lấy từ CLIENT_URL tin cậy; token trong fragment không bị gửi vào log HTTP frontend.
export async function sendPasswordResetEmail(user, token) {
  const resetUrl = new URL('/reset-password', process.env.CLIENT_URL)
  resetUrl.hash = new URLSearchParams({ token }).toString()
  const link = resetUrl.toString()
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: user.email,
    subject: '[MyShop] Đặt lại mật khẩu',
    text: `Xin chào ${user.name},\nĐặt lại mật khẩu tại: ${link}\nLink có hiệu lực 15 phút và chỉ dùng một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333">
      <h2 style="color:#1677ff">MyShop - Đặt lại mật khẩu</h2>
      <p>Xin chào <strong>${escapeHtml(user.name)}</strong>,</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu. Link có hiệu lực <strong>15 phút</strong> và chỉ dùng một lần.</p>
      <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#1677ff;color:#fff;text-decoration:none;border-radius:4px">Đặt lại mật khẩu</a></p>
      <p>Nếu nút không mở được, copy link sau vào trình duyệt:</p>
      <p style="word-break:break-all">${escapeHtml(link)}</p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu của bạn vẫn giữ nguyên.</p>
    </div>`,
    disableFileAccess: true,
    disableUrlAccess: true,
  })
  if (!info.accepted?.length) throw new Error('SMTP_REJECTED')
}
