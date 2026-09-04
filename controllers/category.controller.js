import models from '../models/index.js'

const { Category } = models

// GET /categories - lấy danh sách category
export async function getAllCategories(req, res) {
  try {
    const result = await Category.findAll({
      order: [['id', 'ASC']],
    })

    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}
