import { useState } from "react";
import type { Task, StaffTimeOfDayRow } from "../types";
import { operationalDayLag, operationalMinute, percentile } from "../dateUtils";
import { formatOperationalTime } from "../format";
import { HelpButton } from "./HelpButton";

export function StaffTimeOfDayChart({
  rows,
  onSelect,
}: {
  rows: StaffTimeOfDayRow[];
  onSelect: (
    row: StaffTimeOfDayRow,
    metric: "inspection" | "completion",
    tasks: Task[],
    context: string,
  ) => void;
}) {
  const [metric, setMetric] = useState<"inspection" | "completion">("inspection");
  const [cohort, setCohort] = useState<"all" | "sameDay" | "backlog">("all");
  const [hoveredTimeMarker, setHoveredTimeMarker] = useState<{
    person: string;
    label: string;
  } | null>(null);
  const markers = [
    { label: "P1", ratio: 0.01, position: 0 },
    { label: "Q1", ratio: 0.25, position: 25 },
    { label: "P50", ratio: 0.5, position: 50 },
    { label: "Q3", ratio: 0.75, position: 70 },
    { label: "P90", ratio: 0.9, position: 86 },
    { label: "P100", ratio: 1, position: 100 },
  ];
  return (
    <article className="staffTimeCard">
      <div className="staffTimeHeader">
        <div>
          <span className="chartKicker">THỜI ĐIỂM LÀM VIỆC ĐIỂN HÌNH</span>
          <h3>Nhân sự thường bàn giao và hoàn thành task lúc mấy giờ?</h3>
          <p>Phân vị giờ–phút trên một ngày vận hành từ 08:30 đến 08:30 hôm sau.</p>
        </div>
        <div className="staffTimeLegend">
          <div className="staffTimeMetricSwitch">
            <button type="button" className={metric === "inspection" ? "active" : ""} onClick={() => setMetric("inspection")}>
              Giờ bàn giao
            </button>
            <button type="button" className={metric === "completion" ? "active" : ""} onClick={() => setMetric("completion")}>
              Giờ hoàn thành
            </button>
          </div>
          <div className="staffTimeCohortSwitch">
            <button type="button" className={cohort === "all" ? "active" : ""} onClick={() => setCohort("all")}>
              Tất cả
            </button>
            <button type="button" className={cohort === "sameDay" ? "active" : ""} onClick={() => setCohort("sameDay")}>
              Task trong ngày
            </button>
            <button type="button" className={cohort === "backlog" ? "active" : ""} onClick={() => setCohort("backlog")}>
              Xử lý task tồn
            </button>
          </div>
          <HelpButton
            help={{
              title: "Trung vị thời điểm bàn giao và hoàn thành",
              purpose: "Cho biết khung giờ mỗi nhân sự thường bàn giao và hoàn thành task.",
              objective: "Nhận diện xu hướng dồn bàn giao hoặc hoàn thành vào cuối ca để điều chỉnh nhịp kiểm duyệt.",
              calculation: "Chỉ lấy HH:mm của Ngày Kiểm Duyệt hoặc Ngày Hoàn Thành. Ngày vận hành bắt đầu lúc 08:30 và kết thúc lúc 08:30 hôm sau; sau đó tính P1, Q1, P50, Q3, P90 và P100 riêng cho từng nhân sự.",
              example: "23:00 đứng trước 02:00 hôm sau trên cùng một ngày vận hành; 02:00 được ghi là 02:00 +1.",
              note: "Số mẫu của hai mốc có thể khác nhau. Task nhiều assignee được đưa vào mẫu của từng người.",
            }}
          />
        </div>
      </div>
      <div className="staffTimeScale" aria-hidden="true">
        <span>Sớm nhất · P1</span>
        <span>Phân bố thời điểm của riêng từng nhân sự</span>
        <span>Muộn nhất · P100</span>
      </div>
      <div className="staffTimeRows">
        {rows.map((row) => {
          const allTasks = metric === "inspection" ? row.inspectionTasks : row.completionTasks;
          const dateFor = (task: Task) =>
            metric === "inspection" ? task.inspectionDate : task.completedDate;
          const tasks = allTasks.filter((task) => {
            const lag = operationalDayLag(task.startDate, dateFor(task));
            if (cohort === "sameDay") return lag === 0;
            if (cohort === "backlog") return lag !== null && lag > 0;
            return true;
          });
          const values = tasks
            .map(dateFor)
            .filter((value): value is Date => Boolean(value))
            .map(operationalMinute);
          const validLags = allTasks
            .map((task) => operationalDayLag(task.startDate, dateFor(task)))
            .filter((value): value is number => value !== null && value >= 0);
          const sameDayCount = validLags.filter((value) => value === 0).length;
          const backlogCount = validLags.filter((value) => value > 0).length;
          const medianLag = validLags.length ? percentile(validLags, 0.5) : null;
          const context = cohort === "sameDay"
            ? "Task trong ngày (D0)"
            : cohort === "backlog"
              ? "Xử lý task tồn (D+1 trở lên)"
              : "Tất cả task";
          const percentileMarkers = values.length
            ? markers.map((marker) => ({
                ...marker,
                value: percentile(values, marker.ratio),
              }))
            : [];
          const firstPosition = 0;
          const activeMarker =
            hoveredTimeMarker?.person === row.name
              ? percentileMarkers.find(
                  (marker) => marker.label === hoveredTimeMarker.label,
                )
              : null;
          const activePosition = activeMarker
            ? activeMarker.position
            : firstPosition;
          return (
          <div className="staffTimeRow percentileTimeRow" key={row.name}>
            <strong title={row.name}>{row.name}</strong>
            <div className="staffTimeTrack">
              {[25, 50, 75].map((position) => (
                <i className="staffTimeGrid" style={{ left: `${position}%` }} key={position} />
              ))}
              <i
                className={`staffTimeActiveRange ${activeMarker ? "active" : ""}`}
                style={{
                  left: `${firstPosition}%`,
                  width: `${Math.max(0, activePosition - firstPosition)}%`,
                }}
              />
              {percentileMarkers.map((marker) => (
                <button
                  type="button"
                  className={`staffTimeMarker ${metric} ${marker.label === "P50" ? "median" : ""} ${
                    activeMarker?.label === marker.label ? "active" : ""
                  }`}
                  style={{ left: `${marker.position}%` }}
                  title={`${marker.label}: ${formatOperationalTime(marker.value, true)} · ${tasks.length} task · ${context}`}
                  onClick={() => onSelect(row, metric, tasks, context)}
                  onMouseEnter={() =>
                    setHoveredTimeMarker({
                      person: row.name,
                      label: marker.label,
                    })
                  }
                  onMouseLeave={() => setHoveredTimeMarker(null)}
                  onFocus={() =>
                    setHoveredTimeMarker({
                      person: row.name,
                      label: marker.label,
                    })
                  }
                  onBlur={() => setHoveredTimeMarker(null)}
                  key={marker.label}
                >
                  <b>{formatOperationalTime(marker.value, true)}</b>
                  <small>{marker.label}</small>
                </button>
              ))}
            </div>
            <div className="staffTimeValues">
              <button type="button" onClick={() => onSelect(row, metric, tasks, context)}>
                <i className={metric} />
                <strong>P50 {values.length ? formatOperationalTime(percentile(values, 0.5), true) : "—"}</strong>
                <small>{tasks.length} task</small>
              </button>
              <span className="staffTimeContext">
                <b>{validLags.length ? `${Math.round((sameDayCount / validLags.length) * 100)}% D0` : "— D0"}</b>
                <small>{validLags.length ? `${Math.round((backlogCount / validLags.length) * 100)}% tồn · P50 D+${medianLag}` : "Thiếu mốc bắt đầu"}</small>
              </span>
            </div>
          </div>
          );
        })}
        {!rows.length && <p className="emptyText">Chưa có dữ liệu thời điểm phù hợp.</p>}
      </div>
    </article>
  );
}
