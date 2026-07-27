import assert from "node:assert/strict";
import test from "node:test";
import { calculateDailyTaskChart } from "../features/dashboard/analytics/calculateDailyTaskChart";
import { calculateDashboardStats } from "../features/dashboard/analytics/calculateDashboardStats";
import { calculatePublicationStats } from "../features/dashboard/analytics/calculatePublicationStats";
import type {
  DashboardData,
  DateWindow,
  PublicationPost,
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
  publications: [],
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
  const july16 = chart.rows.find((row) => row.date.getDate() === 16);

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
  assert.deepEqual(
    july16?.backlogTasks.map((item) => item.code),
    ["T3"],
  );

  const monthlyChart = calculateDailyTaskChart(
    dashboardData,
    "",
    {
      from: new Date(2026, 6, 1),
      to: new Date(2026, 6, 31),
      hasFilter: true,
    },
  );
  assert.equal(monthlyChart.rows.length, 31);
  assert.equal(monthlyChart.rows[0].date.getDate(), 1);
  assert.equal(monthlyChart.rows[30].date.getDate(), 31);
});

test("separates backlog rules from invalid Done chronology", () => {
  const cutoff = new Date(2026, 6, 20);
  const data: DashboardData = {
    fileName: "backlog-rules.xlsx",
    publications: [],
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
      task("SAME-DAY-OPEN", {
        status: "In Progress",
        startDate: date(20),
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
      task("FUTURE-INSPECTION-DONE", {
        status: "Done",
        startDate: date(10),
        inspectionDate: date(21),
        completedDate: date(21),
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
      task("OUTSOURCE-OPEN", {
        status: "To Do",
        startDate: date(10),
        inspectionDate: null,
        outsource: "Agency",
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
    [
      "NO-INSPECTION-DONE",
      "NO-INSPECTION-OPEN",
      "SAME-DAY-OPEN",
      "INSPECTED-IN-PROGRESS",
      "FUTURE-INSPECTION-DONE",
    ],
  );
  const stats = calculateDashboardStats(data, {
    dateWindow: { from: null, to: null, hasFilter: false },
    collectionMonth: "",
    backlogDate: "2026-07-20",
  });
  assert.equal(stats.backlogTotal, 4);
  assert.ok(
    !stats.backlogTasks.some(
      (item) => item.code === "SAME-DAY-OPEN",
    ),
  );
  assert.ok(
    !stats.backlogTasks.some(
      (item) => item.code === "OUTSOURCE-OPEN",
    ),
  );
  assert.deepEqual(
    stats.backlogAttentionTasks.map((item) => item.code),
    ["INVALID-DONE"],
  );
});

test("calculates publication totals, platforms, types and daily rows", () => {
  const publications: PublicationPost[] = [
    {
      id: "POST-1",
      scheduledAt: date(10),
      platform: "Facebook",
      posted: true,
      postType: "Reels",
      title: "Post 1",
    },
    {
      id: "POST-2",
      scheduledAt: date(10),
      platform: "Facebook",
      posted: false,
      postType: "Ảnh Post",
      title: "Post 2",
    },
    {
      id: "POST-3",
      scheduledAt: date(11),
      platform: "TikTok",
      posted: true,
      postType: "Video",
      title: "Post 3",
    },
    {
      id: "POST-OUTSIDE",
      scheduledAt: date(21),
      platform: "TikTok",
      posted: true,
      postType: "Video",
      title: "Outside",
    },
  ];

  const overview = calculatePublicationStats(
    publications,
    dateWindow,
    "",
  );
  assert.equal(overview.total, 3);
  assert.equal(overview.posted, 2);
  assert.deepEqual(overview.platformRows, [
    { label: "Facebook", total: 2, posted: 1 },
    { label: "TikTok", total: 1, posted: 1 },
  ]);

  const facebook = calculatePublicationStats(
    publications,
    dateWindow,
    "Facebook",
  );
  assert.deepEqual(facebook.postTypeRows, [
    { label: "Ảnh Post", total: 1, posted: 0 },
    { label: "Reels", total: 1, posted: 1 },
  ]);
  assert.equal(facebook.dailyRows.length, 11);
  assert.deepEqual(
    facebook.dailyRows
      .filter((row) => row.total)
      .map((row) => ({
        day: row.date.getDate(),
        total: row.total,
        posted: row.posted,
      })),
    [{ day: 10, total: 2, posted: 1 }],
  );
});
