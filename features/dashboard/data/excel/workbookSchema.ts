export const DASHBOARD_SHEETS = {
  tasks: "2.6 Tasklist",
  feedback: "2.9 Lịch sử phản hồi Task",
  norms: "1.7 Định Mức",
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
} as const;

export const FEEDBACK_COLUMNS = {
  taskCode: "Task",
  at: "Thời Điểm",
  assignee: "Người Làm Task",
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
export const NORM_REQUIRED_HEADERS = Object.values(NORM_COLUMNS);
