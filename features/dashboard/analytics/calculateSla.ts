import { EXCLUDED_BACKLOG_STATUSES } from "../model/constants";
import {
  agingBucket,
  assigneeNames,
  cycleBucket,
  groupCount,
  inWindow,
  normalizedKey,
} from "../model/taskUtils";
import {
  evaluateHandoff,
  handoffLateMinutes,
  lateMinuteBucket,
} from "../model/slaUtils";
import type {
  DashboardData,
  DateWindow,
  StaffTimeOfDayRow,
  Task,
} from "../model/types";
import {
  businessMinutesBetween,
  calendarDaysBetween,
  operationalMinute,
  percentile,
} from "@/shared/date/dateUtils";
import { calculateNormMetrics } from "./calculateNormMetrics";

function calculateStaffTimeOfDayRows(
  tasks: Task[],
  dateWindow: DateWindow,
) {
  const rowsByPerson = new Map<string, StaffTimeOfDayRow>();

  for (const task of tasks) {
    const hasInspection =
      Boolean(task.inspectionDate) &&
      inWindow(task.inspectionDate, dateWindow);
    const hasCompletion =
      Boolean(task.completedDate) &&
      inWindow(task.completedDate, dateWindow);
    if (!hasInspection && !hasCompletion) continue;

    for (const name of assigneeNames(task.assignee)) {
      const row = rowsByPerson.get(name) ?? {
        name,
        inspectionTimes: [],
        completionTimes: [],
        inspectionTasks: [],
        completionTasks: [],
      };
      if (hasInspection) {
        row.inspectionTasks.push(task);
        row.inspectionTimes.push(operationalMinute(task.inspectionDate!));
      }
      if (hasCompletion) {
        row.completionTasks.push(task);
        row.completionTimes.push(operationalMinute(task.completedDate!));
      }
      rowsByPerson.set(name, row);
    }
  }

  return Array.from(rowsByPerson.values()).sort(
    (a, b) =>
      b.inspectionTasks.length +
      b.completionTasks.length -
      (a.inspectionTasks.length + a.completionTasks.length),
  );
}

export function calculateSla(
  data: DashboardData,
  selectedTasks: Task[],
  dateWindow: DateWindow,
  backlogCutoff: Date,
  reportingDate: Date,
) {
  const completedCohort = data.tasks.filter(
    (task) =>
      task.completedDate && inWindow(task.completedDate, dateWindow),
  );
  const cycleRows = completedCohort
    .map((task) => ({
      task,
      days: calendarDaysBetween(task.startDate, task.completedDate),
    }))
    .filter(
      (row): row is { task: Task; days: number } => row.days !== null,
    );
  const openAgingRows = data.tasks
    .filter(
      (task) =>
        task.startDate &&
        task.startDate <= backlogCutoff &&
        !EXCLUDED_BACKLOG_STATUSES.has(normalizedKey(task.status)),
    )
    .map((task) => ({
      task,
      days: calendarDaysBetween(task.startDate, backlogCutoff),
    }))
    .filter(
      (row): row is { task: Task; days: number } =>
        row.days !== null && row.days >= 0,
    );
  const checkingToDoneRows = completedCohort
    .map((task) => ({
      task,
      minutes: businessMinutesBetween(
        task.inspectionDate,
        task.completedDate,
      ),
    }))
    .filter(
      (row): row is { task: Task; minutes: number } =>
        row.minutes !== null,
    );
  const handoffEvaluations = selectedTasks.map((task) => ({
    task,
    evaluation: evaluateHandoff(task, reportingDate),
  }));
  const handedForKpi = handoffEvaluations.filter((row) =>
    ["onTime", "late"].includes(row.evaluation.code),
  );
  const onTimeHandoffs = handedForKpi.filter(
    (row) => row.evaluation.code === "onTime",
  );
  const overdueHandoffs = handoffEvaluations.filter(
    (row) => row.evaluation.code === "overdue",
  );
  const lateHandoffs = handedForKpi
    .filter((row) => row.evaluation.code === "late")
    .map((row) => ({
      task: row.task,
      minutes: handoffLateMinutes(row.task),
    }));

  return {
    handoffEvaluations,
    handedForKpi,
    onTimeHandoffs,
    overdueHandoffs,
    lateHandoffs,
    handoffOnTimeRate: handedForKpi.length
      ? (onTimeHandoffs.length / handedForKpi.length) * 100
      : 0,
    handoffLateP50: percentile(
      lateHandoffs.map((row) => row.minutes),
      0.5,
    ),
    handoffLateDistribution: groupCount(
      lateHandoffs,
      (row) => lateMinuteBucket(row.minutes),
    ),
    completedCohort,
    cycleRows,
    cycleDistribution: groupCount(cycleRows, (row) =>
      cycleBucket(row.days),
    ),
    cycleP50: percentile(
      cycleRows.map((row) => row.days),
      0.5,
    ),
    cycleP90: percentile(
      cycleRows.map((row) => row.days),
      0.9,
    ),
    openAgingRows,
    agingDistribution: groupCount(openAgingRows, (row) =>
      agingBucket(row.days),
    ),
    checkingToDoneRows,
    staffTimeOfDayRows: calculateStaffTimeOfDayRows(
      data.tasks,
      dateWindow,
    ),
    checkingToDoneP50: percentile(
      checkingToDoneRows.map((row) => row.minutes),
      0.5,
    ),
    checkingToDoneP90: percentile(
      checkingToDoneRows.map((row) => row.minutes),
      0.9,
    ),
    ...calculateNormMetrics(selectedTasks, data.norms),
  };
}
