-- Dữ liệu mẫu để test (chạy SAU schema.sql)
-- CHÚ Ý: file này XÓA HẾT dữ liệu cũ trong tất cả các bảng rồi thêm lại từ đầu
--
-- Tất cả tài khoản đều có mật khẩu: 123456
--   admin@example.com  (admin)
--   an@example.com, binh@example.com, chi@example.com  (user)

TRUNCATE users, categories, products, cart_items, orders, order_items, reviews, favorites, messages
  RESTART IDENTITY CASCADE;

-- ===================== Users =====================
INSERT INTO users (name, email, password, role, phone) VALUES
  ('Admin', 'admin@example.com', '$2b$10$AF3r6SKCHeFyUydn0Lz2F.OSGCSM26HeEPTuvcuFFXeSLHChyK.HW', 'admin', '0900000000'),
  ('Nguyễn Văn An', 'an@example.com', '$2b$10$AF3r6SKCHeFyUydn0Lz2F.OSGCSM26HeEPTuvcuFFXeSLHChyK.HW', 'user', '0901234567'),
  ('Trần Thị Bình', 'binh@example.com', '$2b$10$AF3r6SKCHeFyUydn0Lz2F.OSGCSM26HeEPTuvcuFFXeSLHChyK.HW', 'user', '0912345678'),
  ('Lê Minh Chi', 'chi@example.com', '$2b$10$AF3r6SKCHeFyUydn0Lz2F.OSGCSM26HeEPTuvcuFFXeSLHChyK.HW', 'user', NULL);

-- ===================== Categories =====================
INSERT INTO categories (name) VALUES
  ('Laptop'),              -- 1
  ('Điện thoại'),          -- 2
  ('Máy tính bảng'),       -- 3
  ('Tai nghe'),            -- 4
  ('Đồng hồ thông minh'),  -- 5
  ('Phụ kiện');            -- 6

-- ===================== Products =====================
-- Ảnh là link ngoài (http...) nên getImageUrl() giữ nguyên, không ghép BASE_URL
INSERT INTO products (name, price, category_id, image, description) VALUES
  ('MacBook Air M4 13 inch', 26990000, 1, 'https://placehold.co/600x600/png?text=MacBook+Air+M4',
    '<p>MacBook Air chip <strong>Apple M4</strong>, RAM 16GB, SSD 256GB.</p><ul><li>Màn hình Liquid Retina 13.6 inch</li><li>Pin lên đến 18 giờ</li></ul>'),
  ('MacBook Pro M4 Pro 14 inch', 49990000, 1, 'https://placehold.co/600x600/png?text=MacBook+Pro+M4',
    '<p>MacBook Pro chip <strong>M4 Pro</strong>, RAM 24GB, SSD 512GB, màn hình Liquid Retina XDR.</p>'),
  ('Dell XPS 13 9350', 35990000, 1, 'https://placehold.co/600x600/png?text=Dell+XPS+13',
    '<p>Laptop mỏng nhẹ, Intel Core Ultra 7, RAM 16GB, SSD 512GB.</p>'),
  ('ASUS ROG Strix G16', 38490000, 1, 'https://placehold.co/600x600/png?text=ROG+Strix+G16',
    '<p>Laptop gaming Intel Core i9, <strong>RTX 4070</strong>, màn hình 240Hz.</p>'),
  ('Lenovo ThinkPad X1 Carbon Gen 12', 42990000, 1, 'https://placehold.co/600x600/png?text=ThinkPad+X1',
    '<p>Laptop doanh nhân siêu bền, trọng lượng chỉ 1.09kg.</p>'),

  ('iPhone 16 Pro Max 256GB', 30990000, 2, 'https://placehold.co/600x600/png?text=iPhone+16+Pro+Max',
    '<p>Chip <strong>A18 Pro</strong>, camera 48MP, màn hình 6.9 inch.</p>'),
  ('iPhone 16 128GB', 19990000, 2, 'https://placehold.co/600x600/png?text=iPhone+16',
    '<p>Chip A18, nút Camera Control mới, màn hình 6.1 inch.</p>'),
  ('Samsung Galaxy S25 Ultra', 28990000, 2, 'https://placehold.co/600x600/png?text=Galaxy+S25+Ultra',
    '<p>Snapdragon 8 Elite, bút S Pen, camera 200MP.</p>'),
  ('Samsung Galaxy A56 5G', 9490000, 2, 'https://placehold.co/600x600/png?text=Galaxy+A56',
    '<p>Màn hình Super AMOLED 120Hz, pin 5000mAh.</p>'),
  ('Xiaomi 15', 21990000, 2, 'https://placehold.co/600x600/png?text=Xiaomi+15',
    '<p>Camera Leica, sạc nhanh 90W.</p>'),
  ('Google Pixel 9', 18490000, 2, 'https://placehold.co/600x600/png?text=Pixel+9',
    '<p>Chip Tensor G4, nhiều tính năng AI của Google.</p>'),

  ('iPad Air M3 11 inch', 16990000, 3, 'https://placehold.co/600x600/png?text=iPad+Air+M3',
    '<p>Chip M3, hỗ trợ Apple Pencil Pro.</p>'),
  ('iPad Pro M4 13 inch', 37990000, 3, 'https://placehold.co/600x600/png?text=iPad+Pro+M4',
    '<p>Màn hình Ultra Retina XDR OLED, mỏng 5.1mm.</p>'),
  ('Samsung Galaxy Tab S10+', 24990000, 3, 'https://placehold.co/600x600/png?text=Galaxy+Tab+S10',
    '<p>Màn hình Dynamic AMOLED 2X 12.4 inch, kèm S Pen.</p>'),

  ('AirPods Pro 2', 5990000, 4, 'https://placehold.co/600x600/png?text=AirPods+Pro+2',
    '<p>Chống ồn chủ động, cổng USB-C.</p>'),
  ('Sony WH-1000XM5', 7490000, 4, 'https://placehold.co/600x600/png?text=Sony+XM5',
    '<p>Tai nghe chụp tai chống ồn hàng đầu, pin 30 giờ.</p>'),
  ('Samsung Galaxy Buds3 Pro', 4990000, 4, 'https://placehold.co/600x600/png?text=Galaxy+Buds3+Pro',
    '<p>Âm thanh Hi-Fi 24bit, chống ồn thông minh.</p>'),
  ('JBL Tune 520BT', 1290000, 4, 'https://placehold.co/600x600/png?text=JBL+Tune+520BT',
    '<p>Tai nghe bluetooth giá tốt, pin 57 giờ.</p>'),

  ('Apple Watch Series 10 GPS 42mm', 10490000, 5, 'https://placehold.co/600x600/png?text=Apple+Watch+S10',
    '<p>Màn hình lớn nhất từ trước đến nay, mỏng nhất.</p>'),
  ('Samsung Galaxy Watch7', 6990000, 5, 'https://placehold.co/600x600/png?text=Galaxy+Watch7',
    '<p>Theo dõi sức khỏe toàn diện, chip Exynos W1000.</p>'),
  ('Garmin Forerunner 265', 10990000, 5, 'https://placehold.co/600x600/png?text=Forerunner+265',
    '<p>Đồng hồ chạy bộ màn hình AMOLED, GPS đa băng tần.</p>'),

  ('Sạc Anker 65W GaN', 890000, 6, 'https://placehold.co/600x600/png?text=Anker+65W',
    '<p>Sạc nhanh 3 cổng, nhỏ gọn.</p>'),
  ('Chuột Logitech MX Master 3S', 2490000, 6, 'https://placehold.co/600x600/png?text=MX+Master+3S',
    '<p>Chuột không dây cao cấp, click yên tĩnh.</p>'),
  ('Bàn phím Keychron K2 Pro', 2790000, 6, 'https://placehold.co/600x600/png?text=Keychron+K2+Pro',
    '<p>Bàn phím cơ không dây, hot-swap, hỗ trợ QMK/VIA.</p>');

