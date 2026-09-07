import 'dotenv/config' // Nạp biến môi trường từ file .env (phải import đầu tiên)
import express from 'express'
import cors from 'cors'

import authRoute from './routes/auth.route.js'
import categoryRoute from './routes/category.route.js'
import productRoute from './routes/product.route.js'
import adminProductRoute from './routes/admin/product.route.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/', authRoute) // POST /register, /login, /refresh-token, /logout - GET /profile
app.use('/categories', categoryRoute) // GET /categories
app.use('/products', productRoute) // GET /products, GET /products/:id (dành cho user)
app.use('/admin/products', adminProductRoute) // CRUD /admin/products (dành cho admin, cần token)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`)
})
