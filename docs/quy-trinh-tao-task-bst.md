# Quy trình tạo task BST hàng tháng — 2.6 Tasklist

Cập nhật: 29/10/2026. Nguồn: các quyết định đã chốt với user khi tạo task cho BST T12/2026.
Đọc cùng `quy-tac-link-task-phu-thuoc.md` (quy tắc link Task Phụ Thuộc).

Base: **BB Store: Quản lý Task - dự án**. Token xem `CLAUDE.local.md`.
Script: `scripts/bst-tasks/bst_tasks.py`, mẫu cấu hình `scripts/bst-tasks/config.example.json` (chính là cấu hình T12/2026).

## 1. Bối cảnh

- Không có workflow nào tự sinh task cho BST. Nút "Run dự án" ở 2.1 chỉ tạo SKU (workflow "BST | Tạo SKU từ Bộ Sưu Tập").
- Trước đây Media Planner tạo tay (ví dụ BST 11.2026 tạo lúc 16/09/2026). Từ T12/2026, Claude tạo qua `lark-cli +record-batch-create`.
- Lark CLI có quyền `base:record:create` nhưng **không có quyền xoá**. Tạo sai thì chỉ sửa được; muốn xoá, user phải xoá tay. Vì vậy phải duyệt plan kỹ trước khi ghi.

## 2. Nguồn dữ liệu

| Bảng | Dùng để |
|---|---|
| **1.7 Định Mức** `tblMc6k2WaTuKR5W` | Danh sách định dạng và số phút. Chỉ lấy các dòng có tích **BST**. Đây là bảng khác với "1.7 Định Mức Nhân Sự". |
| **2.1 Bộ Sưu Tập** `tblVcNQ2GK0JgAgN` | Danh sách BST của tháng, lấy theo cột `ID` (ví dụ `12.2026-Tiệc`). Cột `Tên BST` thường để trống. |
| **2.3 Product.SKU** `tblQxv9Kn7SSwfg6` | Mã SP theo `Tháng Ra Mắt` (ví dụ `12.2026`), kèm link `BST (Link 2.1)`. |
| **Ảnh lineup** user gửi | Màu của từng mã và các combo. Cột `Mã Phối / Màu sắc` ở 2.3 thường trống. |

Mã trên ảnh lineup có thể đã cũ. Ví dụ T12: ảnh ghi AAM45T, VAM46T, VAM74V; trên Lark đã đổi thành AAM45N, VAM46N, VAM74H. **Luôn dùng mã trên Lark** và báo user chỗ lệch.

## 3. Quy tắc dựng task từ 1.7

1. **Cột thời gian nào có số thì tạo công đoạn đó.** Cột trống thì không làm khâu đó.
   - `Thời gian Viết Content` → Viết Content
   - `Thời gian Record (Phút)` → Quay (video) hoặc Chụp (định dạng bắt đầu bằng "Ảnh")
   - `Thời gian Edit (Phút)` → Edit
   - `Thời gian Graphic` → Graphic Design
   - `Thời Gian Viết Caption` → Viết Caption (cột thêm 29/10/2026)
2. **Ghi Chú được ưu tiên hơn con số.** Video Tripod có số ở cột Content nhưng Ghi Chú ghi "Không có content", nên không tạo Content. Popup Website / Banner có Ghi Chú "Adapt, Banner cho FB Web, Sàn và Zalo", nên chỉ tạo 1 task, đặt tên theo mẫu cũ.
3. **Thêm Quay dù 1.7 không có số Record** (user chốt): Video Teaser, Comming Soon Video, Video Trailer, mỗi task 30 phút. Ghi trong `quay_added` của config.
4. **Số phút dự kiến** lấy đúng theo 1.7 (xem bẫy +10 phút ở mục 7).
5. **Thứ tự khâu và link** (khâu sau → khâu trước, link bậc thang):
   Content → Quay/Chụp → Edit → Graphic.
   Caption là link **song song**: khâu cuối (ấn phẩm) link tới task Caption của cùng chuỗi.

## 4. Theo mã, theo combo, theo BST

User chốt 29/10/2026:

