import pg from 'pg'
import { Sequelize } from 'sequelize'

const options = {
  dialect: 'postgres',
  // Truyền thẳng thư viện pg: Vercel đóng gói code không tự thấy pg nếu Sequelize require động
  dialectModule: pg,
  logging: false,
  define: {
    freezeTableName: true,
  },
}

// Deploy (Supabase): dùng 1 chuỗi DATABASE_URL, bắt buộc SSL
// Local: thông tin kết nối đọc từ DB_NAME / DB_USER / ... trong file .env như cũ
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      ...options,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
      // Serverless: mỗi instance chỉ giữ ít kết nối, pooler của Supabase lo phần còn lại
      pool: { max: 3, min: 0, idle: 10000 },
    })
  : new Sequelize(
      process.env.DB_NAME, // database name
      process.env.DB_USER, // username
      process.env.DB_PASSWORD, // password
      {
        ...options,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
      }
    )

await sequelize.authenticate()

export default sequelize
