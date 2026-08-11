"use client";

import { useState } from "react";
import { formatMinutes, formatPercent } from "@/shared/formatting/format";
import type {
  AssigneeStageDatum,
  AssigneeStageProfile,
} from "../analytics/types";
import { HelpButton } from "./HelpButton";

type Point = { x: number; y: number };

function polarPoint(
  index: number,
  count: number,
  radius: number,
  center: Point,
): Point {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function pointList(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function AssigneeStageRadar({
  profiles,
  onSelect,
}: {
  profiles: AssigneeStageProfile[];
  onSelect?: (assignee: string, stage: AssigneeStageDatum) => void;
}) {
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const selected =
    profiles.find((profile) => profile.assignee === selectedAssignee) ??
    profiles[0];
  const stages = selected?.stages ?? [];
  const maxValue = Math.max(1, ...stages.map((stage) => stage.value));
  const center = { x: 340, y: 210 };
  const radius = 138;
  const axisCount = Math.max(stages.length, 3);
  const outerPoints = Array.from({ length: axisCount }, (_, index) =>
    polarPoint(index, axisCount, radius, center),
  );
  const valuePoints = stages.map((stage, index) =>
    polarPoint(index, axisCount, (stage.value / maxValue) * radius, center),
  );

  return (
    <article className="chartCard fullWidth groupPeople assigneeRadarCard">
      <div className="chartTitle radarHeader">
        <div>
          <span className="chartKicker">PHÂN BỔ TASK THEO CÔNG ĐOẠN</span>
          <h3>Chân dung công việc của nhân sự</h3>
          <span className="chartSubtitle">
            Mỗi góc là một công đoạn; càng xa tâm, nhân sự càng thường được giao công đoạn đó.
          </span>
        </div>
        <div className="radarControls">
          <label>
            <span>Nhân sự</span>
            <select
              value={selected?.assignee ?? ""}
              onChange={(event) => setSelectedAssignee(event.target.value)}
              aria-label="Lọc biểu đồ radar theo nhân sự"
            >
              {profiles.map((profile) => (
                <option value={profile.assignee} key={profile.assignee}>
                  {profile.assignee}
                </option>
              ))}
            </select>
          </label>
          <HelpButton
            help={{
              title: "Công đoạn thường được giao",
              purpose: "Nhìn nhanh một nhân sự thường đảm nhiệm những công đoạn nào trong kỳ đang lọc.",
              objective: "Các đỉnh dài thể hiện công đoạn xuất hiện nhiều trong số task của nhân sự; dùng để nhận biết mức độ chuyên môn hóa hoặc phân bổ công việc.",
              calculation: "Đếm task theo cột Công đoạn (Stage) của từng assignee. Task nhiều assignee được tính cho từng người. Radar chuẩn hóa theo công đoạn có nhiều task nhất của chính nhân sự đang chọn; con số cạnh mỗi đỉnh là số task thực tế.",
              example: "Nếu Edit có 12 task và Graphic Design có 6 task, đỉnh Edit đạt 100% bán kính còn Graphic Design đạt 50%.",
            }}
          />
        </div>
      </div>

      {selected && stages.length ? (
        <div className="radarLayout">
          <div className="radarScroller">
            <svg
              className="radarSvg"
              viewBox="0 0 680 420"
              role="img"
              aria-label={`Biểu đồ radar công đoạn của ${selected.assignee}`}
            >
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <polygon
                  className="radarGrid"
                  points={pointList(
                    Array.from({ length: axisCount }, (_, index) =>
                      polarPoint(index, axisCount, radius * ratio, center),
                    ),
                  )}
                  key={ratio}
                />
              ))}
              {stages.map((stage, index) => {
                const point = outerPoints[index];
                const labelPoint = polarPoint(index, axisCount, radius + 34, center);
                const anchor = labelPoint.x < center.x - 12
                  ? "end"
                  : labelPoint.x > center.x + 12
                    ? "start"
                    : "middle";
                return (
                  <g key={stage.label}>
                    <line
                      className="radarAxis"
                      x1={center.x}
                      y1={center.y}
                      x2={point.x}
                      y2={point.y}
                    />
                    <text
                      className="radarAxisLabel"
                      x={labelPoint.x}
                      y={labelPoint.y}
                      textAnchor={anchor}
                    >
                      <tspan x={labelPoint.x}>{stage.label}</tspan>
                      <tspan className="radarAxisValue" x={labelPoint.x} dy="15">
                        {stage.value} task
                      </tspan>
                    </text>
                  </g>
                );
              })}
              <polygon
                className="radarArea"
                points={pointList(valuePoints)}
              />
              {stages.map((stage, index) => {
                const point = valuePoints[index];
                return (
                  <circle
                    className={onSelect ? "radarPoint interactive" : "radarPoint"}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    tabIndex={onSelect ? 0 : undefined}
                    role={onSelect ? "button" : undefined}
                    aria-label={`${stage.label}: ${stage.value} task`}
                    onClick={() => onSelect?.(selected.assignee, stage)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect?.(selected.assignee, stage);
                      }
                    }}
                    key={stage.label}
                  >
                    <title>{stage.label}: {stage.value} task · {formatMinutes(stage.minutes)}</title>
                  </circle>
                );
              })}
            </svg>
          </div>

          <aside className="radarSummary">
            <div className="radarSummaryTotal">
              <span>Tổng task trong radar</span>
              <strong>{selected.totalTasks}</strong>
              <small>{selected.assignee}</small>
            </div>
            <div className="radarStageList">
              {stages.map((stage) => (
                <button
                  type="button"
                  onClick={() => onSelect?.(selected.assignee, stage)}
                  disabled={!onSelect}
                  key={stage.label}
                >
                  <span>{stage.label}</span>
                  <strong>{stage.value}</strong>
                  <small>{formatPercent(stage.value, selected.totalTasks)}</small>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <p className="emptyText">Chưa có dữ liệu công đoạn theo nhân sự.</p>
      )}
    </article>
  );
}
