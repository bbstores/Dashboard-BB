import { assigneeNames, normalizedKey } from "../model/taskUtils";
import type { Task } from "../model/types";
import type { ClassifiedTask, LeaderboardRow } from "./types";

type LeaderboardValues = Omit<LeaderboardRow, "label">;

function emptyLeaderboardValues(): LeaderboardValues {
  return {
    value: 0,
    started: 0,
    carried: 0,
    waiting: 0,
    tasks: [],
    startedTasks: [],
    carriedTasks: [],
    waitingTasks: [],
  };
}

function isWaitingTask(task: Task) {
  return [
    "to do",
    "todo",
    "pending / cancel",
    "pending/cancel",
  ].includes(normalizedKey(task.status));
}

export function calculateLeaderboard(
  classified: ClassifiedTask[],
): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardValues>();

  for (const item of classified) {
    if (!item.started && !item.inspectionCarry) continue;
    for (const name of assigneeNames(item.task.assignee)) {
      const current = rows.get(name) ?? emptyLeaderboardValues();
      current.value += item.task.expectedMinutes;
      current.tasks.push(item.task);

      if (isWaitingTask(item.task)) {
        current.waiting += item.task.expectedMinutes;
        current.waitingTasks.push(item.task);
      } else if (item.inspectionCarry) {
        current.carried += item.task.expectedMinutes;
        current.carriedTasks.push(item.task);
      } else {
        current.started += item.task.expectedMinutes;
        current.startedTasks.push(item.task);
      }
      rows.set(name, current);
    }
  }

  return Array.from(rows.entries())
    .map(([label, values]) => ({ label, ...values }))
    .sort((a, b) => b.value - a.value);
}
