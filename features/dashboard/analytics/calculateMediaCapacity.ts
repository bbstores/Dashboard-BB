import {
  dateKey,
  endOfDay,
  percentile,
  startOfDay,
} from "@/shared/date/dateUtils";
import { VIETNAM_HOLIDAYS_2026 } from "@/shared/date/constants";
import type {
  DashboardData,
  MediaCapacitySnapshot,
  Task,
  WorkNorm,
} from "../model/types";
import {
  assigneeNames,
  isFinalPublicationTask,
  normalizedKey,
  normMinutesFor,
} from "../model/taskUtils";

export type MediaCapacityWeek = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  workingDays: number;
  shootTasks: Task[];
  outputTasks: Task[];
  shootMinutes: number;
  outputMinutes: number;
  shootMapped: number;
  outputMapped: number;
  videoTasks: Task[];
  graphicTasks: Task[];
  onTimeTasks: Task[];
  lateTasks: Task[];
  unassessedTasks: Task[];
  feedbackRows: Array<
    DashboardData["feedback"][number] & { task?: Task }
  >;
};

export type CapacityReference = {
  p25Minutes: number;
  p50Minutes: number;
  p75Minutes: number;
  percentage: number;
  bandStatus: "below" | "within" | "above" | "unavailable";
};

const BASELINE_WEEK_COUNT = 8;
const TREND_WEEK_COUNT = 12;

