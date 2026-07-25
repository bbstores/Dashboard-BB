import type { ReactNode } from "react";
import type { PieDatum, DashboardHelp } from "../types";
import { formatNumber, formatPercent } from "../format";
import { HelpButton } from "./HelpButton";
import { dashboardHelp } from "../helpContent";

export function HorizontalBars({
  title,
  subtitle,
  rows,
  format = formatNumber,
  onSelect,
  tooltip,
  headerAction,
  className = "",
  help,
}: {
  title: string;
  subtitle: string;
  rows: Array<
    PieDatum & { started?: number; carried?: number; waiting?: number }
  >;
  format?: (value: number) => string;
  onSelect?: (
    label: string,
    metric?: "total" | "started" | "carried" | "waiting",
  ) => void;
  tooltip?: (value: number) => string;
  headerAction?: ReactNode;
  className?: string;
  help?: DashboardHelp;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <article className={`chartCard ${className}`}>
      <div className="chartTitle">
        <div>
          <span className="chartKicker">{subtitle}</span>
          <h3>{title}</h3>
        </div>
        <div className="chartHeaderTools">
          {headerAction}
          <HelpButton help={help ?? dashboardHelp(title)} />
        </div>
      </div>
      {rows.some(
        (row) =>
          row.started !== undefined ||
          row.carried !== undefined ||
          row.waiting !== undefined,
      ) && (
        <div className="stackedLegend">
          <span><i className="startedSegment" />Task trong kỳ</span>
          <span><i className="carriedSegment" />Carry-in bàn giao trong kỳ</span>
          <span><i className="waitingSegment" />To Do / Pending-Cancel</span>
        </div>
      )}
      <div className="horizontalBars">
        {rows.slice(0, 15).map((row, index) => (
          <button
            type="button"
            className={`horizontalRow ${onSelect ? "interactive" : ""}`}
            key={row.label}
            onClick={() => onSelect?.(row.label, "total")}
          >
            <span className="rank">{String(index + 1).padStart(2, "0")}</span>
            <span className="barLabel" title={row.label}>{row.label}</span>
            <div className="barTrack">
              {row.started !== undefined ||
              row.carried !== undefined ||
              row.waiting !== undefined ? (
                <span
                  className="stackedBar"
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                >
                  <i
                    className="startedSegment"
                    style={{
                      width: `${row.value ? ((row.started ?? 0) / row.value) * 100 : 0}%`,
                    }}
                    onClick={(e) => {
                      if (onSelect && row.started) {
                        e.stopPropagation();
                        onSelect(row.label, "started");
                      }
                    }}
                  />
                  <i
                    className="carriedSegment"
                    style={{
                      width: `${row.value ? ((row.carried ?? 0) / row.value) * 100 : 0}%`,
                    }}
                    onClick={(e) => {
                      if (onSelect && row.carried) {
                        e.stopPropagation();
                        onSelect(row.label, "carried");
                      }
                    }}
                  />
                  <i
                    className="waitingSegment"
                    style={{
                      width: `${row.value ? ((row.waiting ?? 0) / row.value) * 100 : 0}%`,
                    }}
                    onClick={(e) => {
                      if (onSelect && row.waiting) {
                        e.stopPropagation();
                        onSelect(row.label, "waiting");
                      }
                    }}
                  />
                </span>
              ) : (
                <i style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
              )}
            </div>
            <strong
              className={tooltip ? "valueTooltip" : undefined}
              data-tooltip={tooltip?.(row.value)}
              tabIndex={tooltip ? 0 : undefined}
            >
              {format(row.value)}
            </strong>
            {(row.started !== undefined ||
              row.carried !== undefined ||
              row.waiting !== undefined) && (
              <span className="barBreakdown" role="tooltip">
                <b>{row.label}</b>
                <span>
                  <i className="startedSegment" />
                  Task trong kỳ
                  <strong>{format(row.started ?? 0)}</strong>
                  <small>{formatPercent(row.started ?? 0, row.value)}</small>
                </span>
                <span>
                  <i className="carriedSegment" />
                  Carry-in bàn giao
                  <strong>{format(row.carried ?? 0)}</strong>
                  <small>{formatPercent(row.carried ?? 0, row.value)}</small>
                </span>
                <span>
                  <i className="waitingSegment" />
                  To Do / Pending-Cancel
                  <strong>{format(row.waiting ?? 0)}</strong>
                  <small>{formatPercent(row.waiting ?? 0, row.value)}</small>
                </span>
              </span>
            )}
          </button>
        ))}
        {!rows.length && <p className="emptyText">Chưa có dữ liệu phù hợp.</p>}
      </div>
    </article>
  );
}
