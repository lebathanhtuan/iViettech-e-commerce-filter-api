// API v2: đơn vị hành chính sau sáp nhập 07/2025, chỉ còn tỉnh/thành -> phường/xã.
// Tài liệu: https://provinces.open-api.vn/api/v2/docs
const API_URL = process.env.VIETNAM_PROVINCES_API_URL || 'https://provinces.open-api.vn/api/v2'
const CACHE_TTL = 24 * 60 * 60 * 1000
const cache = new Map()
const pendingRequests = new Map()

export function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// Cache 24 giờ và gộp các request cùng URL. Nếu nguồn tạm lỗi, dùng cache đã có.
async function fetchLocations(path) {
  const cached = cache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.data
  if (pendingRequests.has(path)) return pendingRequests.get(path)

  const request = (async () => {
    try {
      const response = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error(`Province API: ${response.status}`)
      const data = await response.json()
      if (path === '/p/' ? !Array.isArray(data) || data.length === 0 : !Array.isArray(data.wards)) {
        throw new Error('Province API trả dữ liệu không hợp lệ')
      }
      cache.set(path, { data, expiresAt: Date.now() + CACHE_TTL })
      return data
    } catch {
      if (cached) return cached.data
      throw httpError(503, 'Chưa tải được tỉnh/thành, phường/xã. Vui lòng thử lại sau.')
    } finally {
      pendingRequests.delete(path)
    }
  })()
  pendingRequests.set(path, request)
  return request
}

export async function getProvinces() {
  const provinces = await fetchLocations('/p/')
  return provinces.map(({ code, name }) => ({ code, name }))
}

export async function getWards(provinceCode) {
  const code = Number(provinceCode)
  const provinces = await getProvinces()
  if (!Number.isInteger(code) || !provinces.some((province) => province.code === code)) {
    throw httpError(400, 'Tỉnh/thành không hợp lệ')
  }
  const province = await fetchLocations(`/p/${code}?depth=2`)
  return province.wards.map(({ code: wardCode, name }) => ({ code: wardCode, name }))
}

// Lấy tên từ nguồn đã kiểm tra, không tin tên tỉnh/phường frontend gửi lên.
export async function validateShippingAddress(data) {
  if (!data || typeof data !== 'object') throw httpError(400, 'Thông tin địa chỉ không hợp lệ')
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : ''
  const phone = typeof data.phone === 'string' ? data.phone.trim() : ''
  const addressLine = typeof data.addressLine === 'string' ? data.addressLine.trim() : ''
  const label = typeof data.label === 'string' ? data.label.trim() : ''
  if (!fullName || fullName.length > 100) throw httpError(400, 'Họ tên phải có từ 1 đến 100 ký tự')
  if (!/^0\d{9}$/.test(phone)) throw httpError(400, 'Số điện thoại gồm 10 số, bắt đầu bằng 0')
  if (!addressLine || addressLine.length > 160) throw httpError(400, 'Địa chỉ chi tiết phải có từ 1 đến 160 ký tự')
  if (label.length > 100) throw httpError(400, 'Tên gợi nhớ tối đa 100 ký tự')
  if (data.isDefault !== undefined && typeof data.isDefault !== 'boolean') {
    throw httpError(400, 'Trạng thái mặc định không hợp lệ')
  }
  const provinceCode = Number(data.provinceCode)
  const wardCode = Number(data.wardCode)
  const provinces = await getProvinces()
  const province = provinces.find((item) => item.code === provinceCode)
  if (!province) throw httpError(400, 'Tỉnh/thành không hợp lệ')
  const wards = await getWards(provinceCode)
  const ward = wards.find((item) => item.code === wardCode)
  if (!ward) throw httpError(400, 'Phường/xã không thuộc tỉnh/thành đã chọn')
  const fullAddress = `${addressLine}, ${ward.name}, ${province.name}`
  if (fullAddress.length > 255) throw httpError(400, 'Địa chỉ đầy đủ tối đa 255 ký tự')
  return { label, fullName, phone, addressLine, provinceCode, provinceName: province.name,
    wardCode, wardName: ward.name, fullAddress }
}
