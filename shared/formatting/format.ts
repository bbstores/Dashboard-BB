// ─── Formatting Utilities ───────────────────────────────────────────────────

export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatHours(minutes: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(minutes / 60)} giờ`;
}

export function formatMinutes(minutes: number) {
  return `${formatNumber(minutes)} phút`;
}

export function formatWorkDays(minutes: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(minutes / 480)} ngày`;
}

export function formatPercent(value: number, total: number) {
  if (!total) return "0%";
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format((value / total) * 100)}%`;
}

export function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(value);
}

export function formatDateTime(value: Date | null) {
  if (!value) return "—";
  const twoDigits = (part: number) => String(part).padStart(2, "0");
  return [
    `${twoDigits(value.getHours())}:${twoDigits(value.getMinutes())}`,
    `${twoDigits(value.getDate())}/${twoDigits(value.getMonth() + 1)}/${value.getFullYear()}`,
  ].join(" ");
}

export function formatSlaMinutes(minutes: number) {
  return `${formatNumber(Math.round(minutes))} phút`;
}

export function formatOperationalTime(value: number | null, showNextDay = false) {
  if (value === null) return "—";
  const workdayStart = 8 * 60 + 30;
  const clockMinute = (Math.round(value) + workdayStart) % 1440;
  const nextDay = showNextDay && value >= 930;
  return `${String(Math.floor(clockMinute / 60)).padStart(2, "0")}:${String(clockMinute % 60).padStart(2, "0")}${nextDay ? " +1" : ""}`;
}

export function formatDistributionValue(value: number, unit: "minutes" | "days") {
  return unit === "minutes"
    ? formatSlaMinutes(value)
    : `${formatNumber(value)} ngày`;
}
