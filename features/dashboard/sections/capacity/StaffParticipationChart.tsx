import { useMemo, useState } from "react";
import { formatDate, formatNumber } from "@/shared/formatting/format";
import { calculateShootTaskMinutesByStaff } from "../../analytics/calculateMediaCapacity";
import { HelpButton } from "../../components/HelpButton";
import type { ShootSession, Task } from "../../model/types";
import { capacityHelp } from "./capacityHelp";
import { formatMetric } from "./capacityFormat";

const staffParticipationColors = [
  "#d9ff72",
  "#9bcbbb",
  "#fff4d0",
  "#f3b562",
  "#e89284",
  "#aab7ff",
  "#d7a9e3",
  "#79d4c2",
];

export function StaffParticipationChart({
  sessions,
  tasks,
  dateFrom,
  dateTo,
  onSelectPoint,
}: {
  sessions: ShootSession[];
  tasks: Task[];
  dateFrom: Date | null;
  dateTo: Date | null;
  onSelectPoint: (
    staffName: string,
    session: ShootSession,
    tasks: Task[],
    minutes: number,
  ) => void;
}) {
  const [excludedSessionIds, setExcludedSessionIds] = useState<string[]>([]);
  const [hiddenStaffNames, setHiddenStaffNames] = useState<string[]>([]);
  const sessionWorkloads = useMemo(
    () => calculateShootTaskMinutesByStaff(sessions, tasks),
    [sessions, tasks],
  );
  const selectedWorkloads = sessionWorkloads.filter(
    (row) => !excludedSessionIds.includes(row.session.id),
  );
  const selectedSessions = selectedWorkloads.map((row) => row.session);
  const staffNames = Array.from(
    new Map(
      selectedWorkloads.flatMap((workload) =>
        workload.staffRows.map((row) => [
          row.staffName.toLocaleLowerCase("vi"),
          row.staffName,
        ]),
      ),
    ).values(),
  ).sort((left, right) => left.localeCompare(right, "vi"));
  const activeStaffNames = staffNames.filter(
    (staffName) => !hiddenStaffNames.includes(staffName),
  );
  const groupWidth = Math.max(
    180,
    activeStaffNames.length * 44 + 36,
  );
  const chartWidth = Math.max(
    860,
    84 + selectedSessions.length * groupWidth,
  );
  const chartHeight = 390;
  const plot = { left: 60, right: chartWidth - 24, top: 24, bottom: 310 };
  const maxMinutes = Math.max(
    60,
    ...selectedWorkloads.flatMap((workload) =>
      workload.staffRows.map((row) => row.minutes),
    ),
  );
  const yMax = Math.max(60, Math.ceil(maxMinutes / 60) * 60);
  const yTicks = Array.from({ length: 5 }, (_, index) => (yMax / 4) * index);
  const plotWidth = plot.right - plot.left;
  const sessionSlotWidth = plotWidth / Math.max(1, selectedSessions.length);
  const xFor = (index: number) =>
    plot.left + sessionSlotWidth * (index + 0.5);
  const yFor = (minutes: number) =>
    plot.bottom - (minutes / yMax) * (plot.bottom - plot.top);
  const barWidth = 28;
  const barGap = 14;
  const barGroupWidth = activeStaffNames.length
    ? activeStaffNames.length * barWidth +
      (activeStaffNames.length - 1) * barGap
    : 0;
  const barXFor = (sessionIndex: number, staffIndex: number) =>
    xFor(sessionIndex) - barGroupWidth / 2 +
    staffIndex * (barWidth + barGap);
  const selectedCount = selectedSessions.length;

  return (
    <article className="capacityStaffContributionCard">
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">ASSIGNEE / OUTSOURCE × CA QUAY</span>
          <h3>Thời gian tham gia theo từng ca quay</h3>
          <p>
            {formatDate(dateFrom)}–{formatDate(dateTo)} · cộng phút dự kiến
            của task liên kết theo Outsource nếu có, nếu không theo Assignee · đơn vị phút
          </p>
        </div>
        <div className="capacityStaffContributionTools">
          <details className="capacitySessionDropdown">
            <summary>
              Ca quay · {formatNumber(selectedCount)}/
              {formatNumber(sessions.length)}
            </summary>
            <div>
              <span>CHỌN CA HIỂN THỊ</span>
              <div className="capacitySessionDropdownActions">
                <button
                  type="button"
                  onClick={() => setExcludedSessionIds([])}
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExcludedSessionIds(sessions.map((session) => session.id))
                  }
                >
                  Bỏ chọn
                </button>
              </div>
              <div className="capacitySessionDropdownOptions">
                {sessionWorkloads.map(({ session, linkedTasks }, index) => (
                  <button
                    type="button"
                    // Workbook có thể có hai ca trùng mã (vd. hai dòng "22/10").
                    key={`${session.id}:${index}`}
                    aria-pressed={!excludedSessionIds.includes(session.id)}
                    onClick={() =>
                      setExcludedSessionIds((current) =>
                        current.includes(session.id)
                          ? current.filter((id) => id !== session.id)
                          : [...current, session.id],
                      )
                    }
                  >
                    <i aria-hidden="true">
                      {excludedSessionIds.includes(session.id) ? "" : "✓"}
                    </i>
                    <span>
                      <strong>{session.id}</strong>
                      <small>
                        {formatDate(session.date)} · {session.type || "Chưa phân loại"} · {formatNumber(linkedTasks.length)} task
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </details>
          <HelpButton help={capacityHelp.staffContribution} />
        </div>
      </div>
      {staffNames.length && selectedSessions.length ? (
        <>
          <div
            className="capacityStaffBarLegend"
            aria-label="Assignee / Outsource"
          >
            {staffNames.map((staffName, index) => {
              const active = !hiddenStaffNames.includes(staffName);
              return (
                <button
                  type="button"
                  key={staffName}
                  aria-pressed={active}
                  onClick={() =>
                    setHiddenStaffNames((current) =>
                      active
                        ? [...current, staffName]
                        : current.filter((name) => name !== staffName),
                    )
                  }
                >
                  <i
                    style={{
                      background: staffParticipationColors[
                        index % staffParticipationColors.length
                      ],
                    }}
                  />
                  {staffName}
                </button>
              );
            })}
          </div>
          <div className="capacityStaffBarScroller">
            <svg
              className="capacityStaffBarChart"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ minWidth: chartWidth }}
              role="img"
              aria-label="Biểu đồ cột thời gian nhân sự tham gia theo từng ca quay"
            >
              {yTicks.map((tick) => {
                const y = yFor(tick);
                return (
                  <g key={tick}>
                    <line
                      className="capacityStaffBarGrid"
                      x1={plot.left}
                      x2={plot.right}
                      y1={y}
                      y2={y}
                    />
                    <text
                      className="capacityStaffBarAxis"
                      x={plot.left - 12}
                      y={y + 4}
                      textAnchor="end"
                    >
                      {formatMetric(tick)}ph
                    </text>
                  </g>
                );
              })}
              {selectedSessions.map((session, index) => {
                const x = xFor(index);
                return (
                  <g key={`${session.id}:${index}`}>
                    <rect
                      className="capacityStaffBarGroup"
                      x={x - sessionSlotWidth / 2 + 6}
                      y={plot.top}
                      width={Math.max(0, sessionSlotWidth - 12)}
                      height={plot.bottom - plot.top}
                    />
                    <text
                      className="capacityStaffBarSession"
                      x={x}
                      y={plot.bottom + 27}
                      textAnchor="middle"
                    >
                      {session.id}
                    </text>
                    <text
                      className="capacityStaffBarDate"
                      x={x}
                      y={plot.bottom + 43}
                      textAnchor="middle"
                    >
                      {formatDate(session.date)}
                    </text>
                  </g>
                );
              })}
              {selectedWorkloads.map((workload, sessionIndex) => (
                <g key={`${workload.session.id}:${sessionIndex}`}>
                  {activeStaffNames.map(
                    (staffName, activeStaffIndex) => {
                      const staffIndex = staffNames.indexOf(staffName);
                      const color =
                        staffParticipationColors[
                          staffIndex % staffParticipationColors.length
                        ];
                      const staffRow = workload.staffRows.find(
                        (row) =>
                          row.staffName.toLocaleLowerCase("vi") ===
                          staffName.toLocaleLowerCase("vi"),
                      );
                    const minutes = staffRow?.minutes ?? 0;
                    if (!minutes) return null;
                    const x = barXFor(sessionIndex, activeStaffIndex);
                    const y = yFor(minutes);
                    return (
                      <g
                        key={staffName}
                        className="capacityStaffBarPoint"
                        role="button"
                        tabIndex={0}
                        aria-label={`${staffName} · ${workload.session.id} · ${formatMetric(minutes)} phút`}
                        onClick={() =>
                          onSelectPoint(
                            staffName,
                            workload.session,
                            staffRow?.tasks ?? [],
                            minutes,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectPoint(
                              staffName,
                              workload.session,
                              staffRow?.tasks ?? [],
                              minutes,
                            );
                          }
                        }}
                      >
                        <rect
                          className="capacityStaffBarHit"
                          x={x - 4}
                          y={Math.min(y - 8, plot.bottom - 32)}
                          width={barWidth + 8}
                          height={Math.max(32, plot.bottom - y + 12)}
                        />
                        <rect
                          className="capacityStaffBar"
                          x={x}
                          y={y}
                          width={barWidth}
                          height={plot.bottom - y}
                          rx="5"
                          fill={color}
                        />
                        <text
                          x={x + barWidth / 2}
                          y={y - 9}
                          textAnchor="middle"
                        >
                          {formatMetric(minutes)}ph
                        </text>
                        <title>
                          {staffName} · {workload.session.id} · {formatMetric(minutes)} phút
                        </title>
                      </g>
                    );
                    },
                  )}
                </g>
              ))}
              <text
                className="capacityStaffBarAxisTitle"
                x={(plot.left + plot.right) / 2}
                y={chartHeight - 7}
                textAnchor="middle"
              >
                Ca quay
              </text>
              <text
                className="capacityStaffBarAxisTitle"
                transform={`translate(14 ${(plot.top + plot.bottom) / 2}) rotate(-90)`}
                textAnchor="middle"
              >
                Tổng phút dự kiến từ Tasklist
              </text>
            </svg>
          </div>
        </>
      ) : (
        <p className="capacityTypeEmpty">
          {sessions.length
            ? "Hãy chọn ít nhất một ca có danh sách nhân sự."
            : "Chưa có ca quay trong khoảng thời gian này."}
        </p>
      )}
    </article>
  );
}
