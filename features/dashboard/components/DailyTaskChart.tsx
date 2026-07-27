import type { DailyTaskDatum } from "../model/types";
import { dateKey } from "@/shared/date/dateUtils";
import { formatDate } from "@/shared/formatting/format";
import { HelpButton } from "./HelpButton";

export function DailyTaskChart({
  rows,
  assignees,
  assignee,
  onAssigneeChange,
  onSelect,
}: {
  rows: DailyTaskDatum[];
  assignees: string[];
  assignee: string;
  onAssigneeChange: (value: string) => void;
  onSelect?: (
    type: "assigned" | "handedSameDay" | "handedBacklog" | "backlog",
    data: DailyTaskDatum,
  ) => void;
}) {
  const height = 480;
  const left = 48;
  const right = 24;
  const plotPadding = 24;
  const showsEveryDay = rows.length <= 31;
  const daySpacing = rows.length > 14 && showsEveryDay ? 58 : 42;
  const width = Math.max(
    860,
    left +
      right +
      plotPadding * 2 +
      Math.max(0, rows.length - 1) * daySpacing,
  );
  const plotWidth = width - left - right - plotPadding * 2;
  const flowTop = 30;
  const flowHeight = 180;
  const backlogTop = 300;
  const backlogHeight = 105;
  const rawFlowMax = Math.max(
    1,
    ...rows.flatMap((row) => [
      row.assigned,
      row.handedSameDay + row.handedBacklog,
    ]),
  );
  const flowMax = Math.max(1, Math.ceil(rawFlowMax * 1.15));
  const backlogValues = rows.map((row) => row.backlog);
  const rawBacklogMin = Math.min(...backlogValues);
  const rawBacklogMax = Math.max(...backlogValues);
  const backlogPadding = Math.max(2, Math.ceil((rawBacklogMax - rawBacklogMin) * 0.2));
  const backlogMin = Math.max(0, rawBacklogMin - backlogPadding);
  const backlogMax = Math.max(backlogMin + 1, rawBacklogMax + backlogPadding);
  const xFor = (index: number) =>
    left + plotPadding +
    (rows.length <= 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
  const backlogPoint = (value: number, index: number) => ({
    x: xFor(index),
    y:
      backlogTop +
      backlogHeight -
      ((value - backlogMin) / (backlogMax - backlogMin)) * backlogHeight,
  });
  const backlogPoints = rows
    .map((row, index) => {
      const position = backlogPoint(row.backlog, index);
      return `${position.x},${position.y}`;
    })
    .join(" ");
  const labelStep = showsEveryDay
    ? 1
    : Math.max(1, Math.ceil(rows.length / 31));

  return (
    <article className="chartCard fullWidth groupPeople dailyTaskCard">
      <div className="chartTitle dailyTaskHeader">
        <div>
          <span className="chartKicker">NHỊP CÔNG VIỆC THEO NGÀY</span>
          <h3>Task được giao, bàn giao &amp; tồn cuối ngày</h3>
        </div>
        <div className="dailyTaskControls">
          <label>
            <span>Nhân sự</span>
            <select
              value={assignee}
              onChange={(event) => onAssigneeChange(event.target.value)}
              aria-label="Lọc biểu đồ task theo nhân sự"
            >
              <option value="">Tất cả nhân sự</option>
              {assignees.map((name) => (
                <option value={name} key={name}>{name}</option>
              ))}
            </select>
          </label>
          <div className="dailyLegend">
            <span><i className="assigned" />Được giao</span>
            <span><i className="handedSameDay" />Bàn giao · Task trong ngày</span>
            <span><i className="handedBacklog" />Bàn giao · Xử lý task tồn</span>
            <span><i className="backlog" />Tồn cuối ngày</span>
          </div>
          <HelpButton
            help={{
              title: "Task theo ngày",
              purpose: "Theo dõi đồng thời lượng việc đi vào, lượng việc thoát ra và backlog cuối từng ngày.",
              objective: "Nếu đường tồn tăng liên tục trong khi số bàn giao thấp hơn số được giao, nhóm đang tích lũy quá tải.",
              calculation: "Được giao theo Ngày Bắt Đầu; bàn giao theo Ngày Kiểm Duyệt. Tồn cuối ngày được tính đến 23:59 của từng ngày, nên gồm cả task bắt đầu trong chính ngày đó nếu chưa kiểm duyệt và chưa Done; hoặc đã kiểm duyệt nhưng trạng thái hiện tại vẫn In Progress. Riêng đường Tồn cuối ngày không tính task có cột Outsource khác rỗng. Done và công đoạn Trainning không tính tồn.",
              example: "Task bắt đầu ngày 20/07 và cuối ngày vẫn chưa kiểm duyệt được tính vào Tồn cuối ngày 20/07, nhưng không thuộc KPI/Aging task tồn trước mốc 20/07.",
            }}
          />
        </div>
      </div>
      <div className="dailyChartScroller">
        {rows.length ? (
          <svg
            className="dailyChartSvg"
            viewBox={`0 0 ${width} ${height}`}
            style={{ minWidth: `${width}px` }}
            role="img"
            aria-label="Biểu đồ số task được giao, bàn giao và tồn cuối ngày"
          >
            <text className="dailyPanelLabel" x={left} y="14">LUỒNG TASK TRONG NGÀY</text>
            {[0, 0.5, 1].map((ratio) => {
              const y = flowTop + flowHeight - ratio * flowHeight;
              return (
                <g key={`flow-${ratio}`}>
                  <line className="dailyGridLine" x1={left} x2={width - right} y1={y} y2={y} />
                  <text className="dailyAxisText" x={left - 10} y={y + 4} textAnchor="end">
                    {Math.round(flowMax * ratio)}
                  </text>
                </g>
              );
            })}
            <line className="dailyPanelSeparator" x1={left} x2={width - right} y1="252" y2="252" />
            <text className="dailyPanelLabel" x={left} y="282">TỒN CUỐI NGÀY</text>
            {[0, 1].map((ratio) => {
              const y = backlogTop + backlogHeight - ratio * backlogHeight;
              return (
                <g key={`backlog-${ratio}`}>
                  <line className="dailyGridLine" x1={left} x2={width - right} y1={y} y2={y} />
                  <text className="dailyAxisText" x={left - 10} y={y + 4} textAnchor="end">
                    {Math.round(backlogMin + (backlogMax - backlogMin) * ratio)}
                  </text>
                </g>
              );
            })}
            <polyline className="dailyLine backlog" points={backlogPoints} />
            {rows.map((row, index) => {
              const x = xFor(index);
              const barWidth = Math.min(16, Math.max(7, plotWidth / Math.max(rows.length, 1) / 3));
              const barGap = 3;
              const assignedHeight = (row.assigned / flowMax) * flowHeight;
              const sameDayHeight = (row.handedSameDay / flowMax) * flowHeight;
              const handedBacklogHeight = (row.handedBacklog / flowMax) * flowHeight;
              const baseline = flowTop + flowHeight;
              const backlogPosition = backlogPoint(row.backlog, index);
              return (
                <g className="dailyPointGroup" key={dateKey(row.date)}>
                  <line className="dailyHoverGuide" x1={x} x2={x} y1={flowTop} y2={backlogTop + backlogHeight} />
                  <rect
                    className={`dailyAssignedBar ${onSelect ? "interactive" : ""}`}
                    style={onSelect ? { cursor: "pointer" } : undefined}
                    onClick={() => onSelect?.("assigned", row)}
                    x={x - barGap / 2 - barWidth}
                    y={baseline - assignedHeight}
                    width={barWidth}
                    height={assignedHeight}
                    rx="3"
                  />
                  <rect
                    className={`dailyHandoffBar handedSameDay ${onSelect ? "interactive" : ""}`}
                    style={onSelect ? { cursor: "pointer" } : undefined}
                    onClick={() => onSelect?.("handedSameDay", row)}
                    x={x + barGap / 2}
                    y={baseline - sameDayHeight}
                    width={barWidth}
                    height={sameDayHeight}
                    rx="3"
                  />
                  <rect
                    className={`dailyHandoffBar handedBacklog ${onSelect ? "interactive" : ""}`}
                    style={onSelect ? { cursor: "pointer" } : undefined}
                    onClick={() => onSelect?.("handedBacklog", row)}
                    x={x + barGap / 2}
                    y={baseline - sameDayHeight - handedBacklogHeight}
                    width={barWidth}
                    height={handedBacklogHeight}
                    rx="3"
                  />
                  <circle
                    className={`dailyPoint backlog ${onSelect ? "interactive" : ""}`}
                    style={onSelect ? { cursor: "pointer" } : undefined}
                    onClick={() => onSelect?.("backlog", row)}
                    cx={backlogPosition.x}
                    cy={backlogPosition.y}
                    r="4"
                  />
                  <title>
                    {formatDate(row.date)} · Được giao: {row.assigned} · Bàn giao: {row.handedSameDay + row.handedBacklog} (Task trong ngày: {row.handedSameDay}, Xử lý task tồn: {row.handedBacklog}) · Tồn cuối ngày: {row.backlog}
                  </title>
                  {(index % labelStep === 0 || index === rows.length - 1) && (
                    <text className="dailyAxisText" x={x} y={height - 18} textAnchor="middle">
                      {String(row.date.getDate()).padStart(2, "0")}/{String(row.date.getMonth() + 1).padStart(2, "0")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="emptyText">Chưa có dữ liệu ngày phù hợp.</p>
        )}
      </div>
    </article>
  );
}
