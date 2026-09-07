import models from '../models/index.js'

const { Category } = models

// GET /categories - lấy danh sách category
// Không cần try/catch: lỗi sẽ tự được chuyển sang errorHandler trong app.js
export async function getAllCategories(req, res) {
  const result = await Category.findAll({
    order: [['id', 'ASC']],
  })

  res.status(200).json(result)
}
