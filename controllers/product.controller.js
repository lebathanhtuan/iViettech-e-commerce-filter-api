import { Op } from 'sequelize'

import models from '../models/index.js'

const { Product, Category } = models

// Chuyển dữ liệu sản phẩm về đúng dạng mà frontend cần
function formatProduct(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image: product.image,
    description: product.description,
    categoryId: product.category_id,
    categoryName: product.category?.name,
  }
}

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

  return {
    data: rows.map(formatProduct),
    total: count,
  }
}

// ===== API dành cho USER (không cần đăng nhập) =====

// GET /products - danh sách sản phẩm cho trang user (mặc định 8 sản phẩm / trang)
export async function getProducts(req, res) {
  try {
    const result = await findProducts(req.query, 8)

    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// GET /products/:id - chi tiết 1 sản phẩm
export async function getProductDetail(req, res) {
  try {
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
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// ===== API dành cho ADMIN (cần token + role admin) =====

// GET /admin/products - danh sách sản phẩm cho trang admin (mặc định 10 sản phẩm / trang)
export async function getAdminProducts(req, res) {
  try {
    const result = await findProducts(req.query, 10)

    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// POST /admin/products - tạo mới sản phẩm, body: { name, price, categoryId, image, description }
export async function createProduct(req, res) {
  try {
    const { name, price, categoryId, image, description } = req.body

    const newProduct = await Product.create({
      name: name,
      price: price,
      category_id: categoryId,
      image: image,
      description: description,
    })

    res.status(201).json(formatProduct(newProduct))
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// PATCH /admin/products/:id - cập nhật sản phẩm, body: { name, price, categoryId, image, description }
export async function updateProduct(req, res) {
  try {
    const { id } = req.params
    const { name, price, categoryId, image, description } = req.body

    const product = await Product.findByPk(id)
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
    }

    const result = await product.update({
      name: name,
      price: price,
      category_id: categoryId,
      image: image,
      description: description,
    })

    res.status(200).json(formatProduct(result))
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}

// DELETE /admin/products/:id - xóa sản phẩm
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params

    const result = await Product.destroy({
      where: { id: id },
    })

    if (result === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa' })
    }

    res.status(200).json({ message: 'Xóa sản phẩm thành công' })
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lỗi server' })
  }
}
