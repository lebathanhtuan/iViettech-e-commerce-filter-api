import express from 'express'
import { getProducts, getProductDetail } from '../controllers/product.controller.js'

const router = express.Router()

// API cho user, không cần đăng nhập
router.get('/', getProducts)
router.get('/:id', getProductDetail)

export default router
