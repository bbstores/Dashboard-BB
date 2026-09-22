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
    feedbackInternal: number;
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
      | "feedbackInternal"
      | "feedbackBod"
      | "feedbackBusiness",
  ) => void;
  className?: string;
}) {
  // Hai nhóm chỉ số có đơn vị khác nhau nên dùng hai thang riêng, nếu dùng
  // chung thì cột trả về luôn bị nén thành vạch không đọc được.
  const taskMax = Math.max(
    ...rows.flatMap((row) => [
      row.total,
      row.started,
      row.inspectionCarry,
      row.completionCarry,
    ]),
    1,
  );
  const feedbackMax = Math.max(
    ...rows.flatMap((row) => [
      row.feedbackInternal,
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
          <span><i className="c5" />Lead Trả Về</span>
          <span><i className="c6" />BOD Không Duyệt</span>
          <span><i className="c7" />Kinh Doanh Reject</span>
          <HelpButton help={dashboardHelp("Số task thực hiện & số lần trả về")} />
        </div>
      </div>
      <div className="columnScroller">
        <div className="columnChart" style={{ minWidth: `${Math.max(820, rows.length * 142)}px` }}>
          {rows.map((row) => (
            <div className="columnGroup" key={row.name}>
              <div className="columns">
                {([
                  ["total", row.total, "Tổng task", "task"],
                  ["started", row.started, "Bắt đầu trong kỳ", "task"],
                  ["inspectionCarry", row.inspectionCarry, "Carry-in bàn giao", "task"],
                  ["completionCarry", row.completionCarry, "Carry-in hoàn thành", "task"],
                  ["feedbackInternal", row.feedbackInternal, "Lead Trả Về", "feedback"],
                  ["feedbackBod", row.feedbackBod, "BOD Không Duyệt", "feedback"],
                  ["feedbackBusiness", row.feedbackBusiness, "Kinh Doanh Reject", "feedback"],
                ] as const).map(([metric, value, label, scale], index) => (
                  <button
                    type="button"
                    key={metric}
                    className={`column c${index + 1}`}
                    style={{
                      height: `${Math.max(
                        value ? 8 : 0,
                        (value / (scale === "task" ? taskMax : feedbackMax)) * 220,
                      )}px`,
                    }}
                    title={`${label}: ${value}${scale === "feedback" ? ` · thang riêng, cao nhất ${feedbackMax}` : ""}`}
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
