# Quy tắc link Task Phụ Thuộc — 2.6 Tasklist

Cập nhật: 24/10/2026. Nguồn: các quyết định đã chốt với user trong phiên ngày 23–24/10/2026.

Base: **BB Store: Quản lý Task - dự án**. `base_token` = `Gj7Mb9JNsaNjAbsTIA8lPWNOgwc`. Bảng 2.6 Tasklist = `tbl9EjPM6tBzpXDb`.

## 1. Ý nghĩa cột

- `Task Phụ Thuộc` là link hai chiều trong cùng bảng 2.6. **Task khâu sau link tới task khâu ngay trước** (link bậc thang). Không link nhảy bậc.
- Ví dụ: Edit link tới Quay, Quay link tới Content. Edit **không** link thẳng tới Content. Edit vẫn xem được Content qua cột công thức `Link Content` (mục 6).
- Riêng Caption là liên kết **song song**, không phải khâu phải chờ (mục 4).

## 2. Phạm vi và trạng thái

- Đang xử lý task **tạo hoặc bắt đầu từ 01/10/2026**. Task cũ hơn bổ sung dần sau, chỉ khi user yêu cầu.
- **Tính cả task `Skip`.** Skip nghĩa là task được bỏ qua bước kiểm duyệt của Hiếu, vẫn là task thật.
- Chỉ loại `Pending / Cancel`, `Archived` và trạng thái trống. Những task này không link và cũng không làm khâu trước.

## 3. Chuỗi khâu theo định dạng (Format Type, bảng 1.7 Định Mức)

| Định dạng | Chuỗi |
|---|---|
| Video Voice, Video Manơcanh, Video MKT Plan - Video Sales, Video Branding BST, Video Branding Thương Hiệu, Video Behind the Scene | Content → Quay → Edit |
| Video Trend, Video MV, Video Product, Video Tripod, Video feedback KH, Video Trailer, Comming Soon Video, Video Teaser | Quay → Edit |
| Ảnh có khâu Edit (Lookbook, 3D, Manơcanh, Product, feedback KH…) | Chụp → Edit → Graphic |
| Ảnh không có khâu Edit, Store Update | Chụp → Graphic |
| Ảnh Branding BST, Ảnh Branding Thương Hiệu | Content → Chụp → (Edit) → Graphic |
| Ảnh Post Social / Promotion | Content → Graphic nếu có task Content. Không có thì không link (dùng source có sẵn) |

Cách xác định ảnh có Edit hay không: nếu cùng nhóm (mục 5) **có task Edit** thì Graphic → Edit, không có thì Graphic → Chụp.

**Không có khâu trước, ô trống là đúng:**
- Chỉ có Graphic: Album Sản Phẩm (bài đầu / sửa hình chính), Popup Website / Banner, Template Layout BST, Graphic Ecom, Graphic Design, Graphic Product, Lighbox, Khung Sản Phẩm, Comming Soon Graphic.
- Chỉ có Edit: Xào Source, Video Youtube, Video LCD Cửa Hàng, Video Sample.
- Edit / Graphic của Ảnh Post Social khi không có task Content.
- Ảnh bổ sung Phương Khánh ("Edit Ảnh Lookbook Bổ Sung Phương Khánh …", TSK11084–11093) và "Lọc và chỉnh màu ảnh Lookbook Phương Khánh" (TSK11398).
- Video MV Phương Khánh ("Edit Video MV Phương Khánh …", TSK11128–11137): không có task Quay (user xác nhận 24/10/2026).
- Quay / Chụp là khâu đầu khi định dạng không có Content.

**Content không bắt buộc ở mọi màu:** màu phụ thường chỉ quay hoặc edit nhẹ, không phải key bán hàng, nên có thể không có task Content. Không có Content đúng màu thì **không link Content**. Không coi là thiếu, không dùng chung Content của màu khác.

## 4. Caption

- Mỗi ấn phẩm (Edit với video, Graphic với ảnh / post) có tối đa 1 task `Viết Caption`.
- Ấn phẩm link tới task Caption (như workflow 4.4 đang làm). Hai task làm song song, link chỉ để 2.7 Đăng Bài có sẵn caption.
- Ấn phẩm không có task Caption là bình thường. Caption mới tách khỏi Content gần đây, trước đó viết chung với Content.
- Deadline caption chưa tự động, để PM xử lý.
- Nếu làm automation "khâu trước xong thì báo khâu sau", **phải bỏ qua link Caption**.

## 5. Cách ghép tự động (theo thứ tự ưu tiên)

1. **Nhóm ứng viên theo khoá:**
   - Task từ Order MKT Plan: `Mã Tham Chiếu ORD MKT PLAN` (task MKT gần như không có Mã sản phẩm).
   - Task từ Order Lại: `Mã Tham Chiếu ORD Lại`.
   - Còn lại (BST, Khác): `Mã sản phẩm`.
   - Không có khoá nào: chỉ ghép theo tên giống hệt (bước 3).
