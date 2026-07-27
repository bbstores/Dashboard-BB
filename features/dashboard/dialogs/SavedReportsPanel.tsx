import type {
  ReportDepartment,
  SavedReport,
} from "../model/types";

export type SavedReportsPanelProps = {
  department: ReportDepartment;
  reports: SavedReport[];
  onClose: () => void;
  onApply: (report: SavedReport) => void;
  onDelete: (id: string) => void;
};

export function SavedReportsPanel({
  department,
  reports,
  onClose,
  onApply,
  onDelete,
}: SavedReportsPanelProps) {
  const departmentReports = reports.filter(
    (report) => report.department === department,
  );
  const departmentName =
    department === "media" ? "Media" : "Kinh doanh";

  return (
    <div
      className="reportPanelOverlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        className="reportPanel"
        role="dialog"
        aria-modal="true"
        aria-label={`Báo cáo ${departmentName}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="chartKicker">BÁO CÁO THEO PHÒNG BAN</span>
            <h2>{departmentName}</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="savedReportList">
          {departmentReports.length ? (
            departmentReports.map((report) => (
              <article className="savedReportItem" key={report.id}>
                <button type="button" onClick={() => onApply(report)}>
                  <strong>{report.name}</strong>
                  <span>
                    {report.filters.dateFrom || report.filters.dateTo
                      ? `${report.filters.dateFrom || "Đầu kỳ"} → ${report.filters.dateTo || "Hiện tại"}`
                      : "Toàn bộ thời gian"}
                  </span>
                  <small>
                    Đã lưu{" "}
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(report.createdAt))}
                  </small>
                </button>
                <button
                  type="button"
                  className="deleteReportButton"
                  aria-label={`Xóa báo cáo ${report.name}`}
                  onClick={() => onDelete(report.id)}
                >
                  ×
                </button>
              </article>
            ))
          ) : (
            <div className="savedReportEmpty">
              <span>◎</span>
              <strong>Chưa có báo cáo đã lưu</strong>
              <p>
                Thiết lập bộ lọc rồi chọn &quot;Lưu báo cáo&quot; để thêm vào
                đây.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
