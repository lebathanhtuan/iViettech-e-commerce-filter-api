import { Sequelize } from 'sequelize'

// Thông tin kết nối đọc từ file .env
const sequelize = new Sequelize(
  process.env.DB_NAME, // database name
  process.env.DB_USER, // username
  process.env.DB_PASSWORD, // password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    define: {
      freezeTableName: true,
    },
  }
)

await sequelize.authenticate()

export default sequelize
