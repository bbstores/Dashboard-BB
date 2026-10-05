import { formatHours, formatNumber, formatPercent } from "@/shared/formatting/format";
import type { CapacityReference, MediaTrendGranularity } from "../../analytics/calculateMediaCapacity";
import type { DetailView, Task } from "../../model/types";

export function detailWithStandardMinutes(
  title: string,
  subtitle: string,
  tasks: Task[],
  standardMinutes: Map<Task, number>,
): DetailView {
  return {
    title,
    subtitle,
    tasks,
    taskMetric: {
      label: "Phút chuẩn 1.7",
      value: (task) => standardMinutes.get(task) ?? 0,
      format: (value) => `${formatNumber(value)} phút`,
      describe: (value) =>
        value ? "Map được định mức" : "Chưa map được định mức",
    },
  };
}

export function statusCopy(
  reference: Pick<CapacityReference, "bandStatus">,
) {
  if (reference.bandStatus === "below") {
    return { label: "Dưới vùng thường", className: "below" };
  }
  if (reference.bandStatus === "above") {
    return { label: "Vượt vùng thường", className: "above" };
  }
  if (reference.bandStatus === "within") {
    return { label: "Trong vùng thường", className: "within" };
  }
  return { label: "Chưa đủ baseline", className: "unavailable" };
}

export function formatRate(value: number) {
  return formatPercent(value, 100);
}

export function formatMetric(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function granularityLabel(value: MediaTrendGranularity) {
  return value === "day" ? "ngày" : value === "week" ? "tuần" : "tháng";
}

export function formatHourPoint(minutes: number) {
  return formatHours(minutes).replace(" giờ", "h");
}

export function uniqueTasks(tasks: Task[]) {
  return Array.from(new Set(tasks));
}
