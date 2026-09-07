import express from 'express'
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../controllers/product.controller.js'
import { verifyToken, checkAdmin } from '../../middlewares/auth.middleware.js'
import upload from '../../middlewares/upload.middleware.js'

const router = express.Router()

// Tất cả API trong file này đều phải đăng nhập và có role admin
router.use(verifyToken, checkAdmin)

router.get('/', getAdminProducts)

// Body gửi dạng multipart/form-data, field ảnh tên là "image"
// Sau upload.single('image'): file nằm trong req.file, các field text nằm trong req.body
router.post('/', upload.single('image'), createProduct)
router.patch('/:id', upload.single('image'), updateProduct)

router.delete('/:id', deleteProduct)

export default router
