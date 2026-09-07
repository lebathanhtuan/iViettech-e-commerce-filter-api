-- Chạy file này trên database e-commerce-filter_db nếu bảng users chưa có 2 cột dưới đây

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Tài khoản admin mẫu: admin@example.com / 123456
-- (password đã được mã hóa bằng bcrypt)
INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@example.com', '$2b$10$AF3r6SKCHeFyUydn0Lz2F.OSGCSM26HeEPTuvcuFFXeSLHChyK.HW', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
