# BB Store Dashboard — mô hình dữ liệu ban đầu

Nguồn phân tích: `BB Store_ Quản lý Task - dự án.xlsx`.

## Trọng tâm

- `tasks` ánh xạ từ sheet `2.6 Tasklist` (3.758 dòng dữ liệu, 54 cột).
- `posts` ánh xạ từ sheet `2.7 Đăng Bài` (1.959 dòng dữ liệu, 27 cột).
- Quan hệ chính: `posts.booked_task_code → tasks.code`.

## Bảng vệ tinh

- Danh mục: `people`, `channels`, `content_formats`.
- Sản phẩm/chiến dịch: `collections`, `products`, `marketing_plans`,
  `marketing_orders`, `reorder_requests`.
- Vận hành: `shoot_sessions`, `task_feedback`, `expense_requests`.
- Quan hệ nhiều-nhiều: `task_products`, `post_products`,
  `task_dependencies`.
- Đồng bộ file: `import_batches` và các cột `source_row_hash`,
  `last_seen_batch_id`, `is_active` trên bảng được import.

## Quy tắc đồng bộ file tuần

1. Tính SHA-256 của file và không chạy lại file đã import.
2. Tạo một `import_batches` ở trạng thái `processing`.
3. Chuẩn hóa ngày Excel sang UTC và tên người/kênh/định dạng sang bảng danh mục.
4. Upsert theo mã ổn định (`TSK...`, `POST...`, `MKTORD...`, SKU...).
5. Chỉ update khi `source_row_hash` thay đổi.
6. Dòng cũ không xuất hiện trong file mới được đặt `is_active = false`; không xóa cứng.
7. Commit toàn bộ import trong một transaction và lưu số dòng thêm/sửa/không đổi.

## Lưu ý từ workbook

- Nhiều ô chứa danh sách mã phân tách bằng dấu phẩy. Khi import phải tách sang
  bảng liên kết, không lưu làm khóa ngoại trong một cột text.
- Workbook có cả ngày dạng Excel serial và chuỗi `dd/mm/yyyy`; importer phải
  dùng một hàm chuyển đổi thống nhất.
- `Tasklist.Record ID` có thể dùng để phát hiện đổi mã task, còn
  `Tasklist.Công việc` vẫn là khóa nghiệp vụ chính.
- `Đăng Bài.Book Task` đôi khi có thể trống; khóa ngoại được phép null để không
  làm hỏng cả batch import.

