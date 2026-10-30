# BB Store Operations Dashboard — hướng dẫn cho Claude

Đọc file này trước khi làm việc. Nó tóm tắt bối cảnh dự án và các quy tắc nghiệp vụ
user đã chốt qua nhiều phiên làm việc (tháng 9–10/2026). Khi quy tắc ở đây mâu thuẫn
với giả định mặc định, **quy tắc ở đây thắng**.

## Làm việc với user

- Trả lời bằng **tiếng Việt**. Commit message viết tiếng Anh theo kiểu conventional
  commits (`feat:`, `refactor:`, `fix:`…), giống lịch sử git.
- User là back-office của BB Store, theo dõi vận hành team Media/Content trên Lark Base.
  Họ rất nhạy với "ảo tưởng số liệu": mọi con số phải nói rõ phạm vi, mốc ngày và
  những gì bị loại.
- Khi dùng proxy (ví dụ thiếu link thì ghép theo Mã sản phẩm), **ghi rõ là proxy**.
- Kết quả link Task Phụ Thuộc gửi qua chat, không cập nhật vào báo cáo Docs trừ khi
  user yêu cầu.
- Ca mơ hồ (tên task lệch, không rõ khâu trước) thì liệt kê ra để user duyệt, không tự đoán.

## Dự án

Next.js 16 + React 19 + TypeScript. Dashboard đọc file Excel export từ Lark Base
**ngay trong trình duyệt** (ExcelJS chạy trong Web Worker). Workbook không được tải lên
server và không được commit (thư mục `/excel/` đã gitignore, chứa dữ liệu nhân sự).
Neon PostgreSQL + Drizzle (`db/`, `drizzle/`) mới là hạ tầng chuẩn bị, chưa nhận dữ liệu.

```bash
npm run dev          # http://localhost:3000, chọn file .xlsx
npm test             # typecheck + build + toàn bộ test
npm run test:unit    # chỉ test đơn vị (node --test + tsx)
npm run lint
npm run check:unused # knip
```

Cấu trúc chính trong `features/dashboard/`:

- `data/excel/` — parse từng sheet (`parseTasks.ts`, `parseFeedback.ts`…), schema ở `workbookSchema.ts`.
- `model/` — kiểu dữ liệu và helper nghiệp vụ: `taskUtils.ts` (`isPendingCancelTask`,
  `feedbackReturnSource`…), `slaUtils.ts` (`handoffAt`…).
- `analytics/` — các hàm `calculate*` thuần, có test trong `tests/`.
- `sections/`, `components/`, `dialogs/` — UI. Mỗi chart có `calculation` mô tả cách tính
  hiển thị cho người dùng; khi đổi logic phải sửa luôn mô tả này.
- Helper ngày dùng chung ở `shared/date/dateUtils.ts`.

Tài liệu nghiệp vụ trong `docs/`:

- `quy-tac-link-task-phu-thuoc.md` — **bản đầy đủ** quy tắc link Task Phụ Thuộc. Đọc trước khi link.
- `quy-trinh-tao-task-bst.md` — quy trình tạo hàng loạt task cho BST mỗi tháng từ 1.7 Định Mức
  (script `scripts/bst-tasks/`). **Đọc trước khi tạo task BST.**
- `data-model.md` — mô hình dữ liệu dự kiến cho Postgres.
- `KIEM_TRA_SAU_*.txt`, `SE_LAM_SAU_*.txt` — việc để dành cho phase sau.

## Các sheet trong workbook

- **2.6 Tasklist** — bảng task chính.
- **2.9 Lịch sử phản hồi Task** — mỗi dòng là một lần trả về (Reject By, Thời Điểm, Nguồn Trả).
- **2.7 Đăng Bài** — bài đăng, nối với task qua `Book Task`.
- **1.7 Định Mức Nhân Sự** — định mức. Cột "Hiếu Duyệt" ở đây **sai**, không dùng.

## Quy tắc nghiệp vụ đã chốt

### Lọc task
- Chỉ loại **Pending / Cancel** và **Archived**.
- **Skip** = task được bỏ qua bước kiểm duyệt của Hiếu, vẫn là task thật: vẫn tính sản
  lượng, vẫn phải nằm trong chuỗi Task Phụ Thuộc. Không được loại Skip.

### Luồng kiểm duyệt
Media làm → **Trung Hiếu (Producer)** duyệt → cấp lead (**Thùy An, Boss BB, Thu Trang**
— tài khoản "Thu Trang - Content MKT" và "Media Planner", **Thúy Sang - OM SOCIAL** tạm thời)
→ **BOD**.

- `Approval By` = người chuyển Checking → Done **gần nhất** (bị ghi đè mỗi lần Done lại).
  `Ngày Hoàn Thành` cũng bị ghi đè.
- Cột `Producer Pass` (thêm 12/10/2026) là nguồn thứ hai, chưa chính xác 100%.
- Reject từ người ngoài danh sách trên (TRÂMM, Bảo Ngân, Như Tâm, Phương Thuỳ, Hoàng Anh…)
  chủ yếu là thao tác nhầm → loại.
