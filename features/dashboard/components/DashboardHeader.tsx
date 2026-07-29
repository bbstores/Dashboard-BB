import type { RefObject } from "react";
import type { ReportDepartment } from "../model/types";

export type DashboardHeaderProps = {
  fileRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  hasData: boolean;
  activeDepartment: ReportDepartment;
  comparisonActive: boolean;
  reportCounts: Record<ReportDepartment, number>;
  onDepartmentChange: (department: ReportDepartment) => void;
  onOpenComparison: () => void;
  onOpenSavedReports: (department: ReportDepartment) => void;
  onFileSelected: (file: File) => void;
};

export function DashboardHeader({
  fileRef,
  loading,
  hasData,
  activeDepartment,
  comparisonActive,
  reportCounts,
  onDepartmentChange,
  onOpenComparison,
  onOpenSavedReports,
  onFileSelected,
}: DashboardHeaderProps) {
  const departmentName =
    activeDepartment === "media" ? "Media" : "Kinh doanh";

  return (
    <header className="dashboardHeader">
      <div className="dashboardBrand">
        <span>BB</span>
        <div>
          <strong>Operations Intelligence</strong>
          <small>Task performance dashboard</small>
        </div>
      </div>
      <nav className="reportNavigation" aria-label="Dashboard theo phòng ban">
        <span>Phòng ban</span>
        {(["media", "business"] as const).map((department) => (
          <button
            key={department}
            type="button"
            className={
              !comparisonActive && activeDepartment === department
                ? "active"
                : ""
            }
            aria-pressed={
              !comparisonActive && activeDepartment === department
            }
            onClick={() => onDepartmentChange(department)}
          >
            {department === "media" ? "Media" : "Kinh doanh"}
          </button>
        ))}
        <button
          type="button"
          className={comparisonActive ? "active" : ""}
          aria-pressed={comparisonActive}
          onClick={onOpenComparison}
        >
          So sánh
        </button>
      </nav>
      {!comparisonActive && (
        <button
          type="button"
          className="savedReportsButton"
          aria-label={`Báo cáo đã lưu của ${departmentName}`}
          onClick={() => onOpenSavedReports(activeDepartment)}
        >
          Báo cáo đã lưu
          <small>{reportCounts[activeDepartment]}</small>
        </button>
      )}
      <button
        type="button"
        className="uploadButton"
        onClick={() => fileRef.current?.click()}
      >
        {loading
          ? "Đang đọc dữ liệu…"
          : hasData
            ? "Đổi file Excel"
            : "Chọn file Excel"}
      </button>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept=".xlsx"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
    </header>
  );
}
