import { EXCLUDED_BACKLOG_STATUSES } from "../model/constants";
import { normalizedKey } from "../model/taskUtils";
import type { Task } from "../model/types";

export function calculateBacklog(tasks: Task[], cutoff: Date) {
  return tasks.filter((task) => {
    if (!task.startDate || task.startDate > cutoff) return false;
    return !EXCLUDED_BACKLOG_STATUSES.has(normalizedKey(task.status));
  });
}
