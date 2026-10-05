import { dateKey, endOfDay, percentile, startOfDay } from "@/shared/date/dateUtils";
import type { MediaTrendGranularity, MediaTrendEvent, MediaTrendBucket, MediaTrendSeries, CapacityReference } from "./types";
import { startOfWeek, endOfWeek, addDays, weekLabel, dayLabel, monthLabel, startOfMonth, endOfMonth } from "./calendar";

function trendReference(
  rows: MediaTrendBucket[],
  metric: "shootMinutes" | "outputMinutes" | "totalMinutes",
): CapacityReference {
  const values = rows
    .filter((row) => row.isComplete)
    .map((row) => row[metric]);
  if (!values.length) {
    return {
      p25Minutes: 0,
      p50Minutes: 0,
      p75Minutes: 0,
      percentage: 0,
      bandStatus: "unavailable",
    };
  }
  return {
    p25Minutes: percentile(values, 0.25),
    p50Minutes: percentile(values, 0.5),
    p75Minutes: percentile(values, 0.75),
    percentage: 0,
    bandStatus: "within",
  };
}

export function calculateMediaTrendSeries(
  events: MediaTrendEvent[],
  from: Date | null,
  to: Date | null,
  granularity: MediaTrendGranularity,
  today = new Date(),
): MediaTrendSeries {
  if (!from || !to || from > to) {
    return {
      rows: [],
      shootReference: trendReference([], "shootMinutes"),
      outputReference: trendReference([], "outputMinutes"),
      totalReference: trendReference([], "totalMinutes"),
      granularity,
    };
  }
  const rangeStart = startOfDay(from);
  const rangeEnd = endOfDay(to);
  const todayStart = startOfDay(today);
  const bucketRanges: Array<{
    naturalStart: Date;
    naturalEnd: Date;
  }> = [];

  if (granularity === "day") {
    for (
      let cursor = rangeStart;
      cursor <= rangeEnd;
      cursor = addDays(cursor, 1)
    ) {
      bucketRanges.push({
        naturalStart: startOfDay(cursor),
        naturalEnd: endOfDay(cursor),
      });
    }
  } else if (granularity === "week") {
    for (
      let cursor = startOfWeek(rangeStart);
      cursor <= rangeEnd;
      cursor = addDays(cursor, 7)
    ) {
      bucketRanges.push({
        naturalStart: cursor,
        naturalEnd: endOfWeek(cursor),
      });
    }
  } else {
    for (
      let cursor = startOfMonth(rangeStart);
      cursor <= rangeEnd;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    ) {
      bucketRanges.push({
        naturalStart: cursor,
        naturalEnd: endOfMonth(cursor),
      });
    }
  }

  const rows = bucketRanges.flatMap(
    ({ naturalStart, naturalEnd }): MediaTrendBucket[] => {
      const start =
        naturalStart < rangeStart ? rangeStart : naturalStart;
      const end = naturalEnd > rangeEnd ? rangeEnd : naturalEnd;
      const bucketEvents = events.filter(
        (event) => event.date >= start && event.date <= end,
      );
      if (
        granularity === "day" &&
        start.getDay() === 0 &&
        bucketEvents.length === 0
      ) {
        return [];
      }
      const shootEvents = bucketEvents.filter(
        (event) => event.metric === "shoot",
      );
      const outputEvents = bucketEvents.filter(
        (event) => event.metric === "output",
      );
      const shootMinutes = shootEvents.reduce(
        (total, event) => total + event.minutes,
        0,
      );
      const outputMinutes = outputEvents.reduce(
        (total, event) => total + event.minutes,
        0,
      );
      const label =
        granularity === "day"
          ? dayLabel(start)
          : granularity === "week"
            ? weekLabel(naturalStart, naturalEnd)
            : monthLabel(naturalStart);
      return [
        {
          key: `${granularity}-${dateKey(naturalStart)}`,
          label,
          start,
          end,
          isComplete:
            start.getTime() === naturalStart.getTime() &&
            end.getTime() === naturalEnd.getTime() &&
            naturalEnd < todayStart,
          shootTasks: shootEvents.map((event) => event.task),
          outputTasks: outputEvents.map((event) => event.task),
          shootMinutes,
          outputMinutes,
          totalMinutes: shootMinutes + outputMinutes,
          rollingAverageMinutes: null,
        },
      ];
    },
  );
  const completeTotals: number[] = [];
  const rowsWithRollingAverage = rows.map((row) => {
    if (!row.isComplete) return row;
    completeTotals.push(row.totalMinutes);
    if (completeTotals.length < 4) return row;
    const rollingWindow = completeTotals.slice(-4);
    return {
      ...row,
      rollingAverageMinutes:
        rollingWindow.reduce((sum, value) => sum + value, 0) /
        rollingWindow.length,
    };
  });
  return {
    rows: rowsWithRollingAverage,
    shootReference: trendReference(
      rowsWithRollingAverage,
      "shootMinutes",
    ),
    outputReference: trendReference(
      rowsWithRollingAverage,
      "outputMinutes",
    ),
    totalReference: trendReference(
      rowsWithRollingAverage,
      "totalMinutes",
    ),
    granularity,
  };
}
