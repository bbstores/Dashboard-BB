import { useState } from "react";
import type { Task, PercentileDetail } from "../types";
import { percentile } from "../dateUtils";
import { formatNumber, formatDistributionValue } from "../format";

export function PercentileDialog({
  detail,
  onClose,
  onSelect,
}: {
  detail: PercentileDetail;
  onClose: () => void;
  onSelect: (
    label: string,
    note: string,
    observations: Array<{ task: Task; value: number }>,
  ) => void;
}) {
  const values = detail.observations.map((observation) => observation.value);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const q1 = percentile(values, 0.25);
  const p50 = percentile(values, 0.5);
  const q3 = percentile(values, 0.75);
  const rows = [
    { label: "Q1", value: q1, note: "25% quan sát không vượt quá", select: (value: number) => value <= q1 },
    { label: "P50", value: p50, note: "Các task từ trung vị trở lên", select: (value: number) => value >= p50 },
    { label: "Q3", value: q3, note: "Các task từ Q3 trở lên", select: (value: number) => value >= q3 },
    { label: "IQR", value: q3 - q1, note: `Khoảng Q1–Q3: ${formatDistributionValue(q1, detail.unit)} – ${formatDistributionValue(q3, detail.unit)}`, select: (value: number) => value >= q1 && value <= q3 },
    { label: "P90", value: percentile(values, 0.9), note: "Các task từ P90 trở lên", select: (value: number) => value >= percentile(values, 0.9) },
    { label: "P95", value: percentile(values, 0.95), note: "Các task từ P95 trở lên", select: (value: number) => value >= percentile(values, 0.95) },
    { label: "P99", value: percentile(values, 0.99), note: "Các task từ P99 trở lên", select: (value: number) => value >= percentile(values, 0.99) },
  ];
  const percentilePositions: Record<string, number> = {
    P1: 1,
    Q1: 25,
    P50: 50,
    Q3: 75,
    P90: 90,
    P95: 95,
    P99: 99,
    P100: 100,
  };
  const railMarkers = [
    { label: "P1", ratio: 0.01 },
    { label: "Q1", ratio: 0.25 },
    { label: "P50", ratio: 0.5 },
    { label: "Q3", ratio: 0.75 },
    { label: "P90", ratio: 0.9 },
    { label: "P100", ratio: 1 },
  ].map((marker) => ({
    ...marker,
    value: percentile(values, marker.ratio),
    position: percentilePositions[marker.label],
  }));
  const fastestObservation = detail.observations.reduce<
    { task: Task; value: number } | undefined
  >(
    (fastest, observation) =>
      !fastest || observation.value < fastest.value ? observation : fastest,
    undefined,
  );
  const slowestObservation = detail.observations.reduce<
    { task: Task; value: number } | undefined
  >(
    (slowest, observation) =>
      !slowest || observation.value > slowest.value ? observation : slowest,
    undefined,
  );
  const activeRow = rows.find((row) => row.label === hoveredMetric);
  const railStart = hoveredMetric === "IQR" ? 25 : 0;
  const railWidth = hoveredMetric
    ? hoveredMetric === "IQR"
      ? 50
      : percentilePositions[hoveredMetric] ?? 0
    : 0;
  return (
    <div className="percentileOverlay" role="presentation" onMouseDown={onClose}>
      <section
        className="percentileDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="percentile-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="chartKicker">PHÂN TÍCH PHÂN VỊ MỞ RỘNG</span>
            <h2 id="percentile-dialog-title">{detail.title}</h2>
            <p>{detail.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng">×</button>
        </header>
        <div className="percentileOverview">
          <div className="percentileSample">
            <span>Quan sát trong mẫu hiện tại</span>
            <strong>{formatNumber(detail.observations.length)}</strong>
            <div className="percentileExtremes">
              <small>
                <b>P1</b>
                {fastestObservation?.task.code ?? "—"}
              </small>
              <i />
              <small>
                <b>P100</b>
                {slowestObservation?.task.code ?? "—"}
              </small>
            </div>
          </div>
          <div
            className={`percentileRail ${hoveredMetric ? "isActive" : ""} ${hoveredMetric === "IQR" ? "showIqr" : ""}`}
            aria-label="Trục phân vị từ P1 đến P100"
          >
            <div className="percentileRailTrack" />
            <div
              className="percentileRailFill"
              style={{
                left: `${railStart}%`,
                right: "auto",
                width: `${railWidth}%`,
              }}
            />
            <div className="percentileIqrBand" />
            {railMarkers.map((marker) => (
              <span
                key={marker.label}
                className={`percentileRailMarker ${
                  hoveredMetric === marker.label ? "active" : ""
                }`}
                style={{ left: `${marker.position}%` }}
              >
                <strong>
                  {formatDistributionValue(marker.value, detail.unit)}
                </strong>
                <i />
                <small>{marker.label}</small>
              </span>
            ))}
            {activeRow &&
              !railMarkers.some((marker) => marker.label === activeRow.label) &&
              activeRow.label !== "IQR" && (
                <span
                  className="percentileRailMarker active transient"
                  style={{
                    left: `${percentilePositions[activeRow.label] ?? 50}%`,
                  }}
                >
                  <strong>
                    {formatDistributionValue(activeRow.value, detail.unit)}
                  </strong>
                  <i />
                  <small>{activeRow.label}</small>
                </span>
              )}
          </div>
        </div>
        <div className="percentileGrid">
          {rows.map((row) => (
            <button
              type="button"
              key={row.label}
              className={`percentileMetric ${row.label === "P50" ? "median" : ""}`}
              onMouseEnter={() => setHoveredMetric(row.label)}
              onMouseLeave={() => setHoveredMetric(null)}
              onFocus={() => setHoveredMetric(row.label)}
              onBlur={() => setHoveredMetric(null)}
              onClick={() =>
                onSelect(
                  row.label,
                  row.note,
                  detail.observations.filter((observation) =>
                    row.select(observation.value),
                  ),
                )
              }
            >
              <span>{row.label}</span>
              <strong>{formatDistributionValue(row.value, detail.unit)}</strong>
              <small>{row.note}</small>
              <i>Xem task →</i>
            </button>
          ))}
        </div>
        <p className="percentileNote">
          IQR là độ rộng của 50% dữ liệu nằm giữa Q1 và Q3; P95/P99 giúp nhận diện
          phần đuôi dài và các trường hợp rất chậm mà P50 không thể hiện.
        </p>
      </section>
    </div>
  );
}
