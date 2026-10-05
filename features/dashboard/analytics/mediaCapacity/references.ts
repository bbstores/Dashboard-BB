import { percentile } from "@/shared/date/dateUtils";
import type { MediaCapacityWeek, CapacityReference, QuantityReference } from "./types";
import { MIN_OFFICIAL_BASELINE_WEEKS } from "./constants";

export function quantityReference(
  values: number[],
  actual: number,
): QuantityReference {
  if (!values.length) {
    return {
      p25: 0,
      p50: 0,
      p75: 0,
      percentage: 0,
      bandStatus: "unavailable",
    };
  }
  const p25 = percentile(values, 0.25);
  const p50 = percentile(values, 0.5);
  const p75 = percentile(values, 0.75);
  return {
    p25,
    p50,
    p75,
    percentage: p50 ? (actual / p50) * 100 : 0,
    bandStatus:
      actual < p25 ? "below" : actual > p75 ? "above" : "within",
  };
}

export function referenceForValue(
  reference: QuantityReference,
  actual: number,
): QuantityReference {
  if (reference.bandStatus === "unavailable") return reference;
  return {
    ...reference,
    percentage: reference.p50 ? (actual / reference.p50) * 100 : 0,
    bandStatus:
      actual < reference.p25
        ? "below"
        : actual > reference.p75
          ? "above"
          : "within",
  };
}

export function normalizedQuantityReference(
  rows: MediaCapacityWeek[],
  focusDays: number,
  actual: number,
  metric:
    | "sessionUnits"
    | "uniqueStaffCount"
    | "shootWorkPoolCount"
    | "shootTaskCount"
    | "scheduledTaskCount"
    | "uniqueProductCount"
    | "outputTaskCount"
    | "videoTaskCount"
    | "graphicTaskCount",
) {
  if (rows.length < MIN_OFFICIAL_BASELINE_WEEKS) {
    return quantityReference([], actual);
  }
  const values = rows
    .filter((row) => row.workingDays > 0)
    .map((row) => {
      const value =
        metric === "shootWorkPoolCount"
          ? row.shootOpeningBacklogTasks.length + row.shootTasks.length
          : metric === "shootTaskCount"
          ? row.shootTasks.length
          : metric === "outputTaskCount"
          ? row.outputTasks.length
          : metric === "videoTaskCount"
            ? row.videoTasks.length
            : metric === "graphicTaskCount"
              ? row.graphicTasks.length
              : row[metric];
      return (value / row.workingDays) * focusDays;
    });
  return quantityReference(values, actual);
}

export function periodTaskReference(
  rows: MediaCapacityWeek[],
  focusDays: number,
  actual: number,
  metric: "shoot" | "output",
) {
  const values = rows
    .filter((row) => {
      const count =
        metric === "shoot"
          ? row.shootTasks.length
          : row.outputTasks.length;
      return row.workingDays > 0 && count > 0;
    })
    .map((row) => {
      const count =
        metric === "shoot"
          ? row.shootTasks.length
          : row.outputTasks.length;
      return (count / row.workingDays) * focusDays;
    });
  return quantityReference(values, actual);
}

export function medianReference(
  rows: MediaCapacityWeek[],
  focusDays: number,
  actualMinutes: number,
  metric: "shootMinutes" | "outputMinutes",
): CapacityReference {
  const perDay = rows
    .filter(
      (row) =>
        row.workingDays > 0 &&
        (row.shootMinutes > 0 || row.outputMinutes > 0),
    )
    .map((row) => row[metric] / row.workingDays);
  if (!perDay.length || focusDays <= 0) {
    return {
      p25Minutes: 0,
      p50Minutes: 0,
      p75Minutes: 0,
      percentage: 0,
      bandStatus: "unavailable",
    };
  }
  const p25Minutes = percentile(perDay, 0.25) * focusDays;
  const p50Minutes = percentile(perDay, 0.5) * focusDays;
  const p75Minutes = percentile(perDay, 0.75) * focusDays;
  return {
    p25Minutes,
    p50Minutes,
    p75Minutes,
    percentage: p50Minutes ? (actualMinutes / p50Minutes) * 100 : 0,
    bandStatus:
      actualMinutes < p25Minutes
        ? "below"
        : actualMinutes > p75Minutes
          ? "above"
          : "within",
  };
}
