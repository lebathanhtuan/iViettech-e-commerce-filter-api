-- Chạy file này trên database e-commerce-filter_db (chạy lại nhiều lần cũng được)

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Tài khoản admin mẫu: admin@example.com / 123456
-- (password đã được mã hóa bằng bcrypt)
INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@example.com', '$2b$10$AF3r6SKCHeFyUydn0Lz2F.OSGCSM26HeEPTuvcuFFXeSLHChyK.HW', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- =====================================================================
-- Phần 2: giỏ hàng, đơn hàng, đánh giá, yêu thích, profile
-- (chạy lại nhiều lần cũng không sao vì dùng IF NOT EXISTS)
-- =====================================================================

-- Thông tin thêm của user (trang My profile)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);

-- Giỏ hàng: mỗi dòng là 1 sản phẩm trong giỏ của 1 user
-- (1 sản phẩm chỉ có 1 dòng, thêm trùng thì tăng quantity -> xem unique index ở phần 3)
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Đơn hàng: lưu thông tin giao hàng + tổng tiền lúc đặt
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE, -- mã đơn hàng hiển thị cho user, vd: "K7Q2M9XA"
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  total_price NUMERIC NOT NULL
);

-- Nếu bảng orders đã được tạo từ trước (chưa có cột code) thì thêm cột code,
-- sinh mã ngẫu nhiên cho các đơn cũ rồi mới đặt NOT NULL + UNIQUE
ALTER TABLE orders ADD COLUMN IF NOT EXISTS code VARCHAR(8);
UPDATE orders SET code = UPPER(SUBSTRING(MD5(id::text || RANDOM()::text), 1, 8)) WHERE code IS NULL;
ALTER TABLE orders ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_code_key ON orders (code);

-- Chi tiết đơn hàng: lưu lại giá tại thời điểm mua (giá sản phẩm sau này có thể đổi)
-- Sản phẩm bị xóa thì product_id = NULL, đơn hàng cũ vẫn còn
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL
);

-- Bình luận + đánh giá (rating từ 1 đến 5 sao), mỗi user chỉ đánh giá 1 sản phẩm 1 lần -> xem unique index ở phần 3
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT
);

-- Sản phẩm yêu thích (1 user chỉ thích 1 sản phẩm 1 lần -> xem unique index ở phần 3)
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE
);

-- =====================================================================
-- Phần 3: created_at, updated_at, deleted_at cho TẤT CẢ các bảng
-- -> model dùng được timestamps: true (tự lưu thời gian tạo / sửa)
--    và paranoid: true (xóa mềm: destroy() chỉ ghi deleted_at, không xóa hẳn dòng)
-- =====================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- DB tạo từ bản cũ: cột created_at của orders, reviews là TIMESTAMP -> đổi sang TIMESTAMPTZ cho giống các bảng khác
ALTER TABLE orders ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE reviews ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Xóa mềm thì dòng cũ vẫn còn trong bảng. Nếu dùng UNIQUE (user_id, product_id) bình thường thì
-- xóa sản phẩm khỏi giỏ xong sẽ không thêm lại được (trùng với dòng đã xóa mềm).
-- -> Đổi sang unique index có điều kiện: chỉ không được trùng giữa các dòng CHƯA bị xóa
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_id_product_id_key
  ON cart_items (user_id, product_id) WHERE deleted_at IS NULL;

ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_id_product_id_key
  ON favorites (user_id, product_id) WHERE deleted_at IS NULL;

-- Mỗi user chỉ được đánh giá 1 sản phẩm 1 lần (chỉ tính các đánh giá chưa bị xóa mềm)
-- Nếu DB cũ đã có đánh giá trùng: giữ lại đánh giá mới nhất, xóa mềm các đánh giá cũ hơn
UPDATE reviews SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND id NOT IN (
    SELECT MAX(id) FROM reviews WHERE deleted_at IS NULL GROUP BY user_id, product_id
  );
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_id_product_id_key
  ON reviews (user_id, product_id) WHERE deleted_at IS NULL;
