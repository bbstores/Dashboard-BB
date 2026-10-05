import { dateKey, startOfDay } from "@/shared/date/dateUtils";
import { isHolidayKey } from "@/shared/date/constants";
import type { DashboardData, Task, WorkNorm } from "../../model/types";
import { normalizedKey, normMinutesFor } from "../../model/taskUtils";
import type { MediaCapacityWeek } from "./types";
import { uniqueShootStaffCount } from "./shootSessions";
import { endOfWeek, addDays, weekLabel } from "./calendar";

function isWorkingDay(value: Date) {
  return (
    value.getDay() !== 0 &&
    !isHolidayKey(dateKey(value))
  );
}

export function workingDaysBetween(start: Date, end: Date) {
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

export function isExcluded(task: Task) {
  const status = normalizedKey(task.status).replace(/\s*\/\s*/g, "/");
  return (
    !task.title.trim() ||
    Boolean(normalizedKey(task.outsource)) ||
    status === "pending/cancel"
  );
}

export function isShootTask(task: Task) {
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

export function calculateWeek(
  data: DashboardData,
  shootSourceTasks: Task[],
  outputSourceTasks: Task[],
  start: Date,
  cutoff: Date,
  normMap: Map<string, WorkNorm>,
  standardMinutes: Map<Task, number>,
  periodEnd?: Date,
): MediaCapacityWeek {
  const end = periodEnd ?? endOfWeek(start);
  const shootTasks = shootSourceTasks.filter(
    (task) =>
      eventInWeek(task.startDate, start, end, cutoff),
  );
  const shootOpeningBacklogTasks = shootSourceTasks.filter(
    (task) =>
      ((task.startDate && task.startDate < start) ||
        (!task.startDate &&
          eventInWeek(task.inspectionDate, start, end, cutoff))) &&
      (!task.inspectionDate || task.inspectionDate >= start),
  );
  const shootHandedTasks = shootSourceTasks.filter((task) =>
    eventInWeek(task.inspectionDate, start, end, cutoff),
  );
  const shootHandedCarryTasks = shootHandedTasks.filter(
    (task) => !task.startDate || task.startDate < start,
  );
  const shootHandedNewTasks = shootHandedTasks.filter(
    (task) => task.startDate && task.startDate >= start,
  );
  const shootClosingBacklogTasks = [
    ...shootOpeningBacklogTasks,
    ...shootTasks,
  ].filter(
    (task) => !task.inspectionDate || task.inspectionDate > cutoff,
  );
  const linkedShootTasks = shootTasks.filter((task) =>
    Boolean(normalizedKey(task.shootSession)),
  );
  const linkedShootSet = new Set(linkedShootTasks);
  const unlinkedShootTasks = shootTasks.filter(
    (task) => !linkedShootSet.has(task),
  );
  const shootSessions = (data.shootSessions ?? []).filter((session) =>
    eventInWeek(session.date, start, end, cutoff),
  );
  const sessionUnits = shootSessions.reduce(
    (total, session) => total + session.sessionUnits,
    0,
  );
  const scheduledTaskCount = shootSessions.reduce(
    (total, session) => total + session.taskCount,
    0,
  );
  const uniqueProductCount = new Set(
    shootSessions.flatMap((session) => session.productCodes),
  ).size;
  const uniqueStaffCount = uniqueShootStaffCount(shootSessions);
  const outputTasks = outputSourceTasks.filter(
    (task) =>
      eventInWeek(task.inspectionDate, start, end, cutoff),
  );
  const outputOpeningBacklogTasks = outputSourceTasks.filter(
    (task) =>
      ((task.startDate && task.startDate < start) ||
        (!task.startDate &&
          eventInWeek(task.inspectionDate, start, end, cutoff))) &&
      (!task.inspectionDate || task.inspectionDate >= start),
  );
  const outputStartedTasks = outputSourceTasks.filter((task) =>
    eventInWeek(task.startDate, start, end, cutoff),
  );
  const outputHandedCarryTasks = outputTasks.filter(
    (task) => !task.startDate || task.startDate < start,
  );
  const outputHandedNewTasks = outputTasks.filter(
    (task) => task.startDate && task.startDate >= start,
  );
  const outputClosingBacklogTasks = [
    ...outputOpeningBacklogTasks,
    ...outputStartedTasks,
  ].filter(
    (task) => !task.inspectionDate || task.inspectionDate > cutoff,
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
    shootOpeningBacklogTasks,
    shootHandedTasks,
    shootHandedCarryTasks,
    shootHandedNewTasks,
    shootClosingBacklogTasks,
    linkedShootTasks,
    unlinkedShootTasks,
    shootSessions,
    sessionUnits,
    scheduledTaskCount,
    uniqueProductCount,
    uniqueStaffCount,
    outputTasks,
    outputOpeningBacklogTasks,
    outputStartedTasks,
    outputHandedCarryTasks,
    outputHandedNewTasks,
    outputClosingBacklogTasks,
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
