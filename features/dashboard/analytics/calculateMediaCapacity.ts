import { endOfDay, startOfDay } from "@/shared/date/dateUtils";
import type { DashboardData, MediaCapacitySnapshot, Task } from "../model/types";
import { assigneeNames, isFinalPublicationTask, normalizedKey, normMinutesFor } from "../model/taskUtils";
import type { MediaTrendEvent } from "./mediaCapacity/types";
import { BASELINE_WEEK_COUNT, OFFICIAL_BASELINE_WEEK_COUNT, TREND_WEEK_COUNT } from "./mediaCapacity/constants";
import { reconcileShootSessionTaskCounts } from "./mediaCapacity/shootSessions";
import { startOfWeek, endOfWeek, addDays } from "./mediaCapacity/calendar";
import { workingDaysBetween, isExcluded, isShootTask, calculateWeek } from "./mediaCapacity/week";
import { quantityReference, referenceForValue, normalizedQuantityReference, periodTaskReference, medianReference } from "./mediaCapacity/references";
import { calculateShootTypeBaselines } from "./mediaCapacity/shootTypeBaseline";

// API công khai giữ nguyên đường import cũ; phần cài đặt nằm trong mediaCapacity/.
export type {
  CapacityReference,
  MediaTrendBucket,
  MediaTrendGranularity,
  QuantityReference,
  ShootTypeBaselinePlan,
  ShootTypeBaselinePlanRow,
} from "./mediaCapacity/types";
export {
  calculateShootStaffContributions,
  calculateShootTaskMinutesByStaff,
  reconcileShootSessionTaskCounts,
} from "./mediaCapacity/shootSessions";
export { calculateMediaTrendSeries } from "./mediaCapacity/trend";
export {
  calculateShootTypeBaselinePlan,
  calculateShootTypeBaselines,
} from "./mediaCapacity/shootTypeBaseline";


function uniqueAssignees(tasks: Task[]) {
  return new Set(
    tasks.flatMap((task) =>
      assigneeNames(task.assignee).filter(
        (name) => name !== "Chưa có assignee",
      ),
    ),
  ).size;
}

