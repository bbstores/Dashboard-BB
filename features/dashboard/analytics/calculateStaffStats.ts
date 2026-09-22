import {
  assigneeNames,
  feedbackReturnSource,
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
  const sourceCounts: Record<string, Map<string, number>> = {
    internal: new Map<string, number>(),
    bod: new Map<string, number>(),
    business: new Map<string, number>(),
  };
  for (const item of selectedFeedback) {
    const rawNames = item.assignee || taskByCode.get(item.taskCode)?.assignee;
    if (!rawNames) continue;
    const sourceCount = sourceCounts[feedbackReturnSource(item)];
    for (const name of assigneeNames(rawNames)) {
      feedbackCount.set(name, (feedbackCount.get(name) ?? 0) + 1);
      sourceCount.set(name, (sourceCount.get(name) ?? 0) + 1);
    }
  }

  const rowsByPerson = new Map<string, ClassifiedTask[]>();
  for (const item of classified) {
    if (!item.included) continue;
    // `assigneeNames` gom task trống vào nhóm "Chưa có assignee" để khối lượng
    // chưa phân công không biến mất khỏi chart.
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
        feedbackInternal: sourceCounts.internal.get(name) ?? 0,
        feedbackBod: sourceCounts.bod.get(name) ?? 0,
        feedbackBusiness: sourceCounts.business.get(name) ?? 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return { selectedFeedback, taskByCode, staffRows };
}
