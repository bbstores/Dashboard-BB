import type { FormEvent } from "react";
import type { ReportDepartment } from "../model/types";

export type SaveReportDialogProps = {
  reportName: string;
  department: ReportDepartment;
  onReportNameChange: (value: string) => void;
  onDepartmentChange: (department: ReportDepartment) => void;
  onClose: () => void;
  onSave: () => void;
};

export function SaveReportDialog({
  reportName,
  department,
  onReportNameChange,
  onDepartmentChange,
  onClose,
  onSave,
}: SaveReportDialogProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave();
  }

  return (
    <div
      className="saveReportOverlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="saveReportModal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <span className="chartKicker">LƯU CẤU HÌNH HIỆN TẠI</span>
        <h2>Đặt tên báo cáo</h2>
        <p>
          Bộ lọc và các tùy chọn biểu đồ hiện tại sẽ được lưu trên thiết bị
          này.
        </p>
        <label>
          Tên báo cáo
          <input
            autoFocus
            required
            maxLength={80}
            value={reportName}
            onChange={(event) => onReportNameChange(event.target.value)}
            placeholder="Ví dụ: Báo cáo Media tuần 30"
          />
        </label>
        <fieldset>
          <legend>Phòng ban</legend>
          {(["media", "business"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={department === value ? "active" : ""}
              onClick={() => onDepartmentChange(value)}
            >
              {value === "media" ? "Media" : "Kinh doanh"}
            </button>
          ))}
        </fieldset>
        <div className="saveReportActions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" disabled={!reportName.trim()}>
            Lưu báo cáo
          </button>
        </div>
      </form>
    </div>
  );
}
