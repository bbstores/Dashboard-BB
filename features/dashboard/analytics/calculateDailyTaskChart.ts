import {
  dateKey,
  endOfDay,
  startOfDay,
} from "@/shared/date/dateUtils";
import {
  assigneeNames,
  normalizedKey,
} from "../model/taskUtils";
import type {
  DashboardData,
  DailyTaskDatum,
  DateWindow,
  Task,
} from "../model/types";
import { endOfDayBacklogWindow } from "./calculateBacklog";

export function calculateDailyTaskChart(
  data: DashboardData,
  dailyAssignee: string,
  dateWindow: DateWindow,
) {
  const internalTasks = data.tasks.filter(
    (task) => !normalizedKey(task.outsource),
  );
  const assignees = Array.from(
    new Set(
      internalTasks.flatMap((task) => assigneeNames(task.assignee)),
    ),
  ).sort((a, b) => a.localeCompare(b, "vi"));
  const tasks = dailyAssignee
    ? internalTasks.filter((task) =>
        assigneeNames(task.assignee).includes(dailyAssignee),
      )
    : internalTasks;
  let latestTime = -Infinity;
  for (const task of tasks) {
    if (task.startDate) latestTime = Math.max(latestTime, task.startDate.getTime());
    if (task.inspectionDate) {
      latestTime = Math.max(latestTime, task.inspectionDate.getTime());
    }
  }
  if (latestTime === -Infinity) {
    return { rows: [] as DailyTaskDatum[], assignees };
  }

  const latestDate = startOfDay(new Date(latestTime));
  const rangeEnd = dateWindow.to
    ? startOfDay(dateWindow.to)
    : latestDate;
  const rangeStart = dateWindow.from
    ? startOfDay(dateWindow.from)
    : new Date(
        rangeEnd.getFullYear(),
        rangeEnd.getMonth(),
        rangeEnd.getDate() - 29,
      );

  // Gom task theo ngày một lần thay vì quét toàn bộ task cho từng ngày.
  const assignedByDay = new Map<string, Task[]>();
  const handedSameDayByDay = new Map<string, Task[]>();
  const handedBacklogByDay = new Map<string, Task[]>();
  // Hai nhóm bàn giao ở trên bỏ qua task có Ngày Bắt Đầu sau Ngày Kiểm Duyệt,
  // nên đếm riêng để tooltip không báo thiếu số task thực được kiểm duyệt.
  const handedOutOfOrderByDay = new Map<string, Task[]>();
  const backlogWindows: Array<{
    task: Task;
    from: number;
    until: number | null;
  }> = [];
  for (const task of tasks) {
    if (!task.startDate) continue;
    pushToDay(assignedByDay, dateKey(task.startDate), task);
    if (task.inspectionDate) {
      const startDay = startOfDay(task.startDate).getTime();
      const inspectionDay = startOfDay(task.inspectionDate).getTime();
      const byDay =
        startDay === inspectionDay
          ? handedSameDayByDay
          : startDay < inspectionDay
            ? handedBacklogByDay
            : handedOutOfOrderByDay;
      pushToDay(byDay, dateKey(task.inspectionDate), task);
    }
    const window = endOfDayBacklogWindow(task);
    if (window) backlogWindows.push({ task, ...window });
  }

  const rows: DailyTaskDatum[] = [];
  for (
    let cursor = startOfDay(rangeStart);
    cursor <= rangeEnd;
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    )
  ) {
    const day = new Date(cursor);
    const key = dateKey(day);
    const cutoff = endOfDay(day).getTime();
    const assignedTasks = assignedByDay.get(key) ?? [];
    const handedSameDayTasks = handedSameDayByDay.get(key) ?? [];
    const handedBacklogTasks = handedBacklogByDay.get(key) ?? [];
    const handedOutOfOrderTasks = handedOutOfOrderByDay.get(key) ?? [];
    const backlogTasks: Task[] = [];
    for (const window of backlogWindows) {
      if (
        window.from <= cutoff &&
        (window.until === null || cutoff < window.until)
      ) {
        backlogTasks.push(window.task);
      }
    }

    rows.push({
      date: day,
      assigned: assignedTasks.length,
      handedSameDay: handedSameDayTasks.length,
      handedBacklog: handedBacklogTasks.length,
      handedOutOfOrder: handedOutOfOrderTasks.length,
      backlog: backlogTasks.length,
      assignedTasks,
      handedSameDayTasks,
      handedBacklogTasks,
      handedOutOfOrderTasks,
      backlogTasks,
    });
  }
  return { rows, assignees };
}

function pushToDay(byDay: Map<string, Task[]>, key: string, task: Task) {
  const tasks = byDay.get(key);
  if (tasks) tasks.push(task);
  else byDay.set(key, [task]);
}