export function calculateMediaCapacity(
  data: DashboardData,
  reportingDate: Date,
  today = new Date(),
  focusRange?: { from: Date; to: Date },
) {
  const reportingWeekStart = startOfWeek(reportingDate);
  const reportingWeekEnd = endOfWeek(reportingWeekStart);
  const hasValidFocusRange = Boolean(
    focusRange && focusRange.from <= focusRange.to,
  );
  const focusStart = hasValidFocusRange
    ? startOfDay(focusRange!.from)
    : reportingWeekStart;
  const focusEnd = hasValidFocusRange
    ? endOfDay(focusRange!.to)
    : reportingWeekEnd;
  const currentDay = endOfDay(today);
  const focusCutoff =
    focusEnd < currentDay
      ? focusEnd
      : focusStart > currentDay
        ? addDays(focusStart, -1)
        : currentDay;
  const normMap = new Map(
    data.norms.map((norm) => [normalizedKey(norm.formatType), norm]),
  );
  const standardMinutes = new Map<Task, number>();
  const eligibleTasks = data.tasks.filter((task) => !isExcluded(task));
  const reconciledData = {
    ...data,
    shootSessions: reconcileShootSessionTaskCounts(
      data.shootSessions ?? [],
      data.tasks,
    ),
  };
  const shootSourceTasks = eligibleTasks.filter(isShootTask);
  const outputSourceTasks = eligibleTasks.filter(isFinalPublicationTask);
  const trendEvents: MediaTrendEvent[] = [];
  for (const task of shootSourceTasks) {
    const minutes = normMinutesFor(task, normMap) ?? 0;
    if (minutes > 0) standardMinutes.set(task, minutes);
    if (task.startDate) {
      trendEvents.push({
        metric: "shoot",
        date: task.startDate,
        minutes,
        task,
      });
    }
  }
  for (const task of outputSourceTasks) {
    const minutes = normMinutesFor(task, normMap) ?? 0;
    if (minutes > 0) standardMinutes.set(task, minutes);
    if (task.inspectionDate) {
      trendEvents.push({
        metric: "output",
        date: task.inspectionDate,
        minutes,
        task,
      });
    }
  }
  const trendDates = trendEvents
    .map((event) => event.date)
    .sort((left, right) => left.getTime() - right.getTime());
  const trendWeeks = Array.from(
    { length: TREND_WEEK_COUNT },
    (_, index) => {
      const start = addDays(
        reportingWeekStart,
        (index - TREND_WEEK_COUNT + 1) * 7,
      );
      const cutoff =
        index === TREND_WEEK_COUNT - 1
          ? reportingWeekEnd < currentDay
            ? reportingWeekEnd
            : reportingWeekStart > currentDay
              ? addDays(reportingWeekStart, -1)
              : currentDay
          : endOfWeek(start);
      return calculateWeek(
        reconciledData,
        shootSourceTasks,
        outputSourceTasks,
        start,
        cutoff,
        normMap,
        standardMinutes,
      );
    },
  );
  const focusWeek = calculateWeek(
    reconciledData,
    shootSourceTasks,
    outputSourceTasks,
    focusStart,
    focusCutoff,
    normMap,
    standardMinutes,
    focusEnd,
  );
  const focusFullWeek = calculateWeek(
    reconciledData,
    shootSourceTasks,
    outputSourceTasks,
    focusStart,
    focusEnd,
    normMap,
    standardMinutes,
    focusEnd,
  );
  const baselineWeeks = trendWeeks
    .slice(0, -1)
    .slice(-BASELINE_WEEK_COUNT);
  const elapsedWorkingDays =
    focusCutoff < focusStart
      ? 0
      : workingDaysBetween(
          focusStart,
          focusCutoff < focusEnd ? focusCutoff : focusEnd,
        );
  const comparisonDays =
    focusEnd < currentDay
      ? focusWeek.workingDays
      : elapsedWorkingDays;
  const shootReference = medianReference(
    baselineWeeks,
    comparisonDays,
    focusWeek.shootMinutes,
    "shootMinutes",
  );
  const outputReference = medianReference(
    baselineWeeks,
    comparisonDays,
    focusWeek.outputMinutes,
    "outputMinutes",
  );
  const shootTaskReference = periodTaskReference(
    baselineWeeks,
    comparisonDays,
    focusWeek.shootTasks.length,
    "shoot",
  );
  const outputTaskReference = periodTaskReference(
    baselineWeeks,
    comparisonDays,
    focusWeek.outputTasks.length,
    "output",
  );
  const sessionBaselineWeeks = baselineWeeks.filter(
    (row) => row.shootSessions.length > 0 && row.sessionUnits > 0,
  );
  const outputBaselineWeeks = baselineWeeks.filter(
    (row) => row.outputTasks.length > 0,
  );
  const sessionReference = quantityReference(
    sessionBaselineWeeks.map((row) => row.sessionUnits),
    focusWeek.sessionUnits,
  );
  const scheduledTaskReference = quantityReference(
    sessionBaselineWeeks.map((row) => row.scheduledTaskCount),
    focusWeek.scheduledTaskCount,
  );
  const productReference = quantityReference(
    sessionBaselineWeeks.map((row) => row.uniqueProductCount),
    focusWeek.uniqueProductCount,
  );
  const outputCountReference = quantityReference(
    outputBaselineWeeks.map((row) => row.outputTasks.length),
    focusWeek.outputTasks.length,
  );
  const videoCountReference = quantityReference(
    outputBaselineWeeks.map((row) => row.videoTasks.length),
    focusWeek.videoTasks.length,
  );
  const graphicCountReference = quantityReference(
    outputBaselineWeeks.map((row) => row.graphicTasks.length),
    focusWeek.graphicTasks.length,
  );
  const baselineMonthStart = new Date(
    focusEnd.getFullYear(),
    focusEnd.getMonth(),
    1,
  );
  const officialBaselineLastStart = addDays(
    startOfWeek(baselineMonthStart),
    -7,
  );
  const officialBaselineWeeks = Array.from(
    { length: OFFICIAL_BASELINE_WEEK_COUNT },
    (_, index) => {
      const start = addDays(
        officialBaselineLastStart,
        (index - OFFICIAL_BASELINE_WEEK_COUNT + 1) * 7,
      );
      return calculateWeek(
        reconciledData,
        shootSourceTasks,
        outputSourceTasks,
        start,
        endOfWeek(start),
        normMap,
        standardMinutes,
      );
    },
  );
  const officialSessionWeeks = officialBaselineWeeks.filter(
    (row) => row.sessionUnits > 0,
  );
  const officialStaffWeeks = officialSessionWeeks.filter(
    (row) => row.uniqueStaffCount > 0,
  );
  const officialOutputWeeks = officialBaselineWeeks.filter(
    (row) => row.outputTasks.length > 0,
  );
  const isCompleteWeek = focusEnd < currentDay;
  const forecastOutputCount =
    isCompleteWeek || elapsedWorkingDays <= 0
      ? focusWeek.outputTasks.length
      : (focusWeek.outputTasks.length / elapsedWorkingDays) *
        focusWeek.workingDays;
  const forecastVideoCount =
    isCompleteWeek || elapsedWorkingDays <= 0
      ? focusWeek.videoTasks.length
      : (focusWeek.videoTasks.length / elapsedWorkingDays) *
        focusWeek.workingDays;
  const forecastGraphicCount =
    isCompleteWeek || elapsedWorkingDays <= 0
      ? focusWeek.graphicTasks.length
      : (focusWeek.graphicTasks.length / elapsedWorkingDays) *
        focusWeek.workingDays;
  const officialSessionReference = referenceForValue(
    normalizedQuantityReference(
      officialSessionWeeks,
      focusWeek.workingDays,
      focusFullWeek.sessionUnits,
      "sessionUnits",
    ),
    focusFullWeek.sessionUnits,
  );
  const officialDemandReference = referenceForValue(
    normalizedQuantityReference(
      officialBaselineWeeks,
      focusWeek.workingDays,
      focusWeek.shootOpeningBacklogTasks.length + focusWeek.shootTasks.length,
      "shootWorkPoolCount",
    ),
    focusWeek.shootOpeningBacklogTasks.length + focusWeek.shootTasks.length,
  );
  const officialScheduledTaskReference = referenceForValue(
    normalizedQuantityReference(
      officialSessionWeeks,
      focusWeek.workingDays,
      focusFullWeek.scheduledTaskCount,
      "scheduledTaskCount",
    ),
    focusFullWeek.scheduledTaskCount,
  );
  const officialUniqueStaffReference = referenceForValue(
    normalizedQuantityReference(
      officialStaffWeeks,
      focusWeek.workingDays,
      focusFullWeek.uniqueStaffCount,
      "uniqueStaffCount",
    ),
    focusFullWeek.uniqueStaffCount,
  );
  const officialProductReference = referenceForValue(
    normalizedQuantityReference(
      officialSessionWeeks,
      focusWeek.workingDays,
      focusFullWeek.uniqueProductCount,
      "uniqueProductCount",
    ),
    focusFullWeek.uniqueProductCount,
  );
  const officialOutputReference = referenceForValue(
    normalizedQuantityReference(
      officialOutputWeeks,
      focusWeek.workingDays,
      forecastOutputCount,
      "outputTaskCount",
    ),
    forecastOutputCount,
  );
  const officialVideoReference = referenceForValue(
    normalizedQuantityReference(
      officialOutputWeeks,
      focusWeek.workingDays,
      forecastVideoCount,
      "videoTaskCount",
    ),
    forecastVideoCount,
  );
  const officialGraphicReference = referenceForValue(
    normalizedQuantityReference(
      officialOutputWeeks,
      focusWeek.workingDays,
      forecastGraphicCount,
      "graphicTaskCount",
    ),
    forecastGraphicCount,
  );
  const baselineShortDate = (value: Date) =>
    `${String(value.getDate()).padStart(2, "0")}/${String(
      value.getMonth() + 1,
    ).padStart(2, "0")}/${value.getFullYear()}`;
  const officialBaseline = {
    versionLabel: `${String(baselineMonthStart.getMonth() + 1).padStart(
      2,
      "0",
    )}/${baselineMonthStart.getFullYear()}`,
    windowLabel: `${baselineShortDate(
      officialBaselineWeeks[0].start,
    )}–${baselineShortDate(
      officialBaselineWeeks.at(-1)?.end ??
        endOfWeek(officialBaselineLastStart),
    )}`,
    weeks: officialBaselineWeeks,
    sessionWeekCount: officialSessionWeeks.length,
    outputWeekCount: officialOutputWeeks.length,
    demandReference: officialDemandReference,
    sessionReference: officialSessionReference,
    scheduledTaskReference: officialScheduledTaskReference,
    uniqueStaffReference: officialUniqueStaffReference,
    productReference: officialProductReference,
    outputReference: officialOutputReference,
    videoReference: officialVideoReference,
    graphicReference: officialGraphicReference,
    shootTypes: calculateShootTypeBaselines(
      officialBaselineWeeks.flatMap((week) => week.shootSessions),
    ),
  };
  const baselineWeekCount = baselineWeeks.filter(
    (row) => row.shootMinutes > 0 || row.outputMinutes > 0,
  ).length;
  const snapshot: Omit<MediaCapacitySnapshot, "savedAt"> = {
    version: 1,
    weekKey: focusWeek.key,
    weekLabel: focusWeek.label,
    baselineWeekCount: Math.min(
      officialBaseline.sessionWeekCount,
      officialBaseline.outputWeekCount,
    ),
    workingDays: focusWeek.workingDays,
    elapsedWorkingDays,
    shootActualMinutes: focusWeek.shootMinutes,
    shootReferenceMinutes: shootReference.p50Minutes,
    outputActualMinutes: focusWeek.outputMinutes,
    outputReferenceMinutes: outputReference.p50Minutes,
    shootTaskCount: focusWeek.shootTasks.length,
    outputTaskCount: focusWeek.outputTasks.length,
    shootLinkCoverage: focusWeek.shootTasks.length
      ? (focusWeek.linkedShootTasks.length /
          focusWeek.shootTasks.length) *
        100
      : 0,
    sessionUnits: focusWeek.sessionUnits,
    sessionReferenceUnits: officialBaseline.sessionReference.p50,
    scheduledTaskCount: focusWeek.scheduledTaskCount,
    scheduledTaskReferenceCount:
      officialBaseline.scheduledTaskReference.p50,
    uniqueProductCount: focusWeek.uniqueProductCount,
    productReferenceCount: officialBaseline.productReference.p50,
    outputCountReference: officialBaseline.outputReference.p50,
    videoTaskCount: focusWeek.videoTasks.length,
    videoReferenceCount: officialBaseline.videoReference.p50,
    graphicTaskCount: focusWeek.graphicTasks.length,
    graphicReferenceCount: officialBaseline.graphicReference.p50,
    baselineVersion: officialBaseline.versionLabel,
    forecastSessionUnits: focusFullWeek.sessionUnits,
    forecastScheduledTaskCount: focusFullWeek.scheduledTaskCount,
    forecastUniqueProductCount: focusFullWeek.uniqueProductCount,
    uniqueStaffCount: focusFullWeek.uniqueStaffCount,
    uniqueStaffReferenceCount:
      officialBaseline.uniqueStaffReference.p50,
    forecastOutputTaskCount: forecastOutputCount,
  };

  return {
    focusWeek,
    trendWeeks,
    trendEvents,
    trendDateRange: {
      from: trendDates[0] ?? null,
      to: trendDates.at(-1) ?? null,
    },
    baselineWeeks,
    baselineWeekCount,
    elapsedWorkingDays,
    comparisonDays,
    shootReference,
    outputReference,
    shootTaskReference,
    outputTaskReference,
    sessionReference,
    scheduledTaskReference,
    productReference,
    outputCountReference,
    videoCountReference,
    graphicCountReference,
    officialBaseline,
    shootTypeSessions: reconciledData.shootSessions,
    focusFullWeek,
    forecastOutputCount,
    forecastVideoCount,
    forecastGraphicCount,
    isCompleteWeek,
    standardMinutes,
    activeAssignees: uniqueAssignees([
      ...focusWeek.shootTasks,
      ...focusWeek.outputTasks,
    ]),
    snapshot,
    asOfDate: focusCutoff >= focusStart ? focusCutoff : null,
  };
}

export type MediaCapacityStats = ReturnType<
  typeof calculateMediaCapacity
>;
