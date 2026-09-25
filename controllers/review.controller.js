import models from '../models/index.js'
import { getImageUrl } from '../utils/format.js'

const { Review, User, Product } = models

function formatReview(review) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt, // underscored: true -> cột created_at đọc qua createdAt
    user: {
      id: review.user?.id,
      name: review.user?.name,
      avatar: getImageUrl(review.user?.avatar),
    },
  }
}

// GET /products/:id/reviews - danh sách đánh giá của 1 sản phẩm (không cần đăng nhập)
export async function getReviews(req, res) {
  const reviews = await Review.findAll({
    where: { product_id: req.params.id },
    // Chỉ lấy vài cột cần hiển thị của user, không lấy password
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
    order: [['id', 'DESC']],
  })

  res.status(200).json(reviews.map(formatReview))
}

// POST /products/:id/reviews - viết đánh giá (cần token), body: { rating, comment }
// Mỗi user chỉ được đánh giá 1 lần / 1 sản phẩm
export async function createReview(req, res) {
  const productId = req.params.id
  const rating = parseInt(req.body.rating)
  const { comment } = req.body

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Số sao phải từ 1 đến 5' })
  }

  const product = await Product.findByPk(productId)
  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
  }

  // Mỗi user chỉ được đánh giá 1 sản phẩm 1 lần
  // (DB cũng có unique index (user_id, product_id) để chặn chắc chắn)
  const existReview = await Review.findOne({
    where: { user_id: req.user.id, product_id: productId },
  })
  if (existReview) {
    return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' })
  }

  await Review.create({
    user_id: req.user.id,
    product_id: productId,
    rating: rating,
    comment: comment,
  })

  res.status(201).json({ message: 'Đánh giá thành công' })
}
