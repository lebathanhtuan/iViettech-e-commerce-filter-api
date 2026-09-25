import express from 'express'
import {
  getFavorites,
  addFavorite,
  deleteFavorite,
} from '../controllers/favorite.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', getFavorites)
router.post('/', addFavorite)
router.delete('/:productId', deleteFavorite)

export default router
