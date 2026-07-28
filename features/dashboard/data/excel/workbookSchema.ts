export const DASHBOARD_SHEETS = {
  tasks: "2.6 Tasklist",
  publications: "2.7 Đăng Bài",
  feedback: "2.9 Lịch sử phản hồi Task",
  norms: "1.7 Định Mức",
  costs: "2.8 Đề xuất chi phí",
  collections: "2.1 Bộ Sưu Tập",
  products: "2.3 Product.SKU",
  shoots: "2.11 Lịch Quay",
} as const;

export const COST_COLUMNS = {
  id: "Tên khoản chi",
  approvalLink: "Link Approval",
  title: "Tên Khoản Chi",
  collections: "Bộ Sưu Tập",
  shoots: "Thuộc Ca Quay Nào",
  products: "Thuộc SKU nào",
  tasks: "Thuộc Task Nào",
  unitAmount: "Thành Tiền / Đơn vị",
  status: "Trạng thái thanh toán",
} as const;

export const COST_LINK_COLUMNS = {
  collectionId: "ID",
  shootId: "Mã Ca Quay",
  productId: "Mã SP",
  tasks: "2.6 Tasklist",
} as const;

export const TASK_COLUMNS = {
  code: "Công việc",
  title: "Tên Task",
  stage: "Công đoạn",
  formatType: "Format Type",
  productCode: "Mã sản phẩm",
  collection: "Bộ Sưu Tập",
  expectedMinutes: "Số phút dự kiến",
  status: "Trạng thái",
  assignee: "Assignee",
  startDate: "Ngày Bắt Đầu",
  completedDate: "Ngày Hoàn Thành",
  inspectionDate: "Ngày Kiểm Duyệt",
  receivedStartDate: "Thời Gian Bắt Đầu Nhận Task",
  businessApprovalDate: "Ngày Kinh Doanh Duyệt",
  handoffRating: "Đánh Giá Bàn Giao",
  overallRating: "Đánh Giá Tổng",
  type: "Type",
  outsource: "Outsource",
  publicationIds: "2.7 Đăng Bài",
  platform: "Nền Tảng",
} as const;

export const FEEDBACK_COLUMNS = {
  taskCode: "Task",
  at: "Thời Điểm",
  assignee: "Người Làm Task",
} as const;

export const PUBLICATION_COLUMNS = {
  id: "ID Task",
  scheduledAt: "Ngày Đăng",
  platform: "Nền Tảng",
  posted: "Đã Đăng",
  postType: "Loại Bài Đăng",
  title: "Tên Bài Đăng",
  bookTaskCode: "Book Task",
} as const;

export const NORM_COLUMNS = {
  formatType: "Tên Định Dạng",
  recordMinutes: "Thời gian Record (Phút)",
  editMinutes: "Thời gian Edit (Phút)",
  graphicMinutes: "Thời gian Graphic",
  contentMinutes: "Thời gian Viết Content",
} as const;

export const TASK_REQUIRED_HEADERS = Object.values(TASK_COLUMNS).filter(
  (header) => header !== TASK_COLUMNS.receivedStartDate,
);
export const FEEDBACK_REQUIRED_HEADERS = Object.values(FEEDBACK_COLUMNS);
export const PUBLICATION_REQUIRED_HEADERS = Object.values(
  PUBLICATION_COLUMNS,
);
export const NORM_REQUIRED_HEADERS = Object.values(NORM_COLUMNS);