function startOfWeek(value: Date) {
  const result = startOfDay(value);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function endOfWeek(value: Date) {
  const result = startOfWeek(value);
  result.setDate(result.getDate() + 6);
  return endOfDay(result);
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function weekLabel(start: Date, end: Date) {
  const short = (value: Date) =>
    `${String(value.getDate()).padStart(2, "0")}/${String(
      value.getMonth() + 1,
    ).padStart(2, "0")}`;
  return `${short(start)}–${short(end)}`;
}

function isWorkingDay(value: Date) {
  return (
    value.getDay() !== 0 &&
    !VIETNAM_HOLIDAYS_2026.has(dateKey(value))
  );
}

function workingDaysBetween(start: Date, end: Date) {
  let count = 0;
  for (
    let cursor = startOfDay(start);
    cursor <= end;
    cursor = addDays(cursor, 1)
  ) {
    if (isWorkingDay(cursor)) count += 1;
  }
  return count;
}

function isExcluded(task: Task) {
  const status = normalizedKey(task.status).replace(/\s*\/\s*/g, "/");
  return (
    !task.title.trim() ||
    Boolean(normalizedKey(task.outsource)) ||
    status === "pending/cancel"
  );
}

function isShootTask(task: Task) {
  const stage = normalizedKey(task.stage);
  return stage === "quay" || stage === "chụp";
}

function eventInWeek(
  value: Date | null,
  start: Date,
  end: Date,
  cutoff: Date,
) {
  return Boolean(
    value && value >= start && value <= end && value <= cutoff,
  );
}

function isOnTime(task: Task) {
  return normalizedKey(task.handoffRating).includes(
    "bàn giao đúng hạn",
  );
}

function isLate(task: Task) {
  const rating = normalizedKey(task.handoffRating);
  return rating.includes("trễ hạn") || rating.includes("quá hạn");
}

function sumMappedMinutes(
  tasks: Task[],
  normMap: Map<string, WorkNorm>,
  standardMinutes: Map<Task, number>,
) {
  let minutes = 0;
  let mapped = 0;
  for (const task of tasks) {
    const normMinutes = normMinutesFor(task, normMap);
    if (normMinutes === null) continue;
    standardMinutes.set(task, normMinutes);
    minutes += normMinutes;
    mapped += 1;
  }
  return { minutes, mapped };
}

function calculateWeek(
  data: DashboardData,
  start: Date,
  cutoff: Date,
  normMap: Map<string, WorkNorm>,
  standardMinutes: Map<Task, number>,
): MediaCapacityWeek {
  const end = endOfWeek(start);
  const eligibleTasks = data.tasks.filter((task) => !isExcluded(task));
  const shootTasks = eligibleTasks.filter(
    (task) =>
      isShootTask(task) &&
      eventInWeek(task.startDate, start, end, cutoff),
  );
  const outputTasks = eligibleTasks.filter(
    (task) =>
      isFinalPublicationTask(task) &&
      eventInWeek(task.inspectionDate, start, end, cutoff),
  );
  const shoot = sumMappedMinutes(
    shootTasks,
    normMap,
    standardMinutes,
  );
  const output = sumMappedMinutes(
    outputTasks,
    normMap,
    standardMinutes,
  );
  const videoTasks = outputTasks.filter((task) =>
    normalizedKey(task.formatType).includes("video"),
  );
  const videoSet = new Set(videoTasks);
  const graphicTasks = outputTasks.filter((task) => !videoSet.has(task));
  const onTimeTasks = outputTasks.filter(isOnTime);
  const lateTasks = outputTasks.filter(isLate);
  const assessedSet = new Set([...onTimeTasks, ...lateTasks]);
  const unassessedTasks = outputTasks.filter(
    (task) => !assessedSet.has(task),
  );
  const outputByCode = new Map(
    outputTasks.map((task) => [normalizedKey(task.code), task]),
  );
  const feedbackRows = data.feedback
    .filter(
      (row) =>
        row.at &&
        row.at >= start &&
        row.at <= end &&
        row.at <= cutoff &&
        outputByCode.has(normalizedKey(row.taskCode)),
    )
    .map((row) => ({
      ...row,
      task: outputByCode.get(normalizedKey(row.taskCode)),
    }));

  return {
    key: dateKey(start),
    label: weekLabel(start, end),
    start,
    end,
    workingDays: workingDaysBetween(start, end),
    shootTasks,
    outputTasks,
    shootMinutes: shoot.minutes,
    outputMinutes: output.minutes,
    shootMapped: shoot.mapped,
    outputMapped: output.mapped,
    videoTasks,
    graphicTasks,
    onTimeTasks,
    lateTasks,
    unassessedTasks,
    feedbackRows,
  };
}

function medianReference(
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
) {
  const focusStart = startOfWeek(reportingDate);
  const focusEnd = endOfWeek(focusStart);
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
  const trendWeeks = Array.from(
    { length: TREND_WEEK_COUNT },
    (_, index) => {
      const start = addDays(
        focusStart,
        (index - TREND_WEEK_COUNT + 1) * 7,
      );
      const cutoff =
        index === TREND_WEEK_COUNT - 1
          ? focusCutoff
          : endOfWeek(start);
      return calculateWeek(
        data,
        start,
        cutoff,
        normMap,
        standardMinutes,
      );
    },
  );
  const focusWeek = trendWeeks.at(-1) as MediaCapacityWeek;
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
  const baselineWeekCount = baselineWeeks.filter(
    (row) => row.shootMinutes > 0 || row.outputMinutes > 0,
  ).length;
  const snapshot: Omit<MediaCapacitySnapshot, "savedAt"> = {
    version: 1,
    weekKey: focusWeek.key,
    weekLabel: focusWeek.label,
    baselineWeekCount,
    workingDays: focusWeek.workingDays,
    elapsedWorkingDays,
    shootActualMinutes: focusWeek.shootMinutes,
    shootReferenceMinutes: shootReference.p50Minutes,
    outputActualMinutes: focusWeek.outputMinutes,
    outputReferenceMinutes: outputReference.p50Minutes,
    shootTaskCount: focusWeek.shootTasks.length,
    outputTaskCount: focusWeek.outputTasks.length,
  };

  return {
    focusWeek,
    trendWeeks,
    baselineWeeks,
    baselineWeekCount,
    elapsedWorkingDays,
    comparisonDays,
    shootReference,
    outputReference,
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
