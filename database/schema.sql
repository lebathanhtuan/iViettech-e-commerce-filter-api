-- Tạo các bảng gốc cho database mới (chạy TRƯỚC migration.sql)
-- Thứ tự chạy trên DB trống: schema.sql -> migration.sql -> seed.sql
-- (chạy lại nhiều lần cũng được vì dùng IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  image VARCHAR(500),
  description TEXT
);
