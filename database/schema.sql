-- Cấu trúc database đầy đủ của project (tất cả bảng, index, ràng buộc)
-- Thứ tự chạy trên DB trống: schema.sql -> seed.sql
--   npm run db:sync  -> chỉ chạy file này
--   npm run db:seed  -> chạy file này + seed.sql (dữ liệu mẫu)
-- Chạy lại nhiều lần cũng được vì dùng IF NOT EXISTS (bảng/index đã có thì bỏ qua)
--
-- Quy ước chung cho TẤT CẢ các bảng:
--   created_at, updated_at -> model dùng timestamps: true (Sequelize tự ghi thời gian tạo / sửa)
--   deleted_at             -> model dùng paranoid: true (xóa mềm: destroy() chỉ ghi deleted_at, không xóa hẳn dòng)
--
-- Vì xóa mềm vẫn giữ dòng cũ, các ràng buộc "không được trùng" dùng unique index có điều kiện
-- WHERE deleted_at IS NULL: chỉ không được trùng giữa các dòng CHƯA bị xóa
-- (nếu dùng UNIQUE bình thường thì xóa sản phẩm khỏi giỏ xong sẽ không thêm lại được)

-- ===================== Người dùng =====================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- đã mã hóa bằng bcrypt
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' hoặc 'admin'
  refresh_token TEXT,
  phone VARCHAR(20),
  avatar VARCHAR(500),
  -- Quên mật khẩu: chỉ lưu SHA-256 của token, không lưu link/token gốc
  reset_password_token_hash VARCHAR(64),
  reset_password_expires_at TIMESTAMPTZ,
  reset_password_requested_at TIMESTAMPTZ,
  -- Tăng version sau khi reset mật khẩu để access/refresh token cũ mất hiệu lực ngay
  auth_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_reset_password_token_hash_key
  ON users (reset_password_token_hash) WHERE reset_password_token_hash IS NOT NULL;

-- ===================== Danh mục, sản phẩm =====================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  image VARCHAR(500), -- URL ảnh (link ngoài hoặc Supabase Storage)
  description TEXT, -- HTML từ Quill editor ở trang admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ===================== Giỏ hàng =====================
-- Mỗi dòng là 1 sản phẩm trong giỏ của 1 user (thêm trùng thì tăng quantity)
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_id_product_id_key
  ON cart_items (user_id, product_id) WHERE deleted_at IS NULL;

-- ===================== Đơn hàng =====================
-- Lưu thông tin giao hàng + tổng tiền lúc đặt
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE, -- mã đơn hàng hiển thị cho user, vd: "K7Q2M9XA"
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Chi tiết đơn hàng: lưu lại giá tại thời điểm mua (giá sản phẩm sau này có thể đổi)
-- Sản phẩm bị xóa thì product_id = NULL, đơn hàng cũ vẫn còn
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ===================== Đánh giá, yêu thích =====================
-- Bình luận + đánh giá (rating từ 1 đến 5 sao), mỗi user chỉ đánh giá 1 sản phẩm 1 lần
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_id_product_id_key
  ON reviews (user_id, product_id) WHERE deleted_at IS NULL;

-- Sản phẩm yêu thích (1 user chỉ thích 1 sản phẩm 1 lần)
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_id_product_id_key
  ON favorites (user_id, product_id) WHERE deleted_at IS NULL;

-- ===================== Chat giữa user và admin (socket.io) =====================
-- Xem docs/chat-socket-io.md
-- Mỗi user có đúng 1 cuộc trò chuyện với "shop" (tất cả admin dùng chung)
--   user_id:   cuộc trò chuyện này là của user nào
--   sender_id: người gửi tin nhắn (chính user đó, hoặc 1 admin trả lời)
-- -> sender_id = user_id là tin của khách, khác nhau là tin của admin
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages (user_id);

-- ===================== Sổ địa chỉ =====================
-- Xem docs/address-book.md. Tỉnh/thành và phường/xã lấy từ Province Open API v2.
-- Lưu cả mã và tên để địa chỉ đã lưu không phụ thuộc việc API đổi tên sau này.
CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL DEFAULT '',
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province_code INTEGER NOT NULL,
  province_name VARCHAR(150) NOT NULL,
  ward_code INTEGER NOT NULL,
  ward_name VARCHAR(150) NOT NULL,
  address_line VARCHAR(160) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses (user_id);
-- Mỗi user chỉ có tối đa 1 địa chỉ mặc định chưa bị xóa
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user
  ON addresses (user_id) WHERE is_default = TRUE AND deleted_at IS NULL;
