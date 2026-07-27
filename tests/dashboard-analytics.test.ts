import assert from "node:assert/strict";
import test from "node:test";
import { calculateDailyTaskChart } from "../features/dashboard/analytics/calculateDailyTaskChart";
import { calculateDashboardStats } from "../features/dashboard/analytics/calculateDashboardStats";
import type {
  DashboardData,
  DateWindow,
  Task,
} from "../features/dashboard/model/types";

function date(day: number, hour = 9) {
  return new Date(2026, 6, day, hour);
}

function task(code: string, overrides: Partial<Task> = {}): Task {
  return {
    code,
    title: code,
    stage: "Edit",
    formatType: "Video ngắn",
    productCode: "",
    collection: "",
    expectedMinutes: 60,
    status: "In Progress",
    assignee: "An",
    startDate: date(10),
    completedDate: null,
    inspectionDate: null,
    businessApprovalDate: null,
    handoffRating: "",
    overallRating: "",
    type: "Short video",
    outsource: "",
    ...overrides,
  };
}

const dateWindow: DateWindow = {
  from: new Date(2026, 6, 10, 0, 0, 0, 0),
  to: new Date(2026, 6, 20, 23, 59, 59, 999),
  hasFilter: true,
};

const dashboardData: DashboardData = {
  fileName: "analytics-fixture.xlsx",
  tasks: [
    task("T1", {
      startDate: date(10),
      inspectionDate: date(10, 16),
      completedDate: date(11, 10),
      expectedMinutes: 60,
      status: "Done",
      collection: "Summer 07.2026",
    }),
    task("T2", {
      startDate: date(1),
      inspectionDate: date(12, 15),
      completedDate: date(13, 10),
      expectedMinutes: 120,
      status: "Done",
      assignee: "An, Binh",
      collection: "Summer 07.2026",
    }),
    task("T3", {
      startDate: date(15),
      expectedMinutes: 30,
      status: "To Do",
      assignee: "Binh",
      stage: "Viết Content",
      formatType: "Post",
      type: "Social post",
      collection: "Summer 07.2026",
    }),
    task("T4", {
      startDate: new Date(2026, 4, 1, 9),
      status: "Archived",
    }),
    task("T5", {
      startDate: null,
      status: "To Do",
      assignee: "",
    }),
  ],
  feedback: [
    {
      taskCode: "T1",
      at: date(14),
      assignee: "",
    },
  ],
  norms: [
    {
      formatType: "Video ngắn",
      recordMinutes: 0,
      editMinutes: 60,
      graphicMinutes: 0,
      contentMinutes: 0,
    },
    {
      formatType: "Post",
      recordMinutes: 0,
      editMinutes: 0,
      graphicMinutes: 0,
      contentMinutes: 30,
    },
  ],
};

test("calculates dashboard cohorts, people, collections and backlog", () => {
  const stats = calculateDashboardStats(dashboardData, {
    dateWindow,
    collectionMonth: "07.2026",
    backlogDate: "2026-07-20",
  });

  assert.deepEqual(
    stats.selectedTasks.map((item) => item.code),
    ["T1", "T2", "T3"],
  );
  assert.equal(stats.startedInWindow.length, 2);
  assert.equal(stats.inspectionCarryIntoWindow.length, 1);
  assert.equal(stats.completionCarryIntoWindow.length, 1);

  assert.deepEqual(
    stats.leaderboard.map((row) => ({
      name: row.label,
      value: row.value,
      started: row.started,
      carried: row.carried,
      waiting: row.waiting,
    })),
    [
      {
        name: "An",
        value: 180,
        started: 60,
        carried: 120,
        waiting: 0,
      },
      {
        name: "Binh",
        value: 150,
        started: 0,
        carried: 120,
        waiting: 30,
      },
    ],
  );
  assert.deepEqual(
    stats.staffRows.map((row) => ({
      name: row.name,
      total: row.total,
      feedback: row.feedback,
    })),
    [
      { name: "An", total: 2, feedback: 1 },
      { name: "Binh", total: 2, feedback: 0 },
    ],
  );

  assert.equal(stats.collection.taskTotal, 3);
  assert.equal(stats.collection.taskDone, 2);
  assert.equal(stats.collection.minuteTotal, 210);
  assert.equal(stats.collection.minuteDone, 180);
  assert.deepEqual(stats.backlogTasks.map((item) => item.code), ["T3"]);
  assert.equal(stats.missingBoth, 1);
  assert.equal(stats.missingEither, 1);
});