| Nhóm | Định dạng | Cách tạo |
|---|---|---|
| Theo mã | Video Voice, Video Trend, Ảnh 3D, Graphic Ecom | Mỗi mã một bộ, kể cả mã thuộc combo |
| Theo look | Ảnh Lookbook, Video MV, Video Tripod | Mã đơn: mỗi mã một bộ. **Combo: một bộ chung**, cột Mã sản phẩm gắn cả 2 mã, tên ghi `AAM08T-VAM09T` |
| Theo màu | Video Voice, Video Tripod | Tách theo **mọi màu** trong lineup, mỗi màu đủ khâu. Không phân biệt màu chữ đỏ/đen ("kệ màu"). Combo dùng các màu gộp của 2 mã |
| Theo BST | Video Branding BST, Ảnh Branding BST, Video Behind the Scene, Video Trailer, Video Teaser, Comming Soon Video, Video LCD Cửa Hàng, Comming Soon Graphic, Shop in Shop, Popup Website / Banner, Ảnh Ấn Phẩm POSM, Lighbox, Template Layout BST | Mỗi BST một bộ, không gắn mã |

Các định dạng còn lại (MV, Lookbook, 3D, Trend, Ecom) **không ghi màu** vào tên.

Combo là các mã đi chung một look trên ảnh lineup (áo + váy/quần). T12: AAM08T-VAM09T, AAM45N-VAM46N, AAM73V-VAM74H. Mỗi tháng **hỏi user** danh sách combo.

Nếu 1.7 thêm hoặc bỏ một định dạng có tích BST, script dừng lại. Hỏi user định dạng đó thuộc nhóm nào rồi cập nhật `DEFAULT_GROUPS` (hoặc `groups` trong config) và bảng trên.

## 5. Đặt tên và các cột

- **Tên Task:** `<Khâu> <Định dạng> <Nhãn>`
  - Khâu: Viết Content / Quay / Chụp / Edit / Graphic / Viết Caption. Graphic của Ảnh Lookbook ghi `Graphic + Resize (TikTok)`.
  - Nhãn theo mã: `DAM01A`; theo màu: `DAM01A - Kem`; combo: `AAM08T-VAM09T` hoặc `AAM08T-VAM09T - Kem`; theo BST: `12.2026-Tiệc`.
  - Ví dụ: `Quay Video Voice DAM01A - Kem`, `Graphic + Resize (TikTok) Ảnh Lookbook AAM73V-VAM74H`, `Viết Caption Video Teaser 12.2026-Gracy`, `Graphic Banner, Popup Website/Fanpage/Zalo/ADS 12.2026-Tiệc`.
  - Không ghi tên mẫu (Mai Chi, Phương Khánh…) khi chưa biết.
  - Tên cũ hơi lặp như `Graphic Graphic Ecom DAM01A` vẫn giữ để đồng bộ với các tháng trước, và vì quy tắc ghép link so tên sau khi bỏ chữ khâu ở đầu.
- **Ghi:** Tên Task, Công đoạn, Format Type (link 1.7), Mã sản phẩm (link 2.3, trừ task theo BST), Bộ Sưu Tập (link 2.1), Số phút dự kiến, Trạng thái = `To Do`, Task Phụ Thuộc.
- **Để trống cho PM:** Assignee.
- **Nền Tảng + Ngày Đăng Dự Kiến:** gắn bằng lệnh `platforms` sau khi tạo task (mục 5a).

## 5a. Nền Tảng và Ngày Đăng Dự Kiến

Rút từ các BST 09–11/2026: luật khớp 865/904 task (95,7%). User chốt 30/10/2026. Code ở hàm `platforms_for()` trong script.

**Chỉ ấn phẩm cuối mới gắn:** Edit của video, Graphic của ảnh/graphic. Khâu Edit ảnh (Lookbook, Manơcanh, Branding, Product) là trung gian, không gắn. Ảnh 3D, Lighbox, Content, Quay, Chụp, Caption cũng không gắn.

| Định dạng | Nền Tảng |
|---|---|
| Video Tripod, Video Trend, Branding BST (video + ảnh), Behind the Scene, Teaser, Trailer, Comming Soon (video + graphic), Template Layout BST | Facebook BBStore + Tiktok BB Store |
| Video MV, Graphic Ảnh Lookbook | Facebook BBStore + Tiktok BB Store |
| Video Voice | Facebook BBStore + **Tiktok BB Công Sở** |
| Video Manơcanh, Video Product, Graphic Ảnh Manơcanh | Facebook BBStore + Tiktok BB Dress |
| Popup Website / Banner | Facebook BBStore + Website |
| Graphic Ecom, Shop in Shop, **POSM, Video LCD Cửa Hàng** | Không Đăng Social |

