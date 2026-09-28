import 'dotenv/config' // Nạp biến môi trường từ file .env (phải import đầu tiên)
import http from 'node:http'
import path from 'node:path'
import express from 'express'
import cors from 'cors'

import authRoute from './routes/auth.route.js'
import categoryRoute from './routes/category.route.js'
import productRoute from './routes/product.route.js'
import cartRoute from './routes/cart.route.js'
import orderRoute from './routes/order.route.js'
import favoriteRoute from './routes/favorite.route.js'
import chatRoute from './routes/chat.route.js'
import adminProductRoute from './routes/admin/product.route.js'
import adminChatRoute from './routes/admin/chat.route.js'
import { errorHandler } from './middlewares/error.middleware.js'
import { initSocket } from './socket/index.js'

const app = express()

app.use(cors())
app.use(express.json())

// Cho phép truy cập file đã upload: http://localhost:3000/uploads/<filename>
app.use('/uploads', express.static(path.resolve('uploads')))

app.use('/', authRoute) // POST /register, /login, /refresh-token, /logout - GET, PATCH /profile
app.use('/categories', categoryRoute) // GET /categories
app.use('/products', productRoute) // GET /products, /products/:id, /products/:id/reviews - POST /products/:id/reviews
app.use('/cart', cartRoute) // CRUD giỏ hàng (cần token)
app.use('/orders', orderRoute) // Đặt hàng + lịch sử đơn hàng (cần token)
app.use('/favorites', favoriteRoute) // Sản phẩm yêu thích (cần token)
app.use('/chat', chatRoute) // GET /chat/messages - lịch sử chat của user (cần token)
app.use('/admin/products', adminProductRoute) // CRUD /admin/products (dành cho admin, cần token)
app.use('/admin/chat', adminChatRoute) // Danh sách cuộc trò chuyện + lịch sử chat (dành cho admin)

// Middleware xử lý lỗi phải nằm sau routes
app.use(errorHandler)

const PORT = process.env.PORT || 3000

// Tự tạo HTTP server từ app Express rồi gắn socket.io vào -> API và socket dùng chung 1 port
const server = http.createServer(app)
initSocket(server)

server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`)
})
