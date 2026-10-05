import assert from "node:assert/strict";
import test from "node:test";
import { calculateDailyTaskChart } from "../features/dashboard/analytics/calculateDailyTaskChart";
import { isEndOfDayBacklogTask } from "../features/dashboard/analytics/calculateBacklog";
import { assigneeNames } from "../features/dashboard/model/taskUtils";
import { dateKey, endOfDay, startOfDay } from "../shared/date/dateUtils";
import type {
  DashboardData,
  DateWindow,
  Task,
} from "../features/dashboard/model/types";

/** Thuật toán gốc (quét mọi task cho từng ngày), giữ lại làm chuẩn đối chiếu. */
function referenceRows(tasks: Task[], from: Date, to: Date) {
  const rows = [];
  for (
    let cursor = startOfDay(from);
    cursor <= to;
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    )
  ) {
    const key = dateKey(cursor);
    const cutoff = endOfDay(cursor);
    const handed = (relation: (start: number, inspection: number) => boolean) =>
      tasks
        .filter(
          (task) =>
            task.startDate &&
            task.inspectionDate &&
            dateKey(task.inspectionDate) === key &&
            relation(
              startOfDay(task.startDate).getTime(),
              startOfDay(task.inspectionDate).getTime(),
            ),
        )
        .map((task) => task.code);
    rows.push({
      key,
      assigned: tasks
        .filter((task) => task.startDate && dateKey(task.startDate) === key)
        .map((task) => task.code),
      handedSameDay: handed((start, inspection) => start === inspection),
      handedBacklog: handed((start, inspection) => start < inspection),
      handedOutOfOrder: handed((start, inspection) => start > inspection),
      backlog: tasks
        .filter((task) => isEndOfDayBacklogTask(task, cutoff))
        .map((task) => task.code),
    });
  }
  return rows;
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function randomTasks(count: number, seed: number): Task[] {
  const random = seededRandom(seed);
  const pick = <T,>(values: T[]) =>
    values[Math.floor(random() * values.length)];
  const randomDate = () =>
    random() < 0.12
      ? null
      : new Date(2026, 5, 1 + Math.floor(random() * 60), pick([0, 9, 17, 23]));
  return Array.from({ length: count }, (_, index) => ({
    code: `T${index}`,
    title: `Task ${index}`,
    stage: pick(["Edit", "Quay/Chụp", "Training", "Thiết kế"]),
    formatType: "Video ngắn",
    productCode: "",
    collection: "",
    expectedMinutes: 60,
    status: pick([
      "Done",
      "In Progress",
      "Reject",
      "Thực hiện lại",
      "Archived",
      "Pending / Cancel",
      "Kinh doanh done",
      "Review",
      "",
    ]),
    assignee: pick(["An", "Binh", "An, Binh", ""]),
    startDate: randomDate(),
    completedDate: null,
    inspectionDate: randomDate(),
    businessApprovalDate: null,
    handoffRating: "",
    overallRating: "",
    type: "Short video",
    outsource: random() < 0.15 ? "Agency" : "",
    bodApproval: pick(["", "Đang sửa", "Duyệt"]),
  }));
}

test("daily chart matches the per-day reference scan on random data", () => {
  for (const seed of [1, 7, 42, 2026]) {
    const tasks = randomTasks(400, seed);
    const data: DashboardData = {
      fileName: "random.xlsx",
      tasks,
      feedback: [],
      norms: [],
      publications: [],
    };
    for (const assignee of ["", "An"]) {
      const dateWindow: DateWindow = {
        from: new Date(2026, 4, 25),
        to: new Date(2026, 7, 5, 23, 59, 59, 999),
        hasFilter: true,
      };
      const chart = calculateDailyTaskChart(data, assignee, dateWindow);
      const scoped = tasks.filter(
        (task) =>
          !task.outsource &&
          (!assignee || assigneeNames(task.assignee).includes(assignee)),
      );
      const expected = referenceRows(
        scoped,
        dateWindow.from!,
        startOfDay(dateWindow.to!),
      );
      const actual = chart.rows.map((row) => ({
        key: dateKey(row.date),
        assigned: row.assignedTasks.map((task) => task.code),
        handedSameDay: row.handedSameDayTasks.map((task) => task.code),
        handedBacklog: row.handedBacklogTasks.map((task) => task.code),
        handedOutOfOrder: row.handedOutOfOrderTasks.map((task) => task.code),
        backlog: row.backlogTasks.map((task) => task.code),
      }));
      assert.deepEqual(actual, expected, `seed ${seed}, assignee "${assignee}"`);
    }
  }
});
