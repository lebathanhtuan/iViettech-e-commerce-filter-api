import multer from 'multer'

// Middleware xử lý lỗi chung, phải đặt SAU tất cả routes trong app.js
//
// Express nhận ra đây là middleware xử lý lỗi vì hàm có 4 tham số (error đứng đầu).
// Express 5 tự bắt lỗi của các controller async rồi chuyển vào đây,
// nên trong controller không cần viết try/catch nữa.
export function errorHandler(error, req, res, next) {
  // 1. Lỗi do Multer tạo ra (file quá lớn, upload quá nhiều file...)
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File vượt quá giới hạn 5 MB' })
    }
    return res.status(400).json({ message: error.message })
  }

  // 2. Lỗi mình chủ động tạo ra và có gắn sẵn error.status
  //    (vd: fileFilter báo sai loại file) -> trả đúng message cho frontend
  if (error.status) {
    return res.status(error.status).json({ message: error.message })
  }

  // 3. Còn lại là lỗi ngoài dự tính (lỗi database, lỗi code...)
  //    -> log ra terminal cho dev xem, frontend chỉ nhận message chung
  console.error(error)
  res.status(500).json({ message: 'Lỗi server' })
}
