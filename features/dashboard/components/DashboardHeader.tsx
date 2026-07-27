import type { RefObject } from "react";
import type { ReportDepartment } from "../model/types";

export type DashboardHeaderProps = {
  fileRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  hasData: boolean;
  reportDepartment: ReportDepartment | null;
  reportCounts: Record<ReportDepartment, number>;
  onToggleDepartment: (department: ReportDepartment) => void;
  onFileSelected: (file: File) => void;
};

export function DashboardHeader({
  fileRef,
  loading,
  hasData,
  reportDepartment,
  reportCounts,
  onToggleDepartment,
  onFileSelected,
}: DashboardHeaderProps) {
  return (
    <header className="dashboardHeader">
      <div className="dashboardBrand">
        <span>BB</span>
        <div>
          <strong>Operations Intelligence</strong>
          <small>Task performance dashboard</small>
        </div>
      </div>
      <nav className="reportNavigation" aria-label="Báo cáo theo phòng ban">
        <span>Báo cáo theo phòng ban</span>
        {(["media", "business"] as const).map((department) => (
          <button
            key={department}
            type="button"
            className={reportDepartment === department ? "active" : ""}
            onClick={() => onToggleDepartment(department)}
          >
            {department === "media" ? "Media" : "Kinh doanh"}
            <small>{reportCounts[department]}</small>
          </button>
        ))}
      </nav>
      <button
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
