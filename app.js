import express from 'express'
import cors from 'cors'

import authRoute from './routes/auth.route.js'
import categoryRoute from './routes/category.route.js'
import productRoute from './routes/product.route.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/', authRoute) // POST /register, POST /login
app.use('/categories', categoryRoute) // GET /categories
app.use('/products', productRoute) // CRUD /products

// Frontend đang gọi API tại http://localhost:3000
app.listen(3000, () => {
  console.log('Chạy thành công')
})
