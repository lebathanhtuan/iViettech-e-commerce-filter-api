// Các hàm chuyển dữ liệu từ DB về đúng dạng mà frontend cần (dùng chung cho nhiều controller)

// Ảnh upload được lưu trong DB dạng đường dẫn tương đối "/uploads/xxx.jpg"
// -> ghép thêm BASE_URL để frontend hiển thị được: http://localhost:3000/uploads/xxx.jpg
// Ảnh là link ngoài (http...) thì giữ nguyên
export function getImageUrl(image) {
  if (image && image.startsWith('/uploads/')) {
    return `${process.env.BASE_URL}${image}`
    // http://localhost:3000/uploads/xxx.jpg
  }
  return image
}

export function formatProduct(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image: getImageUrl(product.image),
    description: product.description,
    categoryId: Number(product.category_id),
    categoryName: product.category?.name,
  }
}

// Không trả password, refresh_token về cho frontend
export function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: getImageUrl(user.avatar),
  }
}

// Tin nhắn chat: sender_id khác user_id -> tin do admin gửi
export function formatMessage(message) {
  return {
    id: message.id,
    userId: message.user_id,
    senderId: message.sender_id,
    fromAdmin: message.sender_id !== message.user_id,
    content: message.content,
    createdAt: message.createdAt,
  }
}
