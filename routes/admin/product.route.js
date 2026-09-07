import express from 'express'
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../controllers/product.controller.js'
import { verifyToken, checkAdmin } from '../../middlewares/auth.middleware.js'

const router = express.Router()

// Tất cả API trong file này đều phải đăng nhập và có role admin
router.use(verifyToken, checkAdmin)

router.get('/', getAdminProducts)
router.post('/', createProduct)
router.patch('/:id', updateProduct)
router.delete('/:id', deleteProduct)

export default router
