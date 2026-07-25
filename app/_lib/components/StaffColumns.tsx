import { HelpButton } from "./HelpButton";
import { dashboardHelp } from "../helpContent";

export function StaffColumns({
  rows,
  onSelect,
  className = "",
}: {
  rows: Array<{
    name: string;
    total: number;
    started: number;
    inspectionCarry: number;
    completionCarry: number;
    feedback: number;
  }>;
  onSelect?: (
    name: string,
    metric:
      | "total"
      | "started"
      | "inspectionCarry"
      | "completionCarry"
      | "feedback",
  ) => void;
  className?: string;
}) {
  const max = Math.max(
    ...rows.flatMap((row) => [
      row.total,
      row.started,
      row.inspectionCarry,
      row.completionCarry,
      row.feedback,
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
          <span><i className="c5" />Lần trả về</span>
          <HelpButton help={dashboardHelp("Số task thực hiện & số lần trả về")} />
        </div>
      </div>
      <div className="columnScroller">
        <div className="columnChart" style={{ minWidth: `${Math.max(780, rows.length * 94)}px` }}>
          {rows.map((row) => (
            <div className="columnGroup" key={row.name}>
              <div className="columns">
                {([
                  ["total", row.total],
                  ["started", row.started],
                  ["inspectionCarry", row.inspectionCarry],
                  ["completionCarry", row.completionCarry],
                  ["feedback", row.feedback],
                ] as const).map(([metric, value], index) => (
                  <button
                    type="button"
                    key={index}
                    className={`column c${index + 1}`}
                    style={{ height: `${Math.max(value ? 8 : 0, (value / max) * 220)}px` }}
                    title={`${value}`}
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
