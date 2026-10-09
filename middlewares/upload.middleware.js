import path from 'node:path'
import multer from 'multer'

// 1. Vercel không cho ghi file ra ổ đĩa -> giữ file trong RAM (req.file.buffer)
//    rồi controller upload tiếp lên Supabase Storage (utils/storage.js)
const storage = multer.memoryStorage()

// 2. Chỉ cho phép upload ảnh
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']

// 3. Tạo middleware upload
const upload = multer({
  storage: storage,
  // Tối đa 4 MB / file (Vercel giới hạn cả request 4.5 MB)
  limits: {
    fileSize: 4 * 1024 * 1024,
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
