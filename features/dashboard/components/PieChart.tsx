import { COLORS } from "../model/constants";
import type { PieDatum, PieScope, DashboardHelp } from "../model/types";
import { formatNumber, formatPercent } from "@/shared/formatting/format";
import { HelpButton } from "./HelpButton";
import { dashboardHelp } from "../help/helpContent";

type HoverChart = {
  title: string;
  data: PieDatum[];
  totalLabel?: string;
};

function MiniPieBreakdown({
  title,
  data,
  totalLabel = "Task",
}: HoverChart) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const slices = data.reduce<{
    accumulated: number;
    result: Array<
      PieDatum & {
        start: number;
        end: number;
        color: string;
      }
    >;
  }>(
    (acc, item, index) => {
      const start =
        total > 0 ? acc.accumulated / total : 0;
      const nextAccumulated = acc.accumulated + item.value;
      acc.result.push({
        ...item,
        start,
        end: total > 0 ? nextAccumulated / total : 0,
        color: COLORS[index % COLORS.length],
      });
      acc.accumulated = nextAccumulated;
      return acc;
    },
    { accumulated: 0, result: [] },
  ).result;

  return (
    <div className="legendHoverPanel miniPieBreakdown" role="tooltip">
      <b>{title}</b>
      <div className="miniPieLayout">
        <div className="miniPieVisual">
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={`Biểu đồ tròn: ${title}`}
          >
            {slices.map((slice) => {
              const startX =
                50 +
                50 *
                  Math.cos(
                    2 * Math.PI * slice.start - Math.PI / 2,
                  );
              const startY =
                50 +
                50 *
                  Math.sin(
                    2 * Math.PI * slice.start - Math.PI / 2,
                  );
              const endX =
                50 +
                50 *
                  Math.cos(
                    2 * Math.PI * slice.end - Math.PI / 2,
                  );
              const endY =
                50 +
                50 *
                  Math.sin(
                    2 * Math.PI * slice.end - Math.PI / 2,
                  );
              const largeArc =
                total > 0 && slice.value / total > 0.5 ? 1 : 0;
              return (
                <path
                  key={slice.label}
                  d={
                    slice.value === total && total > 0
                      ? "M 50 0 A 50 50 0 1 1 49.9 0 Z"
                      : `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArc} 1 ${endX} ${endY} Z`
                  }
                  fill={slice.color}
                />
              );
            })}
            <circle cx="50" cy="50" r="30" fill="#1e2a26" />
          </svg>
          <span>
            <strong>{formatNumber(total)}</strong>
            <small>{totalLabel}</small>
          </span>
        </div>
        <div className="miniPieLegend">
          {slices.map((item) => (
            <span key={item.label}>
              <i style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
              <strong>{formatNumber(item.value)}</strong>
              <small>{formatPercent(item.value, total)}</small>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PieChart({
  title,
  data,
  className = "",
  compact = false,
  scope,
  onScopeChange,
  excludeOutsource,
  onExcludeOutsourceChange,
  hoverBreakdown,
  hoverChart,
  help,
  onSelect,
  totalLabel = "Task",
}: {
  title: string;
  data: PieDatum[];
  className?: string;
  compact?: boolean;
  scope?: PieScope;
  onScopeChange?: (scope: PieScope) => void;
  excludeOutsource?: boolean;
  onExcludeOutsourceChange?: (checked: boolean) => void;
  hoverBreakdown?: (label: string) => { title: string; data: PieDatum[] };
  hoverChart?: (label: string) => HoverChart | null;
  help?: DashboardHelp;
  onSelect?: (label: string) => void;
  totalLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const slices = data.reduce<{
    accumulated: number;
    result: Array<PieDatum & { start: number; end: number; color: string }>;
  }>(
    (acc, item, index) => {
      const start = total > 0 ? acc.accumulated / total : 0;
      const nextAccumulated = acc.accumulated + item.value;
      const end = total > 0 ? nextAccumulated / total : 0;
      const color = COLORS[index % COLORS.length];
      acc.result.push({ ...item, start, end, color });
      acc.accumulated = nextAccumulated;
      return acc;
    },
    { accumulated: 0, result: [] },
  ).result;

  return (
    <article className={`chartCard pieCard ${className} ${compact ? "compact" : ""}`}>
      <div className="chartTitle">
        <h3>{title}</h3>
        <div className="chartHeaderTools">
          {onScopeChange && (
            <select
              className="scopeSelector"
              value={scope}
              onChange={(event) => onScopeChange(event.target.value as PieScope)}
              aria-label={`Phạm vi dữ liệu của biểu đồ ${title}`}
            >
              <option value="combined">Tổng khử trùng</option>
              <option value="started">Bắt đầu trong kỳ</option>
              <option value="inspectionCarry">Carry-in bàn giao</option>
              <option value="completionCarry">Carry-in hoàn thành</option>
            </select>
          )}
          {onExcludeOutsourceChange && (
            <label className="checkboxLabel">
              <input
                type="checkbox"
                checked={excludeOutsource}
                onChange={(event) => onExcludeOutsourceChange(event.target.checked)}
              />
              Trừ outsource
            </label>
          )}
          <HelpButton help={help ?? dashboardHelp(title)} />
        </div>
      </div>
      <div className="pieLayout">
        <div className="pieSvgWrap">
          {total > 0 ? (
            <svg viewBox="0 0 100 100" className="pieSvg" role="img" aria-label={`Biểu đồ tròn: ${title}`}>
              {slices.map((slice) => {
                const startX = 50 + 50 * Math.cos(2 * Math.PI * slice.start - Math.PI / 2);
                const startY = 50 + 50 * Math.sin(2 * Math.PI * slice.start - Math.PI / 2);
                const endX = 50 + 50 * Math.cos(2 * Math.PI * slice.end - Math.PI / 2);
                const endY = 50 + 50 * Math.sin(2 * Math.PI * slice.end - Math.PI / 2);
                const largeArc = slice.value / total > 0.5 ? 1 : 0;
                return (
                  <path
                    key={slice.label}
                    d={
                      slice.value === total
                        ? "M 50 0 A 50 50 0 1 1 49.9 0 Z"
                        : `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArc} 1 ${endX} ${endY} Z`
                    }
                    fill={slice.color}
                  />
                );
              })}
              <circle cx="50" cy="50" r="32" fill="var(--card)" />
            </svg>
          ) : (
            <div className="emptyDonut" />
          )}
          <div className="pieTotal">
            <strong>{formatNumber(total)}</strong>
            <small>{totalLabel}</small>
          </div>
        </div>
        <div className="legend">
          {slices.map((slice) => {
            const breakdown = hoverBreakdown?.(slice.label);
            const chart = hoverChart?.(slice.label);
            return (
              <button
                type="button"
                className={`legendRow ${onSelect ? "interactive" : ""}`}
                key={slice.label}
                onClick={() => onSelect?.(slice.label)}
              >
                <i style={{ backgroundColor: slice.color }} />
                <span title={slice.label}>{slice.label}</span>
                <strong>
                  {formatNumber(slice.value)}
                  <small>{formatPercent(slice.value, total)}</small>
                </strong>
                {breakdown && (
                  <div className="legendHoverPanel" role="tooltip">
                    <b>{breakdown.title}</b>
                    {breakdown.data.slice(0, 8).map((subItem) => (
                      <span key={subItem.label}>
                        <span>{subItem.label}</span>
                        <strong>{formatNumber(subItem.value)}</strong>
                      </span>
                    ))}
                  </div>
                )}
                {chart && <MiniPieBreakdown {...chart} />}
              </button>
            );
          })}
          {!slices.length && <p className="emptyText">Không có dữ liệu</p>}
        </div>
      </div>
    </article>
  );
}
