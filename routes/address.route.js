import express from 'express'
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../controllers/address.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

const router = express.Router()
router.use(verifyToken)
router.get('/', getAddresses)
router.post('/', createAddress)
router.patch('/:id/default', setDefaultAddress)
router.patch('/:id', updateAddress)
router.delete('/:id', deleteAddress)
export default router
