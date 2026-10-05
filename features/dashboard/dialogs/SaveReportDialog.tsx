import { useState, type FormEvent } from "react";
import type { ReportDepartment } from "../model/types";

export type SaveReportDialogProps = {
  department: ReportDepartment;
  onDepartmentChange: (department: ReportDepartment) => void;
  onClose: () => void;
  onSave: (reportName: string) => void;
};

export function SaveReportDialog({
  department,
  onDepartmentChange,
  onClose,
  onSave,
}: SaveReportDialogProps) {
  // Giữ tên báo cáo trong state cục bộ: nếu đặt ở Dashboard, mỗi phím gõ sẽ
  // render lại toàn bộ dashboard và gây trễ khi nhập.
  const [reportName, setReportName] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(reportName);
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
            onChange={(event) => setReportName(event.target.value)}
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
