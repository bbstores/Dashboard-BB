import type { Task } from "../model/types";
import { HelpButton } from "./HelpButton";
import { dashboardHelp } from "../help/helpContent";

export function StaffColumns({
  rows,
  onSelect,
  className = "",
}: {
  rows: Array<{
    name: string;
    total: number;
    totalTasks?: Task[];
    started: number;
    startedTasks?: Task[];
    inspectionCarry: number;
    inspectionCarryTasks?: Task[];
    completionCarry: number;
    completionCarryTasks?: Task[];
    feedback: number;
    feedbackHieu: number;
    feedbackLead: number;
    feedbackBod: number;
    feedbackBusiness: number;
  }>;
  onSelect?: (
    name: string,
    metric:
      | "total"
      | "started"
      | "inspectionCarry"
      | "completionCarry"
      | "feedbackHieu"
      | "feedbackLead"
      | "feedbackBod"
      | "feedbackBusiness",
  ) => void;
  className?: string;
}) {
  // Một thang đo duy nhất cho cả tám cột. Thang riêng cho nhóm trả về từng làm
  // cột trả về vẽ cao hơn cột tổng task, khiến người lướt qua hiểu nhầm là
  // nhân sự bị trả về nhiều hơn số task đã làm.
  const max = Math.max(
    ...rows.flatMap((row) => [
      row.total,
      row.started,
      row.inspectionCarry,
      row.completionCarry,
      row.feedbackHieu,
      row.feedbackLead,
      row.feedbackBod,
      row.feedbackBusiness,
    ]),
    1,
  );
  return (
    <article className={`chartCard fullWidth ${className}`}>
      <div className="chartTitle">
        <div>
          <span className="chartKicker">NHÂN SỰ</span>
          <h3>Số task thực hiện &amp; số lần trả về</h3>
        </div>
        <div className="columnLegend">
          <span><i className="c1" />Tổng task</span>
          <span><i className="c2" />Bắt đầu trong kỳ</span>
          <span><i className="c3" />Carry-in bàn giao</span>
          <span><i className="c4" />Carry-in hoàn thành</span>
          <span><i className="c8" />Hiếu Trả Về</span>
          <span><i className="c5" />Lead Trả Về</span>
          <span><i className="c7" />Kinh Doanh Reject</span>
          <span><i className="c6" />BOD Không Duyệt</span>
          <HelpButton help={dashboardHelp("Số task thực hiện & số lần trả về")} />
        </div>
      </div>
      <div className="columnScroller">
        <div className="columnChart" style={{ minWidth: `${Math.max(820, rows.length * 142)}px` }}>
          {rows.map((row) => (
            <div className="columnGroup" key={row.name}>
              <div className="columns">
                {([
                  ["total", row.total, "Tổng task", "c1"],
                  ["started", row.started, "Bắt đầu trong kỳ", "c2"],
                  ["inspectionCarry", row.inspectionCarry, "Carry-in bàn giao", "c3"],
                  ["completionCarry", row.completionCarry, "Carry-in hoàn thành", "c4"],
                  ["feedbackHieu", row.feedbackHieu, "Hiếu Trả Về", "c8"],
                  ["feedbackLead", row.feedbackLead, "Lead Trả Về", "c5"],
                  ["feedbackBusiness", row.feedbackBusiness, "Kinh Doanh Reject", "c7"],
                  ["feedbackBod", row.feedbackBod, "BOD Không Duyệt", "c6"],
                ] as const).map(([metric, value, label, colorClass]) => (
                  <button
                    type="button"
                    key={metric}
                    className={`column ${colorClass}`}
                    style={{
                      height: `${Math.max(value ? 4 : 0, (value / max) * 220)}px`,
                    }}
                    title={`${label}: ${value}`}
                    aria-label={`${label} của ${row.name}: ${value}`}
                    onClick={() => onSelect?.(row.name, metric)}
                  >
                    {value > 0 && <span>{value}</span>}
                  </button>
                ))}
              </div>
              <span className="columnName" title={row.name}>{row.name}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
