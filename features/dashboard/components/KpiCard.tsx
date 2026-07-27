import type { ReactNode } from "react";
import type { DashboardHelp } from "../model/types";
import { HelpButton } from "./HelpButton";

export type KpiCardProps = {
  label: string;
  value: string;
  help: DashboardHelp;
  children: ReactNode;
  variant?: "dark" | "lime" | "warning";
  onClick: () => void;
};

export function KpiCard({
  label,
  value,
  help,
  children,
  variant,
  onClick,
}: KpiCardProps) {
  return (
    <button
      type="button"
      className={`kpiCard interactive ${variant ?? ""}`.trim()}
      onClick={onClick}
    >
      <HelpButton help={help} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{children}</small>
    </button>
  );
}
