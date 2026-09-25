import express from 'express'
import {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
} from '../controllers/cart.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Tất cả API giỏ hàng đều cần đăng nhập
router.use(verifyToken)

router.get('/', getCart)
router.post('/', addToCart)
router.patch('/:id', updateCartItem)
router.delete('/:id', deleteCartItem)

export default router
