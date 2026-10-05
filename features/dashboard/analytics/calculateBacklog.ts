import { EXCLUDED_BACKLOG_STATUSES } from "../model/constants";
import { startOfDay } from "@/shared/date/dateUtils";
import { normalizedKey } from "../model/taskUtils";
import { isReworkStatus } from "../model/slaUtils";
import type { Task } from "../model/types";

const FINISHED_STATUSES = new Set(["done", "kinh doanh done"]);
const EXCLUDED_BACKLOG_STAGES = new Set(["trainning", "training"]);

/** BOD từ chối và task đang được sửa lại thì vẫn là việc đang mở. */
function isOpenReworkTask(task: Task) {
  return (
    isReworkStatus(task.status) ||
    normalizedKey(task.bodApproval) === "đang sửa"
  );
}

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
  return (
    notInspectedAtCutoff ||
    status === "in progress" ||
    isOpenReworkTask(task)
  );
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

/**
 * Khoảng mốc (ms) mà task được tính tồn theo `isEndOfDayBacklogTask`:
 * tồn khi `from <= cutoff` và (`until === null` hoặc `cutoff < until`).
 * Tách phần không phụ thuộc mốc ra để chuỗi ngày chỉ còn so sánh số.
 */
export function endOfDayBacklogWindow(
  task: Task,
): { from: number; until: number | null } | null {
  const { startDate, inspectionDate } = task;
  // Ngay tại Ngày Bắt Đầu, task đã qua điều kiện "bắt đầu trước mốc".
  if (!startDate || !isEligibleAtCutoff(task, startDate)) return null;
  const status = normalizedKey(task.status);
  if (EXCLUDED_BACKLOG_STATUSES.has(status)) return null;
  if (isBacklogAttentionTask(task, startDate)) return null;
  const alwaysOpen =
    !inspectionDate || status === "in progress" || isOpenReworkTask(task);
  return {
    from: startDate.getTime(),
    until: alwaysOpen ? null : inspectionDate.getTime(),
  };
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
