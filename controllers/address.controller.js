import models, { sequelize } from '../models/index.js'
import { Op } from 'sequelize'
import { formatAddress } from '../utils/format.js'
import { httpError, validateShippingAddress } from '../utils/locations.js'

const { Address, User } = models

const toDatabase = (data) => ({
  label: data.label,
  full_name: data.fullName,
  phone: data.phone,
  province_code: data.provinceCode,
  province_name: data.provinceName,
  ward_code: data.wardCode,
  ward_name: data.wardName,
  address_line: data.addressLine,
})

function addressId(value) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'Mã địa chỉ không hợp lệ')
  return id
}

// Khóa dòng user để các lần thêm/đổi mặc định/xóa chạy tuần tự trong cùng tài khoản.
async function lockUser(userId, transaction) {
  const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE })
  if (!user) throw httpError(404, 'Không tìm thấy user')
}

async function findOwnedAddress(id, userId, transaction) {
  const address = await Address.findOne({ where: { id: addressId(id), user_id: userId }, transaction })
  if (!address) throw httpError(404, 'Không tìm thấy địa chỉ')
  return address
}

async function clearDefault(userId, transaction, exceptId) {
  const where = { user_id: userId, is_default: true }
  if (exceptId) where.id = { [Op.ne]: exceptId }
  await Address.update({ is_default: false }, { where, transaction })
}

export async function getAddresses(req, res) {
  const addresses = await Address.findAll({
    where: { user_id: req.user.id },
    order: [['is_default', 'DESC'], ['id', 'ASC']],
  })
  res.json(addresses.map(formatAddress))
}

export async function createAddress(req, res) {
  const data = await validateShippingAddress(req.body)
  const address = await sequelize.transaction(async (transaction) => {
    await lockUser(req.user.id, transaction)
    const count = await Address.count({ where: { user_id: req.user.id }, transaction })
    const isDefault = count === 0 || req.body.isDefault === true
    if (isDefault) await clearDefault(req.user.id, transaction)
    return Address.create({ ...toDatabase(data), user_id: req.user.id, is_default: isDefault }, { transaction })
  })
  res.status(201).json(formatAddress(address))
}

export async function updateAddress(req, res) {
  // Kiểm tra quyền sở hữu trước khi gọi dịch vụ địa danh.
  await findOwnedAddress(req.params.id, req.user.id)
  const data = await validateShippingAddress(req.body)
  const address = await sequelize.transaction(async (transaction) => {
    await lockUser(req.user.id, transaction)
    const current = await findOwnedAddress(req.params.id, req.user.id, transaction)
    // Địa chỉ đang mặc định vẫn giữ mặc định; đổi mặc định bằng cách chọn địa chỉ khác.
    const isDefault = current.is_default || req.body.isDefault === true
    if (isDefault) await clearDefault(req.user.id, transaction, current.id)
    return current.update({ ...toDatabase(data), is_default: isDefault }, { transaction })
  })
  res.json(formatAddress(address))
}

export async function setDefaultAddress(req, res) {
  const address = await sequelize.transaction(async (transaction) => {
    await lockUser(req.user.id, transaction)
    const current = await findOwnedAddress(req.params.id, req.user.id, transaction)
    await clearDefault(req.user.id, transaction, current.id)
    return current.update({ is_default: true }, { transaction })
  })
  res.json(formatAddress(address))
}

export async function deleteAddress(req, res) {
  await sequelize.transaction(async (transaction) => {
    await lockUser(req.user.id, transaction)
    const current = await findOwnedAddress(req.params.id, req.user.id, transaction)
    await current.destroy({ transaction })
    if (current.is_default) {
      const replacement = await Address.findOne({
        where: { user_id: req.user.id }, order: [['id', 'ASC']], transaction,
      })
      if (replacement) await replacement.update({ is_default: true }, { transaction })
    }
  })
  res.json({ message: 'Xóa địa chỉ thành công' })
}
