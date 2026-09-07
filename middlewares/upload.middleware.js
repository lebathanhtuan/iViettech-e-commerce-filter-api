import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'

// 1. Thư mục lưu file: <project>/uploads (tạo nếu chưa có)
const uploadDir = path.resolve('uploads')
fs.mkdirSync(uploadDir, { recursive: true })

// 2. Cấu hình diskStorage: lưu file ở đâu, đặt tên file thế nào
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  // Không giữ tên gốc vì có thể trùng -> tạo tên duy nhất: image-<uuid>.jpg
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase()
    cb(null, `${file.fieldname}-${randomUUID()}${extension}`)
  },
})

// 3. Chỉ cho phép upload ảnh
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']

// 4. Tạo middleware upload
const upload = multer({
  storage: storage,
  // Tối đa 5 MB / file
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype)
    const isValidExtension = allowedExtensions.includes(extension)

    if (isValidMimeType && isValidExtension) {
      return cb(null, true)
    }

    // Gắn status để middleware xử lý lỗi biết đây là lỗi chủ động (trả 400 kèm message)
    const error = new Error('Chỉ cho phép upload file JPG, PNG hoặc WEBP')
    error.status = 400
    cb(error)
  },
})

// Cách dùng: upload.single('image') -> req.file
//            upload.array('images', 5) -> req.files
export default upload
