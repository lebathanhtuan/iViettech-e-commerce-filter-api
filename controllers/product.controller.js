import { Op } from 'sequelize'

import models from '../models/index.js'
import { formatProduct } from '../utils/format.js'

const { Product, Category } = models

// Các controller dưới đây không cần try/catch:
// Express 5 tự chuyển lỗi sang errorHandler (middlewares/error.middleware.js)

// Hàm dùng chung: lấy danh sách sản phẩm có search / filter / sort / phân trang
// Query params: keyword, categoryId, sort, page, limit
async function findProducts(query, defaultLimit) {
  const { keyword, categoryId, sort } = query
  const page = parseInt(query.page) || 1
  const limit = parseInt(query.limit) || defaultLimit

  // Điều kiện lọc
  const where = {}
  if (keyword) {
    // iLike: tìm gần đúng, không phân biệt hoa thường
    where.name = { [Op.iLike]: `%${keyword}%` }
  }
  if (categoryId) {
    where.category_id = categoryId
  }

  // Sắp xếp: sort có dạng "name_asc" | "name_desc" | "price_asc" | "price_desc"
  let order = [['id', 'ASC']]
  if (sort) {
    const [field, direction] = sort.split('_')
    order = [[field, direction]]
  }

  // findAndCountAll: vừa lấy danh sách theo trang, vừa đếm tổng số sản phẩm
  const { rows, count } = await Product.findAndCountAll({
    where: where,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
    order: order,
    offset: (page - 1) * limit,
    limit: limit,
  })

  // Trả về 2 phần: data là danh sách sản phẩm, meta là thông tin phân trang
  return {
    data: rows.map(formatProduct),
    meta: {
      page: page,
      limit: limit,
      total: count, // tổng số sản phẩm khớp điều kiện lọc
      totalPages: Math.ceil(count / limit), // tổng số trang
    },
  }
}

// ===== API dành cho USER (không cần đăng nhập) =====

// GET /products - danh sách sản phẩm cho trang user (mặc định 8 sản phẩm / trang)
export async function getProducts(req, res) {
  const result = await findProducts(req.query, 8)

  res.status(200).json(result)
}

// GET /products/:id - chi tiết 1 sản phẩm
export async function getProductDetail(req, res) {
  const { id } = req.params

  const result = await Product.findByPk(id, {
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
  })

  if (!result) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
  }

  res.status(200).json(formatProduct(result))
}

// ===== API dành cho ADMIN (cần token + role admin) =====

// GET /admin/products - danh sách sản phẩm cho trang admin (mặc định 10 sản phẩm / trang)
export async function getAdminProducts(req, res) {
  const result = await findProducts(req.query, 10)

  res.status(200).json(result)
}

// POST /admin/products - tạo mới sản phẩm
// Body dạng multipart/form-data: { name, price, categoryId, description, image (file) }
// description là chuỗi HTML do Quill editor ở trang admin tạo ra
export async function createProduct(req, res) {
  const { name, price, categoryId, description } = req.body

  // req.file do upload.single('image') tạo ra. Chỉ lưu đường dẫn tương đối, không lưu req.file.path
  const image = req.file ? `/uploads/${req.file.filename}` : null

  const newProduct = await Product.create({
    name: name,
    price: price,
    category_id: categoryId,
    image: image,
    description: description,
  })

  res.status(201).json(formatProduct(newProduct))
}

// PATCH /admin/products/:id - cập nhật sản phẩm
// Body dạng multipart/form-data: { name, price, categoryId, description, image (file, không bắt buộc) }
export async function updateProduct(req, res) {
  const { id } = req.params
  const { name, price, categoryId, description } = req.body

  const product = await Product.findByPk(id)
  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
  }

  const updateData = {
    name: name,
    price: price,
    category_id: categoryId,
    description: description,
  }

  // Có gửi file mới thì mới đổi ảnh, không thì giữ ảnh cũ
  if (req.file) {
    updateData.image = `/uploads/${req.file.filename}`
  }

  const result = await product.update(updateData)

  res.status(200).json(formatProduct(result))
}

// DELETE /admin/products/:id - xóa sản phẩm
// Model có paranoid: true nên destroy() là xóa mềm: chỉ ghi thời gian vào deleted_at,
// các API findAll / findByPk sau đó tự bỏ qua sản phẩm này (đơn hàng cũ vẫn giữ được thông tin)
export async function deleteProduct(req, res) {
  const { id } = req.params

  const result = await Product.destroy({
    where: { id: id },
  })

  if (result === 0) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa' })
  }

  res.status(200).json({ message: 'Xóa sản phẩm thành công' })
}
