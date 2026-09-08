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
      | "feedbackBusiness",
  ) => void;
  className?: string;
}) {
  const max = Math.max(
    ...rows.flatMap((row) => [
      row.total,
      row.started,
      row.inspectionCarry,
      row.completionCarry,
      row.feedbackInternal,
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
          <span><i className="c5" />Nội Bộ Trả Về</span>
          <span><i className="c6" />Team Kinh Doanh Trả Về</span>
          <HelpButton help={dashboardHelp("Số task thực hiện & số lần trả về")} />
        </div>
      </div>
      <div className="columnScroller">
        <div className="columnChart" style={{ minWidth: `${Math.max(780, rows.length * 124)}px` }}>
          {rows.map((row) => (
            <div className="columnGroup" key={row.name}>
              <div className="columns">
                {([
                  ["total", row.total, "Tổng task"],
                  ["started", row.started, "Bắt đầu trong kỳ"],
                  ["inspectionCarry", row.inspectionCarry, "Carry-in bàn giao"],
                  ["completionCarry", row.completionCarry, "Carry-in hoàn thành"],
                  ["feedbackInternal", row.feedbackInternal, "Nội Bộ Trả Về"],
                  ["feedbackBusiness", row.feedbackBusiness, "Team Kinh Doanh Trả Về"],
                ] as const).map(([metric, value, label], index) => (
                  <button
                    type="button"
                    key={metric}
                    className={`column c${index + 1}`}
                    style={{ height: `${Math.max(value ? 8 : 0, (value / max) * 220)}px` }}
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