- Lead reject task do Hiếu đã duyệt = "bị trả sau duyệt". Hiếu reject sau lần Done mới nhất
  = "tự mở lại", tính riêng.

### Lần trả về (2.9)
- Đếm theo **số lần trả**, không đếm theo task.
- Nguồn trả (`feedbackReturnSource`): hieu / lead / business / bod / null (loại).
  BOD lấy từ cột **Nguồn Trả** (thêm 27/10/2026, có workflow tự gắn); còn lại xếp theo tên.
- Thùy An và Boss BB vừa là lead vừa bấm cổng BOD → **không tách BOD theo tên được**.
- Số BOD trông lạ → kiểm tra dòng 2.9 có Nguồn Trả trống, hoặc lần BOD trả không sinh dòng 2.9.

### Mốc chấm điểm
- **Đánh Giá Bàn Giao** neo theo **Ngày Bàn Giao Lần Đầu**, trống thì dùng Ngày Kiểm Duyệt
  (`handoffAt()` — chỉ dùng cho phần chấm bàn giao).
- **Đánh Giá Tổng** dùng **Ngày Hoàn Thành** mới nhất.
- Các thống kê khác (chart theo ngày, năng lực media, backlog, thời gian duyệt) vẫn dùng
  Ngày Kiểm Duyệt.
- Ngày Hoàn Thành Lần Đầu chỉ có từ khoảng 22/09/2026, chưa tin được.

### Carry-in
Task bắt đầu trước kỳ nhưng kiểm duyệt/hoàn thành trong kỳ **không được cộng** vào phút,
sản lượng (Video/Graphic) hay tỷ lệ đúng hạn. Báo cáo carry-in thành khối riêng, chỉ đếm số
task, ghi rõ trong phần phương pháp. Số chính dùng `startedInWindow` / `started`.

### Số phút dự kiến: luật +10 phút (chốt 30/10/2026)
Số phút gốc lấy từ **1.7 Định Mức**. Một automation của Base (người sửa hiện là "Base Assistant",
không có trong `+workflow-list`) tự cộng +10 phút vào task mới. Luật đúng theo user:
- **Edit video: +10** (thời gian setup).
- **Viết Content: +10** (lên ý tưởng).
- **Graphic: +10.** Với ảnh, phần +10 nằm ở khâu Graphic.
- **Edit ảnh (Lookbook, 3D, Branding, Manơcanh…): KHÔNG +10**, vì đây chỉ là bước trung gian.
  Automation vẫn cộng nhầm cho khâu này, nên phải đưa về đúng 1.7 sau khi tạo (`bst_tasks.py fix-minutes`).
- Quay, Chụp, Viết Caption: đúng 1.7, không cộng.

### Nền Tảng (task BST)
Luật đầy đủ ở `docs/quy-trinh-tao-task-bst.md` mục 5a, code ở `platforms_for()` trong script.
- Chỉ ấn phẩm cuối mới gắn Nền Tảng: Edit video, Graphic.
- **Cửa hàng (31 LVS, 25 NT…) = Không Đăng Social**, vì cửa hàng không phải kênh social.
- **Gracy**: TikTok nào cũng là Tiktok BB Store; Facebook là Facebook BBStore + Facebook Gracy.
- Ngày Đăng Dự Kiến chỉ ghi cho task có Nền Tảng. Gắn xong, workflow tự sinh bài ở 2.7
  (mỗi nền tảng một bài), nên phải được user đồng ý trước khi ghi.

### Task Phụ Thuộc là nguyên nhân gốc
Cột Task Phụ Thuộc (khâu sau → khâu trước) thiếu link rất nhiều (23/10/2026: 290/7.389 task
có link). Nó kéo theo Link Input, Deadline Cột Mốc Content và việc biết khâu sau đã sẵn sàng
chưa. **Khi nhận xét vận hành, tồn đọng hay trễ hạn, phân tích độ phủ Task Phụ Thuộc trước**
các chỉ số bề nổi. Quy tắc link: xem `docs/quy-tac-link-task-phu-thuoc.md`.

## Lark Base

Dự án làm việc trực tiếp với Lark Base qua `lark-cli` (có skill `lark-base-database`).
Token, ID bảng/cột và các bẫy API nằm trong `CLAUDE.local.md` (không commit). Nếu file
đó không có, hỏi user.

Lưu ý chung:
- API Lark **không kiểm tra cú pháp công thức**. Tham chiếu cột bảng khác:
  `bitable::$table[tbl].$column[fld]`; `$field[fld]` chỉ là ô của dòng hiện tại.
- Khi sửa công thức đang dùng, chép công thức vào cột cũ để **giữ field ID** (view,
  dashboard, automation đang trỏ vào).
- Lệnh `+record-list` ghi file ra thư mục hiện tại → chạy trong scratchpad.
- Ghi dữ liệu lên Base là thao tác ảnh hưởng thật tới cả team: xác nhận với user trước.
