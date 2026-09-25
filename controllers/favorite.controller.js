import models from '../models/index.js'
import { formatProduct } from '../utils/format.js'

const { Favorite, Product } = models

// GET /favorites - danh sách sản phẩm yêu thích của user đang đăng nhập
export async function getFavorites(req, res) {
  const favorites = await Favorite.findAll({
    where: { user_id: req.user.id },
    // required: true -> ẩn sản phẩm đã bị admin xóa (giống giỏ hàng)
    include: [{ model: Product, as: 'product', required: true }],
    order: [['id', 'DESC']],
  })

  // Frontend chỉ cần danh sách sản phẩm
  res.status(200).json(favorites.map((favorite) => formatProduct(favorite.product)))
}

// POST /favorites - thêm sản phẩm vào yêu thích, body: { productId }
export async function addFavorite(req, res) {
  const { productId } = req.body

  const product = await Product.findByPk(productId)
  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
  }

  // findOrCreate: đã có thì thôi, chưa có mới tạo -> không bị trùng
  await Favorite.findOrCreate({
    where: { user_id: req.user.id, product_id: productId },
  })

  res.status(201).json({ message: 'Đã thêm vào yêu thích' })
}

// DELETE /favorites/:productId - bỏ yêu thích
export async function deleteFavorite(req, res) {
  await Favorite.destroy({
    where: { user_id: req.user.id, product_id: req.params.productId },
  })

  res.status(200).json({ message: 'Đã bỏ yêu thích' })
}
