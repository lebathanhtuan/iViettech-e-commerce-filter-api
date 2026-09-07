import 'dotenv/config' // Nạp biến môi trường từ file .env (phải import đầu tiên)
import path from 'node:path'
import express from 'express'
import cors from 'cors'

import authRoute from './routes/auth.route.js'
import categoryRoute from './routes/category.route.js'
import productRoute from './routes/product.route.js'
import adminProductRoute from './routes/admin/product.route.js'
import { errorHandler } from './middlewares/error.middleware.js'

const app = express()

app.use(cors())
app.use(express.json())

// Cho phép truy cập file đã upload: http://localhost:3000/uploads/<filename>
app.use('/uploads', express.static(path.resolve('uploads')))

app.use('/', authRoute) // POST /register, /login, /refresh-token, /logout - GET /profile
app.use('/categories', categoryRoute) // GET /categories
app.use('/products', productRoute) // GET /products, GET /products/:id (dành cho user)
app.use('/admin/products', adminProductRoute) // CRUD /admin/products (dành cho admin, cần token)

// Middleware xử lý lỗi phải nằm sau routes
app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`)
})