-- ===================== Reviews =====================
INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
  (2, 1, 5, 'Máy mỏng nhẹ, pin rất trâu, dùng cả ngày không cần sạc.'),
  (3, 1, 4, 'Máy đẹp nhưng giá hơi cao.'),
  (4, 1, 5, 'Rất đáng tiền!'),
  (2, 6, 5, 'Camera chụp đêm quá đỉnh.'),
  (3, 6, 3, 'Máy hơi nóng khi chơi game lâu.'),
  (2, 8, 4, 'Bút S Pen tiện lợi, màn hình đẹp.'),
  (3, 15, 5, 'Chống ồn tốt, đeo lâu không đau tai.'),
  (4, 16, 5, 'Âm thanh tuyệt vời.'),
  (2, 19, 4, 'Đẹp, nhiều tính năng sức khỏe.'),
  (4, 23, 5, 'Cầm rất sướng tay, dùng cho công việc cực ổn.');

-- ===================== Favorites =====================
INSERT INTO favorites (user_id, product_id) VALUES
  (2, 1), (2, 6), (2, 15),
  (3, 2), (3, 13),
  (4, 16), (4, 23);

-- ===================== Cart =====================
INSERT INTO cart_items (user_id, product_id, quantity) VALUES
  (2, 7, 1),
  (2, 22, 2),
  (3, 19, 1);

-- ===================== Orders =====================
-- price trong order_items là giá lúc mua, total_price = tổng price * quantity
INSERT INTO orders (code, user_id, full_name, phone, address, total_price, created_at, updated_at) VALUES
  ('A1B2C3D4', 2, 'Nguyễn Văn An', '0901234567', '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh', 0, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('K7Q2M9XA', 2, 'Nguyễn Văn An', '0901234567', '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh', 0, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('Z9Y8X7W6', 3, 'Trần Thị Bình', '0912345678', '45 Trần Phú, Hải Châu, Đà Nẵng', 0, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

INSERT INTO order_items (order_id, product_id, price, quantity) VALUES
  (1, 1, 26990000, 1),
  (1, 15, 5990000, 1),
  (2, 22, 890000, 2),
  (3, 6, 30990000, 1),
  (3, 16, 7490000, 1),
  (3, 23, 2490000, 1);

UPDATE orders o SET total_price = (
  SELECT SUM(price * quantity) FROM order_items oi WHERE oi.order_id = o.id
);

-- ===================== Chat =====================
-- sender_id = user_id là tin của khách, sender_id = 1 là admin trả lời
INSERT INTO messages (user_id, sender_id, content, created_at, updated_at) VALUES
  (2, 2, 'Shop ơi, MacBook Air M4 còn hàng không ạ?', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  (2, 1, 'Dạ còn hàng ạ, bạn đặt hôm nay sẽ được giao trong 2 ngày nhé!', NOW() - INTERVAL '1 hour 55 minutes', NOW() - INTERVAL '1 hour 55 minutes'),
  (2, 2, 'Cảm ơn shop!', NOW() - INTERVAL '1 hour 50 minutes', NOW() - INTERVAL '1 hour 50 minutes'),
  (3, 3, 'Mình muốn đổi địa chỉ giao hàng cho đơn Z9Y8X7W6 được không?', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes');
