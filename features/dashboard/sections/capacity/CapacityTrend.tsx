import { useState } from "react";
import { inputDate } from "@/shared/date/dateUtils";
import { formatDate, formatHours } from "@/shared/formatting/format";
import type { CapacityReference, MediaTrendBucket, MediaTrendGranularity } from "../../analytics/calculateMediaCapacity";
import { HelpButton } from "../../components/HelpButton";
import { capacityHelp } from "./capacityHelp";
import { granularityLabel, formatHourPoint } from "./capacityFormat";
import type { TrendPreset } from "./capacityRanges";

function linePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
    )
    .join(" ");
}


export function CapacityTrend({
  rows,
  shootReference,
  outputReference,
  totalReference,
  preset,
  dateFrom,
  dateTo,
  granularity,
  invalidRange,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  onSelect,
}: {
  rows: MediaTrendBucket[];
  shootReference: CapacityReference;
  outputReference: CapacityReference;
  totalReference: CapacityReference;
  preset: TrendPreset;
  dateFrom: string;
  dateTo: string;
  granularity: MediaTrendGranularity;
  invalidRange: boolean;
  onPresetChange: (value: TrendPreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSelect: (
    bucket: MediaTrendBucket,
    metric: "shoot" | "output" | "total",
  ) => void;
}) {
  const [activeMetric, setActiveMetric] = useState<
    "shoot" | "output" | "total" | null
  >(null);
  const width = Math.max(1060, 78 + Math.max(1, rows.length - 1) * 88);
  const height = 330;
  const left = 54;
  const right = 24;
  const top = 42;
  const bottom = 58;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(
    60,
    ...rows.flatMap((row) => [
      row.shootMinutes,
      row.outputMinutes,
      row.totalMinutes,
      row.rollingAverageMinutes ?? 0,
    ]),
    shootReference.p50Minutes,
    outputReference.p50Minutes,
    totalReference.p50Minutes,
  );
  const point = (value: number, index: number) => ({
    x:
      left +
      (rows.length <= 1
        ? plotWidth / 2
        : (index / (rows.length - 1)) * plotWidth),
    y: top + plotHeight - (value / max) * plotHeight,
  });
  const shootPoints = rows.map((row, index) =>
    point(row.shootMinutes, index),
  );
  const outputPoints = rows.map((row, index) =>
    point(row.outputMinutes, index),
  );
  const totalPoints = rows.map((row, index) =>
    point(row.totalMinutes, index),
  );
  // Gom thành từng đoạn liên tục để đường không vẽ bắc ngang qua kỳ chưa hoàn tất.
  const rollingAverageSegments = rows.reduce<
    Array<Array<{ x: number; y: number }>>
  >((segments, row, index) => {
    if (row.rollingAverageMinutes === null) {
      if (segments.at(-1)?.length) segments.push([]);
      return segments;
    }
    if (!segments.length) segments.push([]);
    segments.at(-1)!.push(point(row.rollingAverageMinutes, index));
    return segments;
  }, []);
  const yFor = (value: number) =>
    top + plotHeight - (value / max) * plotHeight;

  return (
    <article className="capacityTrendCard">
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">XU HƯỚNG LINH ĐỘNG</span>
          <h3>Giờ chuẩn quay/chụp &amp; bàn giao</h3>
        </div>
        <div className="capacityHeaderTools">
          <div
            className={`capacityLegend${activeMetric ? " hasFocus" : ""}`}
          >
            <button
              type="button"
              className={activeMetric === "shoot" ? "active" : ""}
              aria-pressed={activeMetric === "shoot"}
              onClick={() =>
                setActiveMetric((current) =>
                  current === "shoot" ? null : "shoot",
                )
              }
            >
              <i className="shoot" />Quay/Chụp · P50{" "}
              {formatHourPoint(shootReference.p50Minutes)}
            </button>
            <button
              type="button"
              className={activeMetric === "output" ? "active" : ""}
              aria-pressed={activeMetric === "output"}
              onClick={() =>
                setActiveMetric((current) =>
                  current === "output" ? null : "output",
                )
              }
            >
              <i className="output" />Bàn giao · P50{" "}
              {formatHourPoint(outputReference.p50Minutes)}
            </button>
            <button
              type="button"
              className={activeMetric === "total" ? "active" : ""}
              aria-pressed={activeMetric === "total"}
              onClick={() =>
                setActiveMetric((current) =>
                  current === "total" ? null : "total",
                )
              }
            >
              <i className="total" />Tổng tải · P50{" "}
              {formatHourPoint(totalReference.p50Minutes)}
            </button>
            <span>
              <i className="rolling" />TB trượt 4 kỳ
            </span>
            <span><i className="partial" />Chưa hoàn tất</span>
          </div>
          <HelpButton help={capacityHelp.trend} />
        </div>
      </div>
      <div className="capacityTrendToolbar">
        <div className="capacityTrendPresets" aria-label="Khoảng xu hướng">
          {([
            ["all", "ALL"],
            ["1w", "1W"],
            ["1m", "1M"],
            ["3m", "3M"],
            ["1y", "1Y"],
            ["custom", "TỰ CHỌN"],
          ] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={preset === value ? "active" : ""}
              aria-pressed={preset === value}
              onClick={() => onPresetChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="capacityTrendCustomRange">
            <label>
              Từ ngày
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => onDateFromChange(event.target.value)}
              />
            </label>
            <span>→</span>
            <label>
              Đến ngày
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => onDateToChange(event.target.value)}
              />
            </label>
          </div>
        )}
        <div className="capacityTrendRangeSummary">
          <span>
            {formatDate(inputDate(dateFrom))}–{formatDate(inputDate(dateTo))}
          </span>
          <strong>THEO {granularityLabel(granularity).toUpperCase()}</strong>
        </div>
      </div>
      {invalidRange ? (
        <p className="capacityTrendEmpty">
          Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.
        </p>
      ) : rows.length ? (
        <div className="capacityTrendScroller">
        <svg
          className={`capacityTrendSvg${activeMetric ? ` seriesFocus focus-${activeMetric}` : ""}`}
          style={{ minWidth: `${width}px` }}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Xu hướng giờ chuẩn Media theo ${granularityLabel(granularity)}`}
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = top + plotHeight * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  className="capacityGridLine"
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="capacityAxisLabel"
                  x={left - 10}
                  y={y + 4}
                  textAnchor="end"
                >
                  {formatHourPoint(max * ratio)}
                </text>
              </g>
            );
          })}
          {shootReference.p50Minutes > 0 && (
            <line
              className="capacityBaseline shoot"
              x1={left}
              x2={width - right}
              y1={yFor(shootReference.p50Minutes)}
              y2={yFor(shootReference.p50Minutes)}
            />
          )}
          {outputReference.p50Minutes > 0 && (
            <line
              className="capacityBaseline output"
              x1={left}
              x2={width - right}
              y1={yFor(outputReference.p50Minutes)}
              y2={yFor(outputReference.p50Minutes)}
            />
          )}
          {totalReference.p50Minutes > 0 && (
            <line
              className="capacityBaseline total"
              x1={left}
              x2={width - right}
              y1={yFor(totalReference.p50Minutes)}
              y2={yFor(totalReference.p50Minutes)}
            />
          )}
          <path
            className="capacityTrendLine shoot"
            d={linePath(shootPoints)}
          />
          <path
            className="capacityTrendLine output"
            d={linePath(outputPoints)}
          />
          <path
            className="capacityTrendLine total"
            d={linePath(totalPoints)}
          />
          {rollingAverageSegments.map(
            (segment, index) =>
              segment.length > 1 && (
                <path
                  className="capacityTrendLine rolling"
                  d={linePath(segment)}
                  key={`rolling-${index}`}
                />
              ),
          )}
          {rows.map((row, index) => (
            <g key={row.key}>
              <text
                className="capacityWeekLabel"
                x={shootPoints[index].x}
                y={height - 20}
                textAnchor="middle"
              >
                {row.label}
              </text>
              <g
                className="capacityPointGroup shoot"
                role="button"
                tabIndex={0}
                aria-label={`${row.label} · Quay/Chụp ${formatHours(row.shootMinutes)}${row.isComplete ? "" : " · Chưa hoàn tất"}`}
                onClick={() => onSelect(row, "shoot")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelect(row, "shoot");
                  }
                }}
              >
                <circle
                  className={`capacityTrendPoint shoot${row.isComplete ? "" : " partial"}`}
                  cx={shootPoints[index].x}
                  cy={shootPoints[index].y}
                  r={5}
                />
                <text
                  className="capacityPointValue shoot onHover"
                  x={shootPoints[index].x}
                  y={shootPoints[index].y - 11}
                  textAnchor="middle"
                >
                  {formatHourPoint(row.shootMinutes)}
                </text>
              </g>
              <g
                className="capacityPointGroup output"
                role="button"
                tabIndex={0}
                aria-label={`${row.label} · Bàn giao ${formatHours(row.outputMinutes)}${row.isComplete ? "" : " · Chưa hoàn tất"}`}
                onClick={() => onSelect(row, "output")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelect(row, "output");
                  }
                }}
              >
                <circle
                  className={`capacityTrendPoint output${row.isComplete ? "" : " partial"}`}
                  cx={outputPoints[index].x}
                  cy={outputPoints[index].y}
                  r={5}
                />
                <text
                  className="capacityPointValue output onHover"
                  x={outputPoints[index].x}
                  y={outputPoints[index].y + 19}
                  textAnchor="middle"
                >
                  {formatHourPoint(row.outputMinutes)}
                </text>
              </g>
              <g
                className="capacityPointGroup total"
                role="button"
                tabIndex={0}
                aria-label={`${row.label} · Tổng tải ${formatHours(row.totalMinutes)}${row.isComplete ? "" : " · Chưa hoàn tất"}`}
                onClick={() => onSelect(row, "total")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelect(row, "total");
                  }
                }}
              >
                <circle
                  className={`capacityTrendPoint total${row.isComplete ? "" : " partial"}`}
                  cx={totalPoints[index].x}
                  cy={totalPoints[index].y}
                  r={5}
                />
                <text
                  className="capacityPointValue total onHover"
                  x={totalPoints[index].x}
                  y={totalPoints[index].y - 11}
                  textAnchor="middle"
                >
                  {formatHourPoint(row.totalMinutes)}
                </text>
              </g>
            </g>
          ))}
        </svg>
        </div>
      ) : (
        <p className="capacityTrendEmpty">
          Chưa có dữ liệu Media trong khoảng đã chọn.
        </p>
      )}
    </article>
  );
}
