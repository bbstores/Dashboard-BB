import { useMemo } from "react";
import { startOfDay, endOfDay, dateKey } from "../dateUtils";
import { assigneeNames, normalizedKey } from "../taskUtils";
import type { DashboardData, DailyTaskDatum, DateWindow } from "../types";

export function useDailyTaskChart(
  data: DashboardData | null,
  dailyAssignee: string,
  dateWindow: DateWindow,
) {
  return useMemo(() => {
    if (!data) return { rows: [] as DailyTaskDatum[], assignees: [] as string[] };
    const assignees = Array.from(
      new Set(data.tasks.flatMap((task) => assigneeNames(task.assignee))),
    ).sort((a, b) => a.localeCompare(b, "vi"));
    const tasks = dailyAssignee
      ? data.tasks.filter((task) =>
          assigneeNames(task.assignee).includes(dailyAssignee),
        )
      : data.tasks;
    const relevantDates = tasks
      .flatMap((task) => [task.startDate, task.inspectionDate])
      .filter((value): value is Date => Boolean(value));
    if (!relevantDates.length) return { rows: [] as DailyTaskDatum[], assignees };

    const latestDate = startOfDay(
      new Date(Math.max(...relevantDates.map((value) => value.getTime()))),
    );
    const rangeEnd = dateWindow.to ? startOfDay(dateWindow.to) : latestDate;
    const rangeStart = dateWindow.from
      ? startOfDay(dateWindow.from)
      : new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() - 29);
    const cancelledStatuses = new Set([
      "archived",
      "pending / cancel",
      "pending/cancel",
    ]);
    const rows: DailyTaskDatum[] = [];
    for (
      let cursor = startOfDay(rangeStart);
      cursor <= rangeEnd;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    ) {
      const day = new Date(cursor);
      const key = dateKey(day);
      const cutoff = endOfDay(day);
      
      const assignedTasks = tasks.filter(
        (task) => task.startDate && dateKey(task.startDate) === key,
      );
      const handedSameDayTasks = tasks.filter(
        (task) =>
          task.startDate &&
          task.inspectionDate &&
          dateKey(task.inspectionDate) === key &&
          dateKey(task.startDate) === key,
      );
      const handedBacklogTasks = tasks.filter(
        (task) =>
          task.startDate &&
          task.inspectionDate &&
          dateKey(task.inspectionDate) === key &&
          startOfDay(task.startDate) < startOfDay(task.inspectionDate),
      );
      const backlogTasks = tasks.filter(
        (task) =>
          task.startDate &&
          task.startDate <= cutoff &&
          (!task.inspectionDate || task.inspectionDate > cutoff) &&
          !cancelledStatuses.has(normalizedKey(task.status)),
      );

      rows.push({
        date: day,
        assigned: assignedTasks.length,
        handedSameDay: handedSameDayTasks.length,
        handedBacklog: handedBacklogTasks.length,
        backlog: backlogTasks.length,
        assignedTasks,
        handedSameDayTasks,
        handedBacklogTasks,
        backlogTasks,
      });
    }
    return { rows, assignees };
  }, [data, dailyAssignee, dateWindow]);
}
