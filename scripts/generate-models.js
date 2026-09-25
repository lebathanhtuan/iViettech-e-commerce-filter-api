// Sinh lại các model trong thư mục models/ từ database (dùng sequelize-auto)
// Chạy: npm run generate-models
//
// Tương đương câu lệnh:
// npx sequelize-auto -o "./models" -d <DB_NAME> -h <DB_HOST> -u <DB_USER> -x <DB_PASSWORD> -p <DB_PORT>
//   -e postgres -s public -l esm --caseFile c --caseModel p --caseProp o --singularize
// nhưng thông tin kết nối được đọc từ file .env thay vì ghi cứng trong package.json
import 'dotenv/config'
import SequelizeAuto from 'sequelize-auto'

const auto = new SequelizeAuto(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  directory: './models', // -o
  schema: 'public', // -s
  lang: 'esm', // -l
  caseFile: 'c', // tên file camelCase: cart_items -> cartItem.js
  caseModel: 'p', // tên model PascalCase: CartItem
  caseProp: 'o', // tên thuộc tính giữ nguyên như cột trong DB: user_id
  singularize: true, // tên số ít: cart_items -> CartItem
  // Bảng có created_at / updated_at / deleted_at -> sequelize-auto tự thêm timestamps: true, paranoid: true
  // underscored: true để Sequelize dùng đúng tên cột created_at thay vì createdAt
  additional: {
    underscored: true,
  },
  logging: false,
})

await auto.run()
console.log('Đã sinh lại models/ từ database', process.env.DB_NAME)
