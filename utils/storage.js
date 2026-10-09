import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

let supabase

// Tạo client lần đầu dùng tới (thiếu biến môi trường thì chỉ lỗi lúc upload, server vẫn chạy)
function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    const error = new Error('Chưa cấu hình SUPABASE_URL / SUPABASE_SECRET_KEY')
    error.status = 500
    throw error
  }

  supabase ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  })
  return supabase
}

// Upload file (từ multer.memoryStorage) lên Supabase Storage, trả về URL public đầy đủ
// Không giữ tên gốc vì có thể trùng -> tạo tên duy nhất: image/image-<uuid>.jpg
// Ví dụ: https://<ref>.supabase.co/storage/v1/object/public/uploads/image/image-<uuid>.jpg
export async function uploadImage(file) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads'
  const extension = path.extname(file.originalname).toLowerCase()
  const filePath = `${file.fieldname}/${file.fieldname}-${randomUUID()}${extension}`

  const storage = getSupabase().storage.from(bucket)
  const { error } = await storage.upload(filePath, file.buffer, {
    contentType: file.mimetype,
  })
  if (error) {
    throw error
  }

  return storage.getPublicUrl(filePath).data.publicUrl
}
