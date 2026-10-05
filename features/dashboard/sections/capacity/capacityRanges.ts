import { addDays, dateKey, inputDate, startOfWeek } from "@/shared/date/dateUtils";
import type { MediaTrendGranularity } from "../../analytics/calculateMediaCapacity";

export function toInputDate(value: Date | null) {
  return value ? dateKey(value) : "";
}

export type TrendPreset = "all" | "1w" | "1m" | "3m" | "1y" | "custom";

export function flowRangeFromGlobal(
  globalDateFrom: string,
  globalDateTo: string,
) {
  const parsedFrom = inputDate(globalDateFrom);
  const parsedTo = inputDate(globalDateTo, true);
  const today = new Date();
  const anchor = parsedTo ?? parsedFrom ?? today;
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);
  const fallbackTo = parsedFrom
    ? parsedFrom > today
      ? parsedFrom
      : today
    : weekEnd;
  return {
    from: globalDateFrom || toInputDate(weekStart),
    to: globalDateTo || toInputDate(fallbackTo),
  };
}

function inclusiveDaySpan(from: Date, to: Date) {
  return Math.max(
    1,
    Math.floor(
      (new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime() -
        new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) /
        86_400_000,
    ) + 1,
  );
}

export function trendGranularityFor(
  preset: TrendPreset,
  from: Date,
  to: Date,
): MediaTrendGranularity {
  if (preset === "1w") return "day";
  if (preset === "1m" || preset === "3m") return "week";
  if (preset === "1y") return "month";
  const days = inclusiveDaySpan(from, to);
  return days <= 14 ? "day" : days <= 100 ? "week" : "month";
}

export function presetStart(preset: TrendPreset, anchor: Date, allStart: Date) {
  if (preset === "all") return allStart;
  if (preset === "1w") return addDays(anchor, -6);
  if (preset === "1m") return addDays(anchor, -29);
  if (preset === "3m") return addDays(anchor, -89);
  if (preset === "1y") return addDays(anchor, -364);
  return allStart;
}

export function typeRangeFromGlobal({
  globalDateFrom,
  globalDateTo,
  baselineDateFrom,
  baselineDateTo,
  dataDateFrom,
  dataDateTo,
}: {
  globalDateFrom: string;
  globalDateTo: string;
  baselineDateFrom: string;
  baselineDateTo: string;
  dataDateFrom: string;
  dataDateTo: string;
}) {
  if (globalDateFrom || globalDateTo) {
    return {
      from: globalDateFrom || dataDateFrom || baselineDateFrom,
      to: globalDateTo || dataDateTo || baselineDateTo,
    };
  }
  return {
    from: baselineDateFrom || dataDateFrom,
    to: baselineDateTo || dataDateTo,
  };
}
