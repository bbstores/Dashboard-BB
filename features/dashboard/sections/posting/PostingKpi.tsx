import { formatNumber } from "@/shared/formatting/format";

export function PostingKpi({
  label,
  value,
  note,
  variant = "",
  onClick,
}: {
  label: string;
  value: number;
  note: string;
  variant?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      <small>{note}</small>
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`postingKpiCard interactive ${variant}`.trim()}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <div className={`postingKpiCard ${variant}`.trim()}>
      {content}
    </div>
  );
}
