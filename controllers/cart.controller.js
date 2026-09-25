import models from '../models/index.js'
import { formatProduct } from '../utils/format.js'

const { CartItem, Product } = models

// Tất cả API giỏ hàng đều cần đăng nhập -> req.user.id là user đang đăng nhập

function formatCartItem(item) {
  return {
    id: item.id,
    quantity: item.quantity,
    product: formatProduct(item.product),
  }
}

// GET /cart - lấy giỏ hàng của user đang đăng nhập
export async function getCart(req, res) {
  const cartItems = await CartItem.findAll({
    where: { user_id: req.user.id },
    // Product có paranoid: true nên sản phẩm đã bị xóa mềm sẽ không được join.
    // required: true (INNER JOIN) -> ẩn luôn dòng giỏ hàng của sản phẩm đã bị xóa
    include: [{ model: Product, as: 'product', required: true }],
    order: [['id', 'ASC']],
  })

  res.status(200).json(cartItems.map(formatCartItem))
}

// POST /cart - thêm sản phẩm vào giỏ, body: { productId, quantity }
export async function addToCart(req, res) {
  const { productId } = req.body
  const quantity = parseInt(req.body.quantity) || 1

  const product = await Product.findByPk(productId)
  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
  }

  // Sản phẩm đã có trong giỏ -> cộng dồn quantity, chưa có -> thêm dòng mới
  const existItem = await CartItem.findOne({
    where: { user_id: req.user.id, product_id: productId },
  })

  if (existItem) {
    await existItem.update({ quantity: existItem.quantity + quantity })
    return res.status(200).json({ message: 'Đã cập nhật số lượng trong giỏ hàng' })
  }

  await CartItem.create({
    user_id: req.user.id,
    product_id: productId,
    quantity: quantity,
  })

  res.status(201).json({ message: 'Đã thêm vào giỏ hàng' })
}

// PATCH /cart/:id - đổi số lượng 1 sản phẩm trong giỏ, body: { quantity }
export async function updateCartItem(req, res) {
  const { id } = req.params
  const quantity = parseInt(req.body.quantity)

  if (!quantity || quantity < 1) {
    return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' })
  }

  // Thêm điều kiện user_id để user không sửa được giỏ hàng của người khác
  const cartItem = await CartItem.findOne({ where: { id: id, user_id: req.user.id } })
  if (!cartItem) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ hàng' })
  }

  await cartItem.update({ quantity: quantity })

  res.status(200).json({ message: 'Cập nhật giỏ hàng thành công' })
}

// DELETE /cart/:id - xóa 1 sản phẩm khỏi giỏ
export async function deleteCartItem(req, res) {
  const { id } = req.params

  // force: true -> xóa cứng (xóa hẳn dòng trong DB) dù model có paranoid: true,
  // vì giỏ hàng không cần giữ lại lịch sử như sản phẩm hay đơn hàng
  const result = await CartItem.destroy({ where: { id: id, user_id: req.user.id }, force: true })
  if (result === 0) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ hàng' })
  }

  res.status(200).json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng' })
}
