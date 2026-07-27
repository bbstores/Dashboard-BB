import {
  assigneeNames,
  inWindow,
} from "../model/taskUtils";
import type {
  DashboardData,
  DateWindow,
} from "../model/types";
import type {
  ClassifiedTask,
  StaffStats,
} from "./types";

export function calculateStaffStats(
  data: DashboardData,
  classified: ClassifiedTask[],
  dateWindow: DateWindow,
): StaffStats {
  const taskByCode = new Map(data.tasks.map((task) => [task.code, task]));
  const selectedFeedback = data.feedback.filter((item) =>
    inWindow(item.at, dateWindow),
  );
  const feedbackCount = new Map<string, number>();
  for (const item of selectedFeedback) {
    const rawNames = item.assignee || taskByCode.get(item.taskCode)?.assignee;
    if (!rawNames) continue;
    for (const name of assigneeNames(rawNames)) {
      feedbackCount.set(name, (feedbackCount.get(name) ?? 0) + 1);
    }
  }

  const rowsByPerson = new Map<string, ClassifiedTask[]>();
  for (const item of classified) {
    if (!item.included || !item.task.assignee) continue;
    for (const name of assigneeNames(item.task.assignee)) {
      const rows = rowsByPerson.get(name) ?? [];
      rows.push(item);
      rowsByPerson.set(name, rows);
    }
  }
  for (const name of feedbackCount.keys()) {
    if (!rowsByPerson.has(name)) rowsByPerson.set(name, []);
  }

  const staffRows = Array.from(rowsByPerson.entries())
    .map(([name, rows]) => {
      const startedRows = rows.filter((item) => item.started);
      const inspectionCarryRows = rows.filter(
        (item) => item.inspectionCarry,
      );
      const completionCarryRows = rows.filter(
        (item) => item.completionCarry,
      );
      return {
        name,
        total: rows.length,
        totalTasks: rows.map((row) => row.task),
        started: startedRows.length,
        startedTasks: startedRows.map((row) => row.task),
        inspectionCarry: inspectionCarryRows.length,
        inspectionCarryTasks: inspectionCarryRows.map((row) => row.task),
        completionCarry: completionCarryRows.length,
        completionCarryTasks: completionCarryRows.map((row) => row.task),
        feedback: feedbackCount.get(name) ?? 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return { selectedFeedback, taskByCode, staffRows };
}
