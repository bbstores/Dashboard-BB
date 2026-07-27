import { formatNumber } from "@/shared/formatting/format";

export function ProgressDonut({
  title,
  done,
  total,
  unit,
  onSelect,
}: {
  title: string;
  done: number;
  total: number;
  unit: string;
  onSelect?: (scope: "done" | "all") => void;
}) {
  const percent = total ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div
      className={`progressPanel ${onSelect ? "interactive" : ""}`}
      style={{ minHeight: 304, height: 304 }}
    >
      <div
        className="progressDonut"
        style={{
          background: `conic-gradient(var(--lime) 0 ${percent}%, rgba(255,255,255,.16) ${percent}% 100%)`,
        }}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-label={onSelect ? `${title}: xem các task đã hoàn thành` : undefined}
        onClick={() => onSelect?.("done")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelect?.("done");
        }}
      >
        <div>
          <strong>{Math.round(percent)}%</strong>
          <span>hoàn thành</span>
        </div>
      </div>
      <button type="button" className="progressSummary" onClick={() => onSelect?.("all")}>
        <span className="chartKicker">{title}</span>
        <h3>
          {formatNumber(done)} <small>/ {formatNumber(total)} {unit}</small>
        </h3>
      </button>
    </div>
  );
}

export function MiniProgressDonut({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const percent = total ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div className="miniProgress">
      <div
        className="miniDonut"
        style={{
          width: 82,
          height: 82,
          background: `conic-gradient(var(--lime) 0 ${percent}%, rgba(255,255,255,.16) ${percent}% 100%)`,
        }}
      >
        <div>{Math.round(percent)}%</div>
      </div>
      <span>{label}</span>
      <small>{formatNumber(done)} / {formatNumber(total)}</small>
    </div>
  );
}
