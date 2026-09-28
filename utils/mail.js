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
