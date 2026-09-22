import { useState } from "react";
import type { Task, StaffTimeOfDayRow } from "../model/types";
import {
  operationalDayLag,
  operationalMinute,
  percentile,
  percentileOf,
} from "@/shared/date/dateUtils";
import { formatOperationalTime } from "@/shared/formatting/format";
import { HelpButton } from "./HelpButton";

type Cohort = "all" | "sameDay" | "backlog";
type Metric = "inspection" | "completion";

type RowSummary = {
  row: StaffTimeOfDayRow;
  tasks: Task[];
  p1: number;
  q1: number;
  p50: number;
  q3: number;
  p90: number;
  p100: number;
  sameDayShare: number | null;
  backlogShare: number | null;
  medianLag: number | null;
};

const AXIS_MIN_SPAN = 240;
const TICK_STEP = 120;

function cohortLabel(cohort: Cohort) {
  if (cohort === "sameDay") return "Task trong ngày (D0)";
  if (cohort === "backlog") return "Xử lý task tồn (D+1 trở lên)";
  return "Tất cả task";
}

export function StaffTimeOfDayChart({
  rows,
  onSelect,
}: {
  rows: StaffTimeOfDayRow[];
  onSelect: (
    row: StaffTimeOfDayRow,
    metric: Metric,
    tasks: Task[],
    context: string,
  ) => void;
}) {
  const [metric, setMetric] = useState<Metric>("inspection");
  const [cohort, setCohort] = useState<Cohort>("all");
  const [openRow, setOpenRow] = useState<string | null>(null);

  const dateFor = (task: Task) =>
    metric === "inspection" ? task.inspectionDate : task.completedDate;

  const summaries = rows.flatMap<RowSummary>((row) => {
    const allTasks =
      metric === "inspection" ? row.inspectionTasks : row.completionTasks;
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
    if (!values.length) return [];

    const validLags = allTasks
      .map((task) => operationalDayLag(task.startDate, dateFor(task)))
      .filter((value): value is number => value !== null && value >= 0);
    return [
      {
        row,
        tasks,
        p1: percentile(values, 0.01),
        q1: percentile(values, 0.25),
        p50: percentile(values, 0.5),
        q3: percentile(values, 0.75),
        p90: percentile(values, 0.9),
        p100: percentile(values, 1),
        sameDayShare: validLags.length
          ? (validLags.filter((value) => value === 0).length /
              validLags.length) *
            100
          : null,
        backlogShare: validLags.length
          ? (validLags.filter((value) => value > 0).length /
              validLags.length) *
            100
          : null,
        medianLag: percentileOf(validLags, 0.5),
      },
    ];
  });

  // Trục giờ dùng chung cho mọi nhân sự — đây là điều kiện để so sánh được
  // giữa người với người; nếu mỗi hàng tự chuẩn hoá thì hình vẽ vô nghĩa.
  const observed = summaries.flatMap((item) => [item.p1, item.p100]);
  const rawMin = observed.length ? Math.min(...observed) : 0;
  const rawMax = observed.length ? Math.max(...observed) : AXIS_MIN_SPAN;
  const axisMin = Math.floor(rawMin / 60) * 60;
  const axisMax = Math.max(
    axisMin + AXIS_MIN_SPAN,
    Math.ceil(rawMax / 60) * 60,
  );
  const axisSpan = axisMax - axisMin;
  const positionFor = (value: number) =>
    ((value - axisMin) / axisSpan) * 100;
  const ticks = Array.from(
    { length: Math.floor(axisSpan / TICK_STEP) + 1 },
    (_, index) => axisMin + index * TICK_STEP,
  );
  const context = cohortLabel(cohort);

  return (
    <article className="staffTimeCard">
      <div className="staffTimeHeader">
        <div>
          <span className="chartKicker">THỜI ĐIỂM LÀM VIỆC ĐIỂN HÌNH</span>
          <h3>Nhân sự thường bàn giao và hoàn thành task lúc mấy giờ?</h3>
          <p>
            Trục ngang là giờ thật trên một ngày vận hành 08:30–08:30 hôm sau,
            dùng chung cho mọi nhân sự. Hộp là Q1–Q3, vạch đậm là P50, râu là
            P1–P100.
          </p>
        </div>
        <div className="staffTimeLegend">
          <div className="staffTimeMetricSwitch">
            <button
              type="button"
              className={metric === "inspection" ? "active" : ""}
              onClick={() => setMetric("inspection")}
            >
              Giờ bàn giao
            </button>
            <button
              type="button"
              className={metric === "completion" ? "active" : ""}
              onClick={() => setMetric("completion")}
            >
              Giờ hoàn thành
            </button>
          </div>
          <div className="staffTimeCohortSwitch">
            {(
              [
                ["all", "Tất cả"],
                ["sameDay", "Task trong ngày"],
                ["backlog", "Xử lý task tồn"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={cohort === value ? "active" : ""}
                onClick={() => setCohort(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <HelpButton
            help={{
              title: "Phân bố thời điểm bàn giao và hoàn thành",
              purpose:
                "Cho biết khung giờ mỗi nhân sự thường bàn giao và hoàn thành task.",
              objective:
                "Nhận diện xu hướng dồn bàn giao hoặc hoàn thành vào cuối ca để điều chỉnh nhịp kiểm duyệt.",
              calculation:
                "Chỉ lấy HH:mm của Ngày Kiểm Duyệt hoặc Ngày Hoàn Thành. Ngày vận hành bắt đầu 08:30 và kết thúc 08:30 hôm sau. Mỗi hàng là một box plot: râu P1–P100, hộp Q1–Q3, vạch P50. Trục dùng chung nên vị trí hộp so sánh được giữa các nhân sự.",
              example:
                "23:00 đứng trước 02:00 hôm sau trên cùng một ngày vận hành; 02:00 được ghi là 02:00 +1.",
              note: "Số mẫu của hai mốc có thể khác nhau. Task nhiều assignee được đưa vào mẫu của từng người. Tỷ lệ D0 và task tồn tính trên toàn bộ mẫu của nhân sự, không theo cohort đang chọn.",
            }}
          />
        </div>
      </div>

      <div className="staffTimeAxis" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} style={{ left: `${positionFor(tick)}%` }}>
            {formatOperationalTime(tick, true)}
          </span>
        ))}
      </div>

      <div className="staffTimeRows">
        {summaries.map((item) => {
          const isOpen = openRow === item.row.name;
          return (
            <div className="staffTimeRow" key={item.row.name}>
              <strong title={item.row.name}>{item.row.name}</strong>
              <button
                type="button"
                className="staffTimeTrack"
                aria-label={`${item.row.name} · ${metric === "inspection" ? "giờ bàn giao" : "giờ hoàn thành"} P50 ${formatOperationalTime(item.p50, true)} · ${item.tasks.length} task · ${context}`}
                onClick={() => {
                  setOpenRow(isOpen ? null : item.row.name);
                  onSelect(item.row, metric, item.tasks, context);
                }}
                onMouseEnter={() => setOpenRow(item.row.name)}
                onMouseLeave={() => setOpenRow(null)}
                onFocus={() => setOpenRow(item.row.name)}
                onBlur={() => setOpenRow(null)}
              >
                {ticks.map((tick) => (
                  <i
                    className="staffTimeGrid"
                    style={{ left: `${positionFor(tick)}%` }}
                    key={tick}
                  />
                ))}
                <i
                  className="staffTimeWhisker"
                  style={{
                    left: `${positionFor(item.p1)}%`,
                    width: `${positionFor(item.p100) - positionFor(item.p1)}%`,
                  }}
                />
                <i
                  className={`staffTimeBox ${metric}`}
                  style={{
                    left: `${positionFor(item.q1)}%`,
                    width: `${Math.max(0.6, positionFor(item.q3) - positionFor(item.q1))}%`,
                  }}
                />
                <i
                  className="staffTimeP90"
                  style={{ left: `${positionFor(item.p90)}%` }}
                />
                <i
                  className="staffTimeMedian"
                  style={{ left: `${positionFor(item.p50)}%` }}
                />
                <b
                  className="staffTimeMedianLabel"
                  style={{ left: `${positionFor(item.p50)}%` }}
                >
                  {formatOperationalTime(item.p50, true)}
                </b>
                {isOpen && (
                  <span className="staffTimeTip" role="tooltip">
                    {(
                      [
                        ["P1", item.p1],
                        ["Q1", item.q1],
                        ["P50", item.p50],
                        ["Q3", item.q3],
                        ["P90", item.p90],
                        ["P100", item.p100],
                      ] as const
                    ).map(([label, value]) => (
                      <span key={label}>
                        <small>{label}</small>
                        <b>{formatOperationalTime(value, true)}</b>
                      </span>
                    ))}
                  </span>
                )}
              </button>
              <div className="staffTimeValues">
                <button
                  type="button"
                  onClick={() =>
                    onSelect(item.row, metric, item.tasks, context)
                  }
                >
                  <i className={metric} />
                  <strong>
                    P50 {formatOperationalTime(item.p50, true)}
                  </strong>
                  <small>{item.tasks.length} task</small>
                </button>
                <span className="staffTimeContext">
                  <b>
                    {item.sameDayShare === null
                      ? "— D0"
                      : `${Math.round(item.sameDayShare)}% D0`}
                  </b>
                  <small>
                    {item.backlogShare === null || item.medianLag === null
                      ? "Thiếu mốc bắt đầu"
                      : `${Math.round(item.backlogShare)}% tồn · P50 D+${item.medianLag}`}
                  </small>
                </span>
              </div>
            </div>
          );
        })}
        {!summaries.length && (
          <p className="emptyText">Chưa có dữ liệu thời điểm phù hợp.</p>
        )}
      </div>
    </article>
  );
}