Ngoại lệ theo dòng BST:
- **Misschic:** Voice dùng Facebook Misschic + Tiktok BB Công Sở. MV, Graphic Lookbook và Graphic Manơcanh dùng Facebook Misschic + Tiktok Misschic. Video Manơcanh dùng Facebook Misschic + Tiktok BB Dress. Các định dạng còn lại giống bảng trên.
- **Gracy** (chốt 30/10/2026): **TikTok nào cũng đổi thành Tiktok BB Store, Facebook nào cũng đổi thành Facebook BBStore + Facebook Gracy**. Không đổi Website và Không Đăng Social. Voice cũng theo luật này: Tiktok BB Store, không dùng Công Sở; PM muốn đổi thì tự sửa.

Quyết định đi kèm:
- **Cửa hàng không phải kênh social.** Mọi ấn phẩm cho cửa hàng (31 LVS, 25 NT, cửa hàng mới sau này) đều gắn **Không Đăng Social**. Gắn option cửa hàng vẫn sinh bài 2.7 nên không dùng nữa.
- Graphic Ảnh Branding BST: lịch sử chia đôi 7/7 giữa "chỉ Facebook" và "Facebook + Tiktok". User chọn gắn cả hai, dư thì PM xoá.
- **Ngày Đăng Dự Kiến chỉ ghi cho task có gắn Nền Tảng.** User đưa ngày cho mỗi tháng (T12: 02/12/2026 00:00), ghi vào `post_date` trong config.

**Hệ quả:** task Edit/Graphic có đủ Nền Tảng (khác Không Đăng Social) và Ngày Đăng Dự Kiến sẽ kích workflow "ĐĂNG BÀI | Tạo bài đăng từ Task theo nền tảng". Workflow sinh **mỗi nền tảng một bài** ở 2.7, mất vài phút mới xong (T12: 248/314 bài sau lần đọc đầu, 314/314 ở lần đọc sau). CLI không xoá được bài, nên phải gửi user số bài dự kiến và chờ đồng ý trước khi chạy `--apply`. Gắn qua API **không** làm workflow xoá phút chạy (đã kiểm chứng trên 454 task T12).

## 6. Quy trình chạy

Làm trong scratchpad, vì lark-cli ghi file `.ndjson` ra thư mục hiện tại:

1. **Hỏi user:** tháng nào, ảnh lineup (màu + combo). Có thay đổi gì ở 1.7 không?
2. Chép `config.example.json` vào scratchpad, sửa `month`, `bst_order`, `colors`, `combos`, `quay_added`.
3. `python3 bst_tasks.py fetch --config config.json`: kéo 1.7, 2.1, 2.3 và toàn bộ 2.6.
4. `python3 bst_tasks.py plan --config config.json`: sinh `plan.json` và in danh sách theo từng BST. Script dừng nếu:
   - bảng màu lệch với 2.3,
   - 1.7 đổi danh sách định dạng,
   - có tên task trùng.
   Dòng "đang có sẵn trên Lark" phải bằng 0.
5. **Gửi user tổng số task theo BST và công đoạn, các điểm lạ. Chờ user đồng ý.**
6. `python3 bst_tasks.py apply --config config.json`. Có thể chạy `--only "<BST>"` để tạo thử một BST trước. `apply` tự dừng nếu BST đã có task.
7. `python3 bst_tasks.py verify --config config.json`: đối chiếu tên, công đoạn, trạng thái, format, mã, BST, link và số phút với plan.
8. Đợi khoảng 1 phút để automation +10 chạy xong, rồi chạy `python3 bst_tasks.py fix-minutes --config config.json --apply` để đưa Edit ảnh về đúng 1.7 (mục 7). Báo user: dải mã TSK, số task, số link, số phút đã chỉnh.
9. **Hỏi user ngày đăng dự kiến**, ghi vào `post_date`. Chạy `python3 bst_tasks.py platforms --config config.json` để xem trước: số task gắn, số bài 2.7 sẽ sinh, định dạng chưa có luật. Gửi user, chờ đồng ý.
10. `python3 bst_tasks.py platforms --config config.json --apply`. Đợi vài phút, đọc lại, đối chiếu số bài 2.7 của từng task với số nền tảng (không tính Không Đăng Social). Lần đầu áp luật mới thì nên ghi thử vài task trước.

`apply` lưu `created_ids.json` sau mỗi lô. Nếu bị ngắt giữa chừng, chạy lại `apply` sẽ chỉ tạo phần còn thiếu, **không chạy `fetch` lại trước đó**.