2. Ứng viên phải đúng **Công đoạn khâu trước** và **cùng Format Type** (trừ Caption).
3. **Tên giống hệt sau khi bỏ chữ công đoạn ở đầu** (Edit / Quay / Chụp / Graphic + Resize (TikTok) / Viết Content…). Team đặt tên các khâu gần như giống nhau. Nhiều task trùng tên (quay lại) thì lấy task có **số mã gần nhất**.
4. **Task nhiều mã sản phẩm:** chỉ ghép với task có **đúng bộ mã** (Edit A,B ↔ Quay A,B).
5. **Mẫu và màu trong tên phải tương thích:** giống nhau, hoặc một bên chứa bên kia. Ví dụ "Edit DAL04A - Mai Chi" ← "Quay DAL04A Kem - Mai Chi" là được. "Phương Khánh" ← "Mai Chi" là **sai**. Kiểm tra này áp dụng cả khi chỉ có một ứng viên.
6. Tên khâu sau không ghi màu thì link **tất cả** buổi cùng mã + định dạng + mẫu. Ví dụ Graphic "DAL03A - Mai Chi" ← Edit Kem và Edit Đô.
7. Thiếu Format Type thì suy định dạng từ tên task, nhưng đưa vào danh sách **cần duyệt**, không tự ghi.
8. Không ghép được chắc chắn thì **không ghi**, liệt kê cho user quyết.

**Lỗi dữ liệu thường gặp, không tự sửa mà báo user:**
- Mã sản phẩm của task không khớp với tên. Ví dụ TSK9253 tên ghi CSA1454,V3609 nhưng cột Mã sản phẩm là VAH27A, CSA1454.
- Tên ghi mã chưa có trong 2.3 Product.SKU: AAL75B, AAL78A, AAK74V, QAG28A (có thể là QAG28H).
- Mã bị trùng trong 2.3: DAD21T, DAC21T, AAB05B, AAE01B, D4480B, D4546B, D4564B, DAB03A, DAC42B.
- Khoảng 17% task tạo từ 01/10 không có Mã sản phẩm (đa số do tài khoản Media Planner tạo).

Điền bù Mã sản phẩm: chỉ điền khi **mọi** mã đọc được từ tên đều khớp đúng một bản ghi trong 2.3 (cột `Mã SP`).

## 6. Các cột link (công thức, trong 2.6)

| Cột | Lấy gì | Công thức |
|---|---|---|
| `Link Content` | Link Thành Phẩm của task Viết Content, đi tối đa 3 bậc | `[2.6 Tasklist].FILTER(CurrentValue.[Công đoạn]="Viết Content" && LISTCOMBINE([Task Phụ Thuộc].[Công việc],[Task Phụ Thuộc].[Task Phụ Thuộc].[Công việc],[Task Phụ Thuộc].[Task Phụ Thuộc].[Task Phụ Thuộc].[Công việc]).CONTAIN(CurrentValue.[Công việc])).[Link Thành Phẩm].LISTCOMBINE().UNIQUE().ARRAYJOIN(" \| ")` |
| `Link Source` | Link Thành Phẩm của khâu trước trực tiếp là Quay / Chụp / Edit | `[2.6 Tasklist].FILTER((CurrentValue.[Công đoạn]="Quay" \|\| CurrentValue.[Công đoạn]="Chụp" \|\| CurrentValue.[Công đoạn]="Edit") && LISTCOMBINE([Task Phụ Thuộc].[Công việc]).CONTAIN(CurrentValue.[Công việc])).[Link Thành Phẩm].LISTCOMBINE().UNIQUE().ARRAYJOIN(" \| ")` |
| `Link Caption` | Link Thành Phẩm của task Viết Caption đã link | Giống `Link Source`, điều kiện `CurrentValue.[Công đoạn]="Viết Caption"` |
| `Link Input` | Gộp 3 cột trên thành các nhãn hyperlink đậm (𝐋𝐢𝐧𝐤 𝐂𝐨𝐧𝐭𝐞𝐧𝐭 / 𝐒𝐨𝐮𝐫𝐜𝐞 / 𝐂𝐚𝐩𝐭𝐢𝐨𝐧). Bấm nhãn để mở link | `LISTCOMBINE(SPLIT([Link Content]," \| ").FILTER(CurrentValue!="").MAP(HYPERLINK(CurrentValue,"𝐋𝐢𝐧𝐤 𝐂𝐨𝐧𝐭𝐞𝐧𝐭")), …Link Source…, …Link Caption…)` |

Giới hạn của Lark: một ô công thức chỉ trả về **chữ thường** hoặc **danh sách hyperlink** (nối bằng dấu phẩy), không trộn được. Không làm được kiểu "nhãn đậm không bấm + URL bấm được + xuống dòng" trong cùng một ô. Chữ đậm là ký tự Unicode, không phải định dạng.

`Link Input` trước đây là lookup lấy Link Thành Phẩm của **mọi** task phụ thuộc, nên bị lẫn link caption vào source. Không có workflow, cột nào khác hay dashboard dùng cột này.

