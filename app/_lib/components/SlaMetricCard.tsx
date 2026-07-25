import type { DashboardHelp } from "../types";
import { dashboardHelp } from "../helpContent";
import { HelpButton } from "./HelpButton";

export function SlaMetricCard({
  kicker,
  title,
  value,
  note,
  onClick,
  onExpand,
  help,
}: {
  kicker: string;
  title: string;
  value: string;
  note: string;
  onClick?: () => void;
  onExpand?: () => void;
  help?: DashboardHelp;
}) {
  return (
    <button
      type="button"
      className={`slaMetric ${onClick ? "interactive" : ""}`}
      onClick={onClick}
    >
      <HelpButton help={help ?? dashboardHelp(title)} />
      {onExpand && (
        <span
          className="expandMetricButton"
          role="button"
          tabIndex={0}
          title="Mở thống kê phân vị"
          aria-label={`Mở thống kê phân vị của ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            onExpand();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onExpand();
            }
          }}
        >
          ↗
        </span>
      )}
      <span className="slaMetricKicker">{kicker}</span>
      <small>{title}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </button>
  );
}