### Thứ tự tạo — mã TSK liền theo chuỗi

User muốn mã TSK **chạy liền theo từng chuỗi** để dễ nhìn trên Lark, ví dụ Content 101, Quay 102, Caption 103, Edit 104.

`apply` đi theo đúng thứ tự trong plan (BST → mã → định dạng → khâu, Caption đứng ngay trước ấn phẩm). Script gom các task liền nhau vào một lô và chỉ cắt lô khi gặp task cần ID của task còn trong lô hiện tại. Lark đánh số `Công việc` theo thứ tự trong lô, nên mã chạy liền mà link vẫn gắn được ngay lúc tạo.

Lần T12/2026 (TSK11517–TSK11970) tạo theo **đợt độ sâu**, nên mã trong một chuỗi bị nhảy. Ví dụ Behind the Scene Gracy: Content TSK11730, Caption TSK11731, Quay TSK11899, Edit TSK11966. Dữ liệu và link vẫn đúng, chỉ khó nhìn. Không tạo lại vì không xoá được.

## 7. Bẫy đã gặp

- **Automation cộng +10 phút.** Vài giây sau khi tạo, một automation (người sửa hiện là "Base Assistant") cộng thêm 10 phút vào `Số phút dự kiến` của task Viết Content, Edit và Graphic Design. Quay, Chụp, Caption giữ nguyên. Automation này **không có trong `+workflow-list`**, và cũng chạy với task Media Planner tạo tay (TSK11499 20→30, TSK11502 60→70…).
  **Luật user chốt 30/10/2026:**
  - Edit video +10 (setup), Viết Content +10 (lên ý tưởng), Graphic +10.
  - **Edit ảnh không +10**, vì đây chỉ là bước trung gian; phần +10 của ảnh nằm ở Graphic.
  - Automation cộng nhầm cho Edit ảnh, nên sau `apply` phải chạy `fix-minutes`.
  - Cập nhật số phút qua API thì automation **không** cộng lại (đã thử trên TSK11748).
  - T12: 38 task Edit ảnh đã đưa về 1.7. 119 Edit video, 56 Graphic và 47 Content giữ +10.
- **Sai Số Phút** được bật True cho phần lớn task Content/Edit/Graphic ngay khi tạo, nhưng workflow "Xóa phút dự kiến khi Sai Số Phút = True" **không** xoá phút của task tạo qua API.
- **Ngày Đăng Dự Kiến** để trống, vì workflow "Lấy ngày đăng dự kiến từ Bộ Sưu Tập" không chạy khi tạo qua API. Các BST tháng 11 cũng trống cột này.
- **`Task Phụ Thuộc` qua API chỉ thấy một chiều** (khâu sau → khâu trước). Khi verify, so ô của task khâu sau, đừng chờ link ngược ở task khâu trước.
- **View trên Lark có thể đang nhóm hoặc lọc theo BST.** Khi user thấy "thiếu" (T12: tưởng Graphic Ecom chỉ có ở Gracy), kiểm tra dữ liệu thật bằng `verify` hoặc đếm theo BST trước khi kết luận.
- `+record-list` / `+record-search` ghi file vào thư mục đang đứng. Luôn chạy trong scratchpad.

## 8. Lịch sử

| Tháng | BST | Task | Mã TSK | Ghi chú |
|---|---|---|---|---|
| 12.2026 | Tiệc 188, Life Style 178, Gracy 88 | 454 (260 link) | TSK11517–TSK11970 | Tạo 29/10/2026 theo đợt độ sâu (mã không liền chuỗi). 30/10/2026: 38 Edit ảnh đưa về 1.7, 222 task giữ +10 theo luật. Bổ sung 70 task Tripod mẫu Thắm (TSK11986–TSK12055): mỗi cụm Voice (mã × màu) thêm 1 cặp Quay → Edit Video Tripod, tên `… <mã> <màu> - Thắm`; Quay lấy số phút bằng Quay Voice, Edit theo 1.7; 35 Edit gắn Nền Tảng, sinh 74 bài 2.7. Bộ này tách riêng với Tripod theo look. Cùng ngày team xoá 26 task cấp BST (Teaser, Trailer, BTS, Comming Soon, Shop in Shop…). Cùng ngày: gắn Nền Tảng + Ngày Đăng Dự Kiến 02/12/2026 cho 172 task, sinh 314 bài 2.7 |
