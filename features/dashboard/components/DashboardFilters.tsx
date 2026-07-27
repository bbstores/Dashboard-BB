import type { ReportDepartment } from "../model/types";

export type DashboardFiltersProps = {
  dateFrom: string;
  dateTo: string;
  backlogDate: string;
  hasDateFilter: boolean;
  department: ReportDepartment;
  showBacklogDate?: boolean;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onBacklogDateChange: (value: string) => void;
  onClearDateFilter: () => void;
  onOpenSaveReport: (department: ReportDepartment) => void;
};

export function DashboardFilters({
  dateFrom,
  dateTo,
  backlogDate,
  hasDateFilter,
  department,
  showBacklogDate = true,
  onDateFromChange,
  onDateToChange,
  onBacklogDateChange,
  onClearDateFilter,
  onOpenSaveReport,
}: DashboardFiltersProps) {
  return (
    <section className="filterBar">
      <div className="filterIntro">
        <span className="chartKicker">BỘ LỌC CHUNG</span>
        <strong>
          {hasDateFilter ? "Khoảng thời gian tùy chọn" : "Toàn bộ dữ liệu"}
        </strong>
      </div>
      <label>
        Từ ngày
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
        />
      </label>
      <span className="filterArrow">→</span>
      <label>
        Đến ngày
        <input
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
        />
      </label>
      {showBacklogDate && (
        <label className="backlogFilter">
          Mốc task tồn
          <input
            type="date"
            value={backlogDate}
            onChange={(event) => onBacklogDateChange(event.target.value)}
          />
          <small>Độc lập · mặc định hôm nay</small>
        </label>
      )}
      <button
        className="clearButton"
        disabled={!hasDateFilter}
        onClick={onClearDateFilter}
      >
        Xóa lọc
      </button>
      <button
        type="button"
        className="saveReportButton"
        onClick={() => onOpenSaveReport(department)}
      >
        <span>＋</span> Lưu báo cáo
      </button>
    </section>
  );
}
