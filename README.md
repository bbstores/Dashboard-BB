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
npm run dev
```

Mở `http://localhost:3000`, chọn file Excel và sử dụng bộ lọc ngày/tháng.

## Logic khoảng thời gian

Khi có bộ lọc ngày, tập task gồm:

1. Task có `Ngày Bắt Đầu` nằm trong khoảng lọc.
2. Task bắt đầu ngoài khoảng lọc nhưng có `Ngày Hoàn Thành` nằm trong khoảng lọc.

Khi không chọn ngày, dashboard lấy toàn bộ task.

## Bảo mật dữ liệu

File Excel được xử lý bằng ExcelJS ngay trên thiết bị người dùng. Repository chỉ
chứa mã nguồn dashboard, không chứa dữ liệu nhân sự hoặc nội dung workbook.
