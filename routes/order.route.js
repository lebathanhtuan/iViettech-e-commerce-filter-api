import express from 'express'
import { createOrder, getMyOrders, getOrderDetail } from '../controllers/order.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', getMyOrders)
router.get('/:code', getOrderDetail)
router.post('/', createOrder)

export default router