## 7. Quy trình ghi an toàn qua Lark CLI

1. Quyền (scope) cần có: `base:record:update`, `base:history:read`. Sửa cột thì thêm `base:field:create`, `base:field:update`, `base:field:delete`.
2. Kéo dữ liệu mới nhất ngay trước khi ghi (`+record-list` 4 trang, mỗi trang 2000 dòng). Kiểm tra đủ số dòng, vì có lần một trang lỗi mà không báo.
3. **Gộp với link đang có.** Ghi link là thay cả ô, không cộng thêm.
4. Chụp trạng thái trước khi ghi: `Task Phụ Thuộc`, `Số phút dự kiến`, `2.7 Đăng Bài` của cả task khâu sau lẫn khâu trước.
5. `+record-batch-update`, tối đa 200 bản ghi mỗi lần.
6. Đợi khoảng 60 giây, đọc lại, đối chiếu: link đúng, số phút không đổi, bài 2.7 không đổi.
7. Hoàn tác bằng bản chụp nếu có sai.

**Workflow cần để ý** (cả ba chạy khi có cập nhật qua API):
- "Sync Up Đăng Bài - Task": tạo bài trong 2.7.
- "Workflow": ghi lại Số phút dự kiến.
- "Workflow 2": ghi lại Sai Số Phút.

Đã kiểm chứng: sửa `Task Phụ Thuộc`, `Tên Task` hoặc `Mã sản phẩm` của task **đã khớp điều kiện từ trước** thì các workflow kiểu "khi bản ghi khớp điều kiện" **không chạy lại**. Vẫn phải đối chiếu sau mỗi lô.

Không có workflow nào gắn với bảng 2.3 hay cột Mã sản phẩm.

## 8. Lỗi đã mắc, không lặp lại

- Coi `Skip` là task bị bỏ. Sai: Skip vẫn là task thật (mục 2).
- Chấp nhận ứng viên duy nhất mà không so mẫu/màu, nên nối ảnh "Bổ Sung Phương Khánh" vào Chụp của Mai Chi. Đã gỡ 6 link. Luôn kiểm tra mục 5.5.
- Bỏ sót task không có Mã sản phẩm và không có mã order. Cần ghép theo tên (mục 5.1).
- Lệnh `+record-get` / `+record-list` ghi file `.ndjson` vào thư mục đang đứng. Phải `cd` vào scratchpad trước, không để file rơi vào repo.

## 9. Việc còn mở (tại 24/10/2026)

- Đã xong 24/10/2026: link 11 task tạo trước 01/10 (TSK10581–10589, TSK9341, TSK8088, TSK9118, TSK9315, TSK10204, TSK10209); link TSK9464 ← TSK9463 và TSK10541 ← TSK10080. Tên hai task Edit này ghi nhầm màu (Kem thay cho Nude, Đỏ thay cho Đô).
- Đã xong 24/10/2026 (lô 2): link 133 task To Do chưa có Ngày Bắt Đầu (tên khớp, cùng nhóm, cùng Format Type), gồm cả task cũ hơn 01/10 theo yêu cầu user. Danh sách ở `link_plan.json` của phiên.
- Đã link 24/10/2026 (lô 3, user duyệt): 21 cặp tên lệch nhẹ: TSK8466–8470 ← TSK8568–8572 (Graphic ← Edit Feedback KH); TSK5017/5023/5029/5036/5042 ← TSK5016/5022/5028/5034/5041 (branding CCTH); TSK9796 ← TSK9795; TSK9792 ← TSK9791; TSK10372/10374/10380/10386 ← TSK10371/10373/10379/10385 ("Sản xuất Chụp Trước Gương"); TSK11116/11120/11124 ← TSK11117/11121/11125 (Store Update theo cặp tuần); TSK11451 ← TSK10552; TSK9800 ← TSK9799.
- Chờ user: Edit Video MV TSK11245/11246/11247/11249/11252/11255 ← Quay Video Trend cùng mã (khác định dạng); TSK9687 ← TSK9665 (khác bộ mã). Edit Feedback KH TSK8568–8572 không có task Chụp (có thể ảnh khách gửi).
- Đã link TSK9338 ← TSK10559 (tên Content thiếu chữ "Viết", user duyệt 24/10/2026).
- Bỏ qua theo quyết định của user: TSK9254, TSK9259 (tên/mã hai task Edit TSK9253, TSK9258 bị lệch chéo). Không link.
- Các ca tên lệch chờ duyệt: TSK10557 ← TSK10553; TSK9799 ← TSK9798; TSK9809 và TSK11451 ← TSK10552; TSK9687 ← TSK9665.
- Store Update hằng tuần và Feedback KH (Hồ Liên): có quay/chụp thật hay dùng source có sẵn?
- Sửa dữ liệu TSK9253; thêm AAL75B / AAL78A / AAK74V vào 2.3; gộp các mã trùng trong 2.3.