test("calculates SLA and norm metrics without React", () => {
  const stats = calculateDashboardStats(dashboardData, {
    dateWindow,
    collectionMonth: "07.2026",
    backlogDate: "2026-07-20",
  });

  assert.equal(stats.sla.handedForKpi.length, 2);
  assert.equal(stats.sla.onTimeHandoffs.length, 1);
  assert.equal(stats.sla.lateHandoffs.length, 1);
  assert.equal(stats.sla.handoffOnTimeRate, 50);
  assert.equal(stats.sla.cycleP50, 1);
  assert.equal(stats.sla.cycleP90, 12);
  assert.equal(stats.sla.normEligible, 3);
  assert.equal(stats.sla.normMapped, 3);
  assert.equal(stats.sla.normCoverage, 100);
  assert.equal(stats.sla.normExpectedMinutes, 210);
  assert.equal(stats.sla.normStandardMinutes, 150);
});

test("calculates the daily chart as a pure function", () => {
  const chart = calculateDailyTaskChart(
    dashboardData,
    "Binh",
    dateWindow,
  );
  const july12 = chart.rows.find((row) => row.date.getDate() === 12);
  const july15 = chart.rows.find((row) => row.date.getDate() === 15);

  assert.equal(chart.rows.length, 11);
  assert.deepEqual(chart.assignees, [
    "An",
    "Binh",
    "Chưa có assignee",
  ]);
  assert.deepEqual(
    july12?.handedBacklogTasks.map((item) => item.code),
    ["T2"],
  );
  assert.deepEqual(
    july15?.assignedTasks.map((item) => item.code),
    ["T3"],
  );
  assert.deepEqual(
    july15?.backlogTasks.map((item) => item.code),
    ["T3"],
  );
});

test("separates backlog rules from invalid Done chronology", () => {
  const cutoff = new Date(2026, 6, 20);
  const data: DashboardData = {
    fileName: "backlog-rules.xlsx",
    feedback: [],
    norms: [],
    tasks: [
      task("NO-INSPECTION-DONE", {
        status: "Done",
        startDate: date(10),
        inspectionDate: null,
      }),
      task("NO-INSPECTION-OPEN", {
        status: "To Do",
        startDate: date(10),
        inspectionDate: null,
      }),
      task("TRAINNING-OPEN", {
        stage: "Trainning",
        status: "To Do",
        startDate: date(10),
        inspectionDate: null,
      }),
      task("INSPECTED-IN-PROGRESS", {
        status: "In Progress",
        startDate: date(10),
        inspectionDate: date(12),
      }),
      task("INVALID-DONE", {
        status: "Done",
        startDate: date(16),
        inspectionDate: date(11),
        completedDate: date(11),
      }),
      task("VALID-DONE", {
        status: "Done",
        startDate: date(10),
        inspectionDate: date(11),
        completedDate: date(11),
      }),
      task("CANCELLED", {
        status: "Pending/Cancel",
        startDate: date(10),
        inspectionDate: null,
      }),
      task("ARCHIVED", {
        status: "Archived",
        startDate: date(10),
        inspectionDate: null,
      }),
    ],
  };

  const chart = calculateDailyTaskChart(data, "", {
    from: cutoff,
    to: cutoff,
    hasFilter: true,
  });
  assert.deepEqual(
    chart.rows[0].backlogTasks.map((item) => item.code),
    ["NO-INSPECTION-OPEN", "INSPECTED-IN-PROGRESS"],
  );
  assert.deepEqual(
    chart.rows[0].attentionTasks.map((item) => item.code),
    ["INVALID-DONE"],
  );

  const stats = calculateDashboardStats(data, {
    dateWindow: { from: null, to: null, hasFilter: false },
    collectionMonth: "",
    backlogDate: "2026-07-20",
  });
  assert.equal(stats.backlogTotal, 2);
  assert.deepEqual(
    stats.backlogAttentionTasks.map((item) => item.code),
    ["INVALID-DONE"],
  );
});
