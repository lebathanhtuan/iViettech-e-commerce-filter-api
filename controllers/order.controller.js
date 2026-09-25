import { randomInt } from 'node:crypto'

import models, { sequelize } from '../models/index.js'
import { formatProduct } from '../utils/format.js'

const { Order, OrderItem, CartItem, Product } = models

// Sinh mã đơn hàng gồm 8 ký tự chữ in hoa + số, vd: "K7Q2M9XA"
// Không dùng id làm mã đơn vì id tăng dần -> người khác đoán được số lượng đơn của shop
const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CODE_LENGTH = 8

async function generateOrderCode() {
  while (true) {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARACTERS[randomInt(CODE_CHARACTERS.length)]
    }

    // Có 36^8 (~2.800 tỷ) mã nên rất hiếm khi trùng, nhưng vẫn kiểm tra cho chắc.
    // Cột code có UNIQUE trong DB nên dù có trùng cũng không lưu được 2 đơn cùng mã
    const existOrder = await Order.findOne({ where: { code: code } })
    if (!existOrder) {
      return code
    }
  }
}

function formatOrder(order) {
  return {
    id: order.id,
    code: order.code,
    fullName: order.full_name,
    phone: order.phone,
    address: order.address,
    totalPrice: Number(order.total_price),
    // Model có underscored: true -> cột created_at được đọc qua thuộc tính createdAt
    createdAt: order.createdAt,
    items: (order.order_items || []).map((item) => ({
      id: item.id,
      price: Number(item.price),
      quantity: item.quantity,
      // Sản phẩm đã bị xóa hẳn khỏi DB (product_id = NULL) thì product = null
      product: item.product ? formatProduct(item.product) : null,
    })),
  }
}

// Include dùng chung khi lấy đơn hàng: kèm danh sách sản phẩm trong đơn
const orderInclude = [
  {
    model: OrderItem,
    as: 'order_items',
    // paranoid: false -> vẫn lấy sản phẩm đã bị admin xóa mềm, để lịch sử đơn hàng hiển thị đủ
    include: [{ model: Product, as: 'product', paranoid: false }],
  },
]

// POST /orders - đặt hàng từ giỏ hàng hiện tại, body: { fullName, phone, address }
// Kết quả: { id, code, totalPrice }
// Thông tin thanh toán (thẻ) chỉ kiểm tra ở frontend, không gửi lên server
export async function createOrder(req, res) {
  const userId = req.user.id
  const { fullName, phone, address } = req.body

  // required: true -> bỏ qua sản phẩm đã bị xóa (không cho đặt hàng sản phẩm đã xóa)
  const cartItems = await CartItem.findAll({
    where: { user_id: userId },
    include: [{ model: Product, as: 'product', required: true }],
  })

  if (cartItems.length === 0) {
    return res.status(400).json({ message: 'Giỏ hàng đang trống' })
  }

  // Tổng tiền tính ở server theo giá trong DB, không tin giá frontend gửi lên
  const totalPrice = cartItems.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0
  )

  const code = await generateOrderCode()

  // Transaction: 3 bước (tạo order, tạo order_items, xóa giỏ hàng) phải cùng thành công.
  // Nếu 1 bước lỗi thì tất cả được hoàn tác (rollback), không bị mất giỏ hàng mà không có đơn
  const newOrder = await sequelize.transaction(async (transaction) => {
    const order = await Order.create(
      {
        code: code,
        user_id: userId,
        full_name: fullName,
        phone: phone,
        address: address,
        total_price: totalPrice,
      },
      { transaction }
    )

    await OrderItem.bulkCreate(
      cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        price: item.product.price, // lưu lại giá lúc mua
        quantity: item.quantity,
      })),
      { transaction }
    )

    // Xóa cứng giỏ hàng (force: true), giống API xóa sản phẩm khỏi giỏ
    await CartItem.destroy({ where: { user_id: userId }, force: true, transaction })

    return order
  })

  res.status(201).json({
    id: newOrder.id,
    code: newOrder.code,
    totalPrice: Number(newOrder.total_price),
  })
}

// GET /orders - lịch sử đơn hàng của user đang đăng nhập (mới nhất lên đầu)
export async function getMyOrders(req, res) {
  const orders = await Order.findAll({
    where: { user_id: req.user.id },
    include: orderInclude,
    order: [['id', 'DESC']],
  })

  res.status(200).json(orders.map(formatOrder))
}

// GET /orders/:code - chi tiết 1 đơn hàng theo mã đơn (chỉ xem được đơn của chính mình)
export async function getOrderDetail(req, res) {
  const order = await Order.findOne({
    where: { code: req.params.code, user_id: req.user.id },
    include: orderInclude,
  })

  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng' })
  }

  res.status(200).json(formatOrder(order))
}
