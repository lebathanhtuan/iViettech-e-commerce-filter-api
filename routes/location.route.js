import express from 'express'
import { getProvinces, getWards } from '../utils/locations.js'

const router = express.Router()
router.get('/provinces', async (req, res) => res.json(await getProvinces()))
router.get('/provinces/:code/wards', async (req, res) => res.json(await getWards(req.params.code)))
export default router
