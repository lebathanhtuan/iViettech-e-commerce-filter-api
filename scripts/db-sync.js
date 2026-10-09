// Đồng bộ cấu trúc database lên Supabase (hoặc bất kỳ PostgreSQL nào có connection string)
// Chạy:
//   npm run db:sync  -> schema.sql: tạo bảng / index còn thiếu (an toàn, chạy lại nhiều lần được)
//   npm run db:seed  -> schema.sql + seed.sql (XÓA HẾT dữ liệu cũ, phải gõ "yes" để xác nhận)
//
// Connection string đọc từ SUPABASE_DB_URL trong .env (nếu không có thì dùng DATABASE_URL)
// -> để riêng SUPABASE_DB_URL thì server local (npm run dev) vẫn dùng DB local như cũ
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import pg from 'pg'

const args = process.argv.slice(2)
const withSeed = args.includes('--seed')
const skipConfirm = args.includes('--yes') // bỏ qua bước gõ "yes" (dùng khi chạy tự động)

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('Chưa có SUPABASE_DB_URL (hoặc DATABASE_URL) trong file .env')
  console.error('Lấy ở Supabase: nút Connect -> Direct -> Transaction pooler -> Type: URI')
  process.exit(1)
}

let url
try {
  url = new URL(connectionString)
} catch {
  console.error('Connection string không hợp lệ.')
  console.error('Mật khẩu có ký tự đặc biệt (@ # / ? %) thì phải mã hoá, vd: @ -> %40')
  process.exit(1)
}

const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname)
const files = ['schema.sql', ...(withSeed ? ['seed.sql'] : [])]

console.log(`Database : ${url.hostname}:${url.port || 5432}${url.pathname}`)
console.log(`Chạy file: ${files.join(' -> ')}`)

if (withSeed && !skipConfirm) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('\nseed.sql sẽ XÓA HẾT dữ liệu hiện có trong database trên. Gõ "yes" để tiếp tục: ')
  rl.close()

  if (answer.trim() !== 'yes') {
    console.log('Đã hủy.')
    process.exit(0)
  }
}

// Supabase bắt buộc SSL, DB local thường không bật SSL
const client = new pg.Client({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})

try {
  await client.connect()

  for (const file of files) {
    const sql = fs.readFileSync(path.resolve('database', file), 'utf8')
    const startedAt = Date.now()

    // Mỗi file chạy trong 1 transaction: lỗi giữa chừng thì không để lại DB "nửa vời"
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      error.message = `${file}: ${error.message}`
      throw error
    }

    console.log(`✔ ${file} (${Date.now() - startedAt} ms)`)
  }

  // Supabase: bật Row Level Security cho mọi bảng trong schema public
  // -> chặn truy cập bảng qua Data API bằng publishable key
  // Backend kết nối bằng user postgres (chủ các bảng) nên không bị RLS ảnh hưởng
  if (!isLocal) {
    await client.query(`
      DO $$
      DECLARE t record;
      BEGIN
        FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity LOOP
          EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
        END LOOP;
      END $$;
    `)
    console.log('✔ Bật Row Level Security cho các bảng')
  }

  const { rows } = await client.query(`
    SELECT tablename AS "table", rowsecurity AS "rls"
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)
  console.table(rows)
  console.log('Đồng bộ database xong.')
} catch (error) {
  console.error(`\n✘ Lỗi: ${error.message}`)

  // Gợi ý cho các lỗi kết nối hay gặp với Supabase
  if (error.code === 'ENOTFOUND' || error.code === 'ENETUNREACH') {
    console.error('Gợi ý: dùng Transaction pooler / Session pooler, không dùng Direct connection (chỉ có IPv6)')
  } else if (/password authentication failed|Tenant or user not found/i.test(error.message)) {
    console.error('Gợi ý: kiểm tra mật khẩu (đã xoá dấu [ ] chưa) và user phải có dạng postgres.<project-ref>')
  }
  process.exitCode = 1
} finally {
  await client.end()
}
