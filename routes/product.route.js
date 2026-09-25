import express from 'express'
import { getProducts, getProductDetail } from '../controllers/product.controller.js'
import { getReviews, createReview } from '../controllers/review.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

const router = express.Router()

// API cho user, không cần đăng nhập
router.get('/', getProducts)
router.get('/:id', getProductDetail)
router.get('/:id/reviews', getReviews)

// Viết đánh giá thì phải đăng nhập
router.post('/:id/reviews', verifyToken, createReview)

export default router
