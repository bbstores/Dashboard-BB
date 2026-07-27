import { EXCLUDED_BACKLOG_STATUSES } from "../model/constants";
import { startOfDay } from "@/shared/date/dateUtils";
import { normalizedKey } from "../model/taskUtils";
import type { Task } from "../model/types";

const FINISHED_STATUSES = new Set(["done", "kinh doanh done"]);
const EXCLUDED_BACKLOG_STAGES = new Set(["trainning", "training"]);

function isEligibleAtCutoff(task: Task, cutoff: Date) {
  return Boolean(
    task.startDate &&
    task.startDate <= cutoff &&
    !normalizedKey(task.outsource) &&
    !EXCLUDED_BACKLOG_STAGES.has(normalizedKey(task.stage)),
  );
}

export function isBacklogAttentionTask(task: Task, cutoff: Date) {
  if (!isEligibleAtCutoff(task, cutoff)) return false;
  if (
    !task.startDate ||
    !task.inspectionDate ||
    !FINISHED_STATUSES.has(normalizedKey(task.status))
  ) {
    return false;
  }
  return (
    startOfDay(task.startDate) > startOfDay(task.inspectionDate)
  );
}

function isBacklogAtCutoff(task: Task, cutoff: Date) {
  if (!isEligibleAtCutoff(task, cutoff)) return false;
  const status = normalizedKey(task.status);
  if (EXCLUDED_BACKLOG_STATUSES.has(status)) return false;
  if (isBacklogAttentionTask(task, cutoff)) return false;
  const notInspectedAtCutoff =
    !task.inspectionDate || task.inspectionDate > cutoff;
  return notInspectedAtCutoff || status === "in progress";
}

/**
 * Task tồn từ trước ngày mốc (< ngày xét):
 * dùng cho KPI, Aging và trạng thái task tồn.
 */
export function isBacklogTask(task: Task, cutoff: Date) {
  return Boolean(
    isBacklogAtCutoff(task, cutoff) &&
    task.startDate &&
    startOfDay(task.startDate) < startOfDay(cutoff),
  );
}

/** Task còn tồn đến hết ngày (<= ngày xét): dùng cho đường Tồn cuối ngày. */
export function isEndOfDayBacklogTask(task: Task, cutoff: Date) {
  return isBacklogAtCutoff(task, cutoff);
}

export function calculateBacklogBreakdown(tasks: Task[], cutoff: Date) {
  return {
    backlogTasks: tasks.filter((task) => isBacklogTask(task, cutoff)),
    attentionTasks: tasks.filter((task) =>
      isBacklogAttentionTask(task, cutoff),
    ),
  };
}

export function calculateBacklog(tasks: Task[], cutoff: Date) {
  return calculateBacklogBreakdown(tasks, cutoff).backlogTasks;
}
