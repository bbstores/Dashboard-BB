# BB Store Task Performance Dashboard

Dashboard Next.js đọc trực tiếp file Excel export từ Lark Base trong trình duyệt.
Dữ liệu workbook không được tải lên server và không được commit vào repository.

## Yêu cầu

- Node.js `>=22.13`
- Workbook `.xlsx` có các sheet:
  - `2.6 Tasklist`
  - `2.9 Lịch sử phản hồi Task`

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`, chọn file Excel và sử dụng bộ lọc ngày/tháng.

## Neon PostgreSQL

Project dùng PostgreSQL trên Neon với Drizzle ORM:

- `DATABASE_URL`: pooled connection string cho runtime serverless.
- `DATABASE_URL_UNPOOLED`: direct connection string cho migration.

Sau khi tạo database trên Neon và điền hai biến môi trường:

```bash
npm run db:generate
npm run db:migrate
```

Endpoint `GET /api/health/database` kiểm tra kết nối runtime. Schema nằm tại
`db/schema.ts`, migration PostgreSQL nằm trong `drizzle/`.

Workbook dashboard vẫn được đọc và phân tích trong trình duyệt. Việc cấu hình
Neon không tự động tải nội dung workbook hoặc dữ liệu nhân sự lên server.

## Logic khoảng thời gian

Khi có bộ lọc ngày, tập task gồm:

1. Task có `Ngày Bắt Đầu` nằm trong khoảng lọc.
2. Task bắt đầu ngoài khoảng lọc nhưng có `Ngày Hoàn Thành` nằm trong khoảng lọc.

Khi không chọn ngày, dashboard lấy toàn bộ task.

## Bảo mật dữ liệu

File Excel được xử lý bằng ExcelJS ngay trên thiết bị người dùng. Repository chỉ
chứa mã nguồn dashboard, không chứa dữ liệu nhân sự hoặc nội dung workbook.

## Kiểm tra chất lượng

```bash
npm run lint
npm run check:unused
npm test
```
