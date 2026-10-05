import type { QuantityReference } from "../../analytics/calculateMediaCapacity";
import { HelpButton } from "../../components/HelpButton";
import type { DashboardHelp } from "../../model/types";
import { statusCopy, formatRate, formatMetric } from "./capacityFormat";

function QuantityBand({
  reference,
  unit,
}: {
  reference: QuantityReference;
  unit: string;
}) {
  return (
    <div className="capacityQuantityBand">
      <span>P25 {formatMetric(reference.p25)} {unit}</span>
      <strong>
        P50 {formatMetric(reference.p50)} {unit}
      </strong>
      <span>P75 {formatMetric(reference.p75)} {unit}</span>
    </div>
  );
}

export function FlowBreakdownButton({
  className = "",
  onClick,
  children,
}: {
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`capacityFlowBreakdownButton ${className}`.trim()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CapacityFlowCard({
  type,
  kicker,
  title,
  primaryValue,
  primaryUnit,
  reference,
  forecastValue,
  completeWeek = true,
  baselineLabel,
  onOpenBaseline,
  help,
  onClick,
  children,
}: {
  type: "demand" | "sessions" | "outputs";
  kicker: string;
  title: string;
  primaryValue: number;
  primaryUnit: string;
  reference?: QuantityReference;
  forecastValue?: number;
  completeWeek?: boolean;
  baselineLabel?: string;
  onOpenBaseline?: () => void;
  help: DashboardHelp;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const status = reference ? statusCopy(reference) : null;
  return (
    <article className={`capacityFlowCard ${type}`}>
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">{kicker}</span>
          <h3>{title}</h3>
        </div>
        <HelpButton help={help} />
      </div>
      <div className="capacityFlowBody">
        <button
          type="button"
          className="capacityFlowSummary"
          aria-label={`${title}: ${formatMetric(primaryValue)} ${primaryUnit}`}
          onClick={onClick}
        >
          <div className="capacityFlowPrimary">
            <strong>{formatMetric(primaryValue)}</strong>
            <span>{primaryUnit}</span>
            {status && (
              <i className={`capacityBandStatus ${status.className}`}>
                {status.label}
              </i>
            )}
          </div>
          {!completeWeek && forecastValue !== undefined && (
            <div className="capacityForecast">
              <span>THỰC TẾ ĐẾN HIỆN TẠI</span>
              <strong>
                Dự báo hết tuần {formatMetric(forecastValue)} {primaryUnit}
              </strong>
            </div>
          )}
        </button>
        {reference && (
          <button
            type="button"
            className="capacityFlowReference"
            onClick={onOpenBaseline ?? onClick}
          >
            <p className="capacityFlowP50">
              {formatRate(reference.percentage)} so với P50
            </p>
            <QuantityBand reference={reference} unit={primaryUnit} />
          </button>
        )}
        <div className="capacityFlowBreakdown">{children}</div>
        <small className="capacityEvidenceHint">
          Nhấn từng dòng để xem đúng bảng dẫn chứng
        </small>
      </div>
      {onOpenBaseline && (
        <button
          type="button"
          className="capacityBaselineEvidence"
          onClick={onOpenBaseline}
        >
          Xem dữ liệu tạo {baselineLabel ?? "baseline"}
        </button>
      )}
    </article>
  );
}
