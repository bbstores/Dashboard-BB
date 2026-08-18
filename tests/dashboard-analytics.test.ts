import assert from "node:assert/strict";
import test from "node:test";
import { calculateDailyTaskChart } from "../features/dashboard/analytics/calculateDailyTaskChart";
import { calculateDashboardStats } from "../features/dashboard/analytics/calculateDashboardStats";
import { calculateCollections } from "../features/dashboard/analytics/calculateCollections";
import {
  calculateMediaCapacity,
  calculateMediaTrendSeries,
  calculateShootStaffContributions,
  calculateShootTaskMinutesByStaff,
  calculateShootTypeBaselinePlan,
  calculateShootTypeBaselines,
} from "../features/dashboard/analytics/calculateMediaCapacity";
import {
  calculatePostingNormDailyTarget,
  calculatePublicationStats,
  publicationBelongsToPlatform,
} from "../features/dashboard/analytics/calculatePublicationStats";
import {
  calculateReportComparison,
  comparisonPeriod,
} from "../features/dashboard/analytics/calculateReportComparison";
import type {
  DashboardData,
  DateWindow,
  PublicationPost,
  SavedReport,
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

test("converts posting norms to a daily target for selected platforms", () => {
  const norms = [
    {
      platform: "Facebook",
      target: 4,
      unit: "Ngày",
      note: "",
    },
    {
      platform: "TikTok",
      target: 7,
      unit: "Tuần",
      note: "",
    },
    {
      platform: "Shopee",
      target: null,
      unit: "Ngày",
      note: "Theo ấn phẩm",
    },
  ];

  assert.equal(calculatePostingNormDailyTarget(norms), 5);
  assert.equal(
    calculatePostingNormDailyTarget(norms, ["TikTok"]),
    1,
  );
  assert.equal(
    calculatePostingNormDailyTarget(norms, ["Shopee"]),
    0,
  );
});

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

test("builds each assignee radar from task stages in the selected period", () => {
  const data: DashboardData = {
    fileName: "radar-fixture.xlsx",
    feedback: [],
    norms: [],
    publications: [],
    tasks: [
      task("EDIT-1", { assignee: "An, Bình", stage: "Edit" }),
      task("EDIT-2", { assignee: "An", stage: "Edit", expectedMinutes: 30 }),
      task("CONTENT-1", { assignee: "An", stage: "Viết content" }),
      task("GRAPHIC-OUTSIDE", {
        assignee: "An",
        stage: "Graphic Design",
        startDate: date(2),
      }),
    ],
  };

  const stats = calculateDashboardStats(data, {
    dateWindow,
    collectionMonth: "",
    backlogDate: "2026-07-20",
  });
  const an = stats.assigneeStageProfiles.find(
    (profile) => profile.assignee === "An",
  );
  const binh = stats.assigneeStageProfiles.find(
    (profile) => profile.assignee === "Bình",
  );

  assert.equal(an?.totalTasks, 3);
  assert.deepEqual(
    an?.stages.map((stage) => [stage.label, stage.value, stage.minutes]),
    [
      ["Edit", 2, 90],
      ["Viết content", 1, 60],
    ],
  );
  assert.equal(binh?.totalTasks, 1);
});

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
  assert.equal(stats.untitledTaskCount, 0);
  assert.equal(
    stats.missingEither,
    stats.missingStartOnly +
      stats.missingAssigneeOnly +
      stats.missingBoth +
      stats.untitledTaskCount,
  );
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

test("daily chart excludes outsource from assignees and every metric", () => {
  const data: DashboardData = {
    fileName: "daily-outsource.xlsx",
    publications: [],
    feedback: [],
    norms: [],
    tasks: [
      task("INTERNAL", {
        assignee: "An",
        startDate: date(10),
        inspectionDate: date(10, 16),
        status: "Done",
      }),
      task("OUTSOURCE", {
        assignee: "Agency only",
        startDate: date(10),
        inspectionDate: date(10, 15),
        status: "Done",
        outsource: "Agency",
      }),
    ],
  };
  const chart = calculateDailyTaskChart(data, "", {
    from: date(10),
    to: date(10, 23),
    hasFilter: true,
  });

  assert.deepEqual(chart.assignees, ["An"]);
  assert.deepEqual(
    chart.rows[0].assignedTasks.map((item) => item.code),
    ["INTERNAL"],
  );
  assert.deepEqual(
    chart.rows[0].handedSameDayTasks.map((item) => item.code),
    ["INTERNAL"],
  );
  assert.equal(chart.rows[0].handedBacklogTasks.length, 0);
  assert.equal(chart.rows[0].backlogTasks.length, 0);
});

test("compares only saved reports from the same department and period", () => {
  const report = (
    id: string,
    department: "media" | "business",
    dateFrom: string,
    dateTo: string,
  ): SavedReport => ({
    id,
    name: id,
    department,
    createdAt: "2026-07-29T03:00:00.000Z",
    filters: {
      dateFrom,
      dateTo,
      backlogDate: dateTo,
      collectionMonth: "",
      leaderboardUnit: "minutes",
      pieScopes: {},
      pieExcludeOutsource: {},
    },
  });
  const reports = [
    report("WEEK-MEDIA", "media", "2026-07-13", "2026-07-19"),
    report("MONTH-MEDIA", "media", "2026-07-01", "2026-07-31"),
    report("WEEK-BUSINESS", "business", "2026-07-13", "2026-07-19"),
  ];

  assert.equal(comparisonPeriod(reports[0]), "week");
  assert.equal(comparisonPeriod(reports[1]), "month");
  const points = calculateReportComparison(
    dashboardData,
    reports,
    "media",
    "week",
  );
  assert.deepEqual(points.map((point) => point.id), ["WEEK-MEDIA"]);
  const cachedPoints = calculateReportComparison(
    dashboardData,
    reports,
    "media",
    "week",
  );
  assert.equal(cachedPoints[0], points[0]);
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

test("calculates publication source mix, multi-platform rows and unscheduled assets", () => {
  const publicationTasks = [
    task("VIDEO-1", {
      publicationIds: ["POST-1"],
      completedDate: date(9),
      status: "Done",
    }),
    task("VIDEO-2", {
      publicationIds: ["POST-3"],
      completedDate: date(9),
      status: "Done",
    }),
    task("VIDEO-SCHEDULED-NOT-POSTED", {
      publicationIds: ["POST-MISSING"],
      completedDate: date(9),
      status: "Done",
    }),
    task("GRAPHIC-OLD", {
      stage: "Graphic Design",
      formatType: "Ảnh Post",
      startDate: new Date(2026, 4, 1),
      completedDate: new Date(2026, 4, 2),
      publicationIds: [],
      status: "Done",
    }),
    task("GRAPHIC-NEW", {
      stage: "Graphic Design",
      formatType: "Ảnh Post",
      startDate: date(12),
      publicationIds: [],
      status: "In Progress",
    }),
    task("VIDEO-NO-SOCIAL", {
      platform: "Không Đăng Social",
      publicationIds: ["POST-NO-SOCIAL"],
      completedDate: date(9),
      status: "Done",
    }),
  ];
  const publications: PublicationPost[] = [
    {
      id: "POST-1",
      scheduledAt: date(10),
      platform: "Facebook",
      posted: true,
      postType: "Reels",
      title: "Post 1",
      bookTaskCode: "VIDEO-1",
    },
    {
      id: "POST-2",
      scheduledAt: date(10),
      platform: "Facebook",
      posted: false,
      postType: "Ảnh Post",
      title: "Post 2",
      bookTaskCode: "",
    },
    {
      id: "POST-3",
      scheduledAt: date(11),
      platform: "TikTok",
      posted: true,
      postType: "Video",
      title: "Post 3",
      bookTaskCode: "VIDEO-2",
    },
    {
      id: "POST-OUTSIDE",
      scheduledAt: date(21),
      platform: "TikTok",
      posted: true,
      postType: "Video",
      title: "Outside",
      bookTaskCode: "VIDEO-2",
    },
    {
      id: "POST-NO-SOCIAL",
      scheduledAt: date(10),
      platform: "Facebook",
      posted: true,
      postType: "Video",
      title: "Không dùng cho social",
      bookTaskCode: "VIDEO-NO-SOCIAL",
    },
  ];

  const stats = calculatePublicationStats(
    publicationTasks,
    publications,
    dateWindow,
    [
      {
        platform: "Facebook",
        target: 1,
        unit: "Ngày",
        note: "Mỗi ngày một bài",
      },
      {
        platform: "TikTok",
        target: 7,
        unit: "Tuần",
        note: "Bảy bài mỗi tuần",
      },
    ],
  );
  assert.equal(stats.total, 3);
  assert.equal(stats.posted, 2);
  assert.equal(stats.reup, 1);
  assert.equal(stats.video, 2);
  assert.equal(stats.graphic, 0);
  assert.equal(stats.uniqueMediaTasks, 2);
  assert.equal(stats.normPerformance.days, 11);
  assert.equal(stats.normPerformance.expectedTotal, 22);
  assert.equal(stats.normPerformance.postedTotal, 2);
  assert.equal(stats.normPerformance.rows[0].expected, 11);
  assert.equal(stats.normPerformance.rows[0].scheduled, 2);
  assert.equal(stats.normPerformance.rows[0].posted, 1);
  assert.equal(stats.normPerformance.unmappedPlatforms.length, 0);
  assert.deepEqual(stats.postMix, [
    { label: "Bài reup", value: 1 },
    { label: "Media · Video", value: 2 },
    { label: "Media · Hình ảnh", value: 0 },
  ]);
  assert.deepEqual(stats.platformRows, [
    {
      label: "Facebook",
      total: 2,
      reup: 1,
      video: 1,
      graphic: 0,
      unknown: 0,
    },
    {
      label: "TikTok",
      total: 1,
      reup: 0,
      video: 1,
      graphic: 0,
      unknown: 0,
    },
  ]);
  assert.deepEqual(
    stats.unscheduledTasks.map((item) => item.code),
    ["GRAPHIC-OLD", "GRAPHIC-NEW"],
  );
  assert.equal(
    stats.eligibleTasks.some(
      (item) => item.code === "VIDEO-NO-SOCIAL",
    ),
    false,
  );
  assert.deepEqual(
    stats.oldAssets.map((item) => item.code),
    ["GRAPHIC-OLD"],
  );
  assert.deepEqual(
    stats.recentUnscheduledTasks.map((item) => item.code),
    ["GRAPHIC-NEW"],
  );
  assert.equal(stats.recentUnscheduledVideoTasks.length, 0);
  assert.equal(stats.recentUnscheduledGraphicTasks.length, 1);
  assert.deepEqual(stats.unscheduledBreakdown, [
    { label: "Ấn phẩm cũ", value: 1 },
    { label: "Bắt đầu từ 01/07", value: 1 },
    { label: "Ấn phẩm chuyển tiếp", value: 0 },
    { label: "Chưa đủ mốc ngày", value: 0 },
  ]);
  assert.deepEqual(stats.assetScheduleMix, [
    { label: "Đã lên lịch", value: 3 },
    { label: "Chưa lên lịch", value: 1 },
  ]);
  assert.deepEqual(
    stats.assetStatusTasks.map((item) => item.code),
    [
      "VIDEO-1",
      "VIDEO-2",
      "VIDEO-SCHEDULED-NOT-POSTED",
      "GRAPHIC-NEW",
    ],
  );
  assert.deepEqual(stats.scheduledPostStatusMix, [
    { label: "Đã đăng", value: 2 },
    { label: "Chưa đăng", value: 1 },
  ]);
  assert.deepEqual(
    stats.classifiedPosts.map((item) => ({
      post: item.post.id,
      source: item.source,
      task: item.task?.code,
    })),
    [
      { post: "POST-1", source: "video", task: "VIDEO-1" },
      { post: "POST-2", source: "reup", task: undefined },
      { post: "POST-3", source: "video", task: "VIDEO-2" },
    ],
  );
  assert.deepEqual(
    stats.noSocialPostDetails.map((item) => ({
      post: item.post.id,
      task: item.task?.code,
      reason: item.reason,
    })),
    [
      {
        post: "POST-NO-SOCIAL",
        task: "VIDEO-NO-SOCIAL",
        reason:
          "Book Task liên kết tới task có Nền Tảng = Không Đăng Social",
      },
    ],
  );
  assert.equal(stats.dailyRows.length, 11);
  assert.deepEqual(
    stats.dailyRows
      .filter((row) => row.total)
      .map((row) => ({
        day: row.date.getDate(),
        total: row.total,
        posted: row.posted,
      })),
    [
      { day: 10, total: 2, posted: 1 },
      { day: 11, total: 1, posted: 1 },
    ],
  );
});

test("attributes posting KPI gaps to unused ready assets before Media shortage", () => {
  const tasks = [
    task("OPENING-BST", {
      title: "Ảnh BST tháng 7",
      stage: "Graphic Design",
      formatType: "Ảnh Post",
      collection: "BST 07.2026",
      status: "Done",
      completedDate: date(8),
      publicationIds: ["MEDIA-POST"],
      expectedMinutes: 60,
    }),
    task("DELIVERED-IG", {
      title: "IG · Lookbook",
      stage: "Graphic Design",
      formatType: "Ảnh Post",
      status: "Done",
      completedDate: date(10),
      expectedMinutes: 90,
    }),
    task("DELIVERED-APPROVED", {
      title: "Video campaign",
      status: "Kinh Doanh Duyệt",
      businessApprovalDate: date(11),
      expectedMinutes: 120,
    }),
    task("OLD-LINKED", {
      title: "Ảnh BST cũ đã có mã đăng bài",
      stage: "Graphic Design",
      formatType: "Ảnh Post",
      collection: "BST 06.2026",
      status: "Done",
      startDate: new Date(2026, 5, 20),
      completedDate: date(8),
      publicationIds: ["OLD-POST-ID"],
      expectedMinutes: 30,
    }),
    task("OLD-EMPTY", {
      title: "Ảnh BST cũ chưa có mã đăng bài",
      stage: "Graphic Design",
      formatType: "Ảnh Post",
      collection: "BST 06.2026",
      status: "Done",
      startDate: new Date(2026, 5, 21),
      completedDate: date(8),
      publicationIds: [],
      expectedMinutes: 45,
    }),
    task("DONE-BUT-NEEDS-APPROVAL", {
      title: "Video thường",
      status: "Done",
      completedDate: date(10),
    }),
  ];
  const publications: PublicationPost[] = [
    {
      id: "MEDIA-POST",
      scheduledAt: date(10),
      platform: "Facebook",
      posted: true,
      postType: "Ảnh",
      title: "Bài từ BST",
      bookTaskCode: "OPENING-BST",
    },
    {
      id: "REUP-POST",
      scheduledAt: date(11),
      platform: "Facebook",
      posted: true,
      postType: "Reup",
      title: "Bài reup",
      bookTaskCode: "",
    },
  ];

  const stats = calculatePublicationStats(
    tasks,
    publications,
    {
      from: new Date(2026, 6, 10),
      to: new Date(2026, 6, 12, 23, 59, 59, 999),
      hasFilter: true,
    },
    [
      {
        platform: "Facebook",
        target: 2,
        unit: "Ngày",
        note: "Hai bài mỗi ngày",
      },
    ],
  );
  const supply = stats.supplyPerformance;

  assert.equal(supply.expectedPosts, 6);
  assert.equal(supply.kpiDailyRate, 2);
  assert.deepEqual(
    supply.openingReadyTasks.map((item) => item.code),
    ["OPENING-BST", "OLD-LINKED"],
  );
  assert.deepEqual(
    supply.openingFreeTasks.map((item) => item.code),
    [],
  );
  assert.deepEqual(
    supply.openingPlannedUnpostedTasks.map((item) => item.code),
    ["OLD-LINKED"],
  );
  assert.deepEqual(
    supply.openingPlannedPostedTasks.map((item) => item.code),
    ["OPENING-BST"],
  );
  assert.deepEqual(
    supply.deliveredTasks.map((item) => item.code),
    ["DELIVERED-IG", "DELIVERED-APPROVED"],
  );
  assert.equal(supply.availableTasks.length, 4);
  assert.ok(Math.abs(supply.mediaSupplyCoverage - 200 / 3) < 1e-9);
  assert.equal(supply.mediaPosts, 1);
  assert.equal(supply.reupPosts, 1);
  assert.equal(supply.postingShortfall, 4);
  assert.equal(supply.businessUnusedGap, 3);
  assert.equal(supply.mediaSupplyGap, 1);
  assert.equal(supply.readyMinutes, 300);
  assert.equal(supply.deliveredMinutes, 210);
  assert.equal(supply.readyWithoutDateTasks.length, 0);
  assert.deepEqual(
    supply.legacyOldTasks.map((item) => item.code),
    ["OLD-EMPTY"],
  );
});

test("estimates excess KPI contribution from Media and Reup source mix", () => {
  const approvedTasks = ["MEDIA-1", "MEDIA-2"].map((code) =>
    task(code, {
      status: "Kinh Doanh Duyệt",
      businessApprovalDate: date(10),
    }),
  );
  const posts: PublicationPost[] = [
    ...approvedTasks.map((item, index) => ({
      id: `POST-${index + 1}`,
      scheduledAt: date(10),
      platform: "Facebook",
      posted: true,
      postType: "Video",
      title: item.code,
      bookTaskCode: item.code,
    })),
    {
      id: "POST-REUP",
      scheduledAt: date(10),
      platform: "Facebook",
      posted: true,
      postType: "Reup",
      title: "Reup",
      bookTaskCode: "",
    },
  ];
  const stats = calculatePublicationStats(
    approvedTasks,
    posts,
    {
      from: new Date(2026, 6, 10),
      to: new Date(2026, 6, 10, 23, 59, 59, 999),
      hasFilter: true,
    },
    [{ platform: "Facebook", target: 1, unit: "Ngày", note: "" }],
  );

  assert.equal(stats.supplyPerformance.excessPosts, 2);
  assert.ok(
    Math.abs(stats.supplyPerformance.mediaExcessEstimate - 4 / 3) < 1e-9,
  );
  assert.ok(
    Math.abs(stats.supplyPerformance.businessExcessEstimate - 2 / 3) < 1e-9,
  );
});

test("attributes Shopee to direct posts and selected TikTok posts", () => {
  const posts: PublicationPost[] = [
    {
      id: "SHOPEE-DIRECT",
      scheduledAt: date(10),
      platform: "Shopee",
      posted: true,
      postType: "Ảnh Post",
      title: "Đăng trực tiếp Shopee",
    },
    {
      id: "TIKTOK-SHOPEE-POSTED",
      scheduledAt: date(10),
      platform: "Tiktok BB Store",
      shopeeSelected: true,
      posted: true,
      postType: "Video",
      title: "TikTok đồng thời đăng Shopee",
    },
    {
      id: "TIKTOK-SHOPEE-SCHEDULED",
      scheduledAt: date(10),
      platform: "Tiktok BB Store",
      shopeeSelected: true,
      posted: false,
      postType: "Video",
      title: "TikTok có lịch Shopee",
    },
    {
      id: "TIKTOK-ONLY",
      scheduledAt: date(10),
      platform: "Tiktok BB Store",
      shopeeSelected: false,
      posted: true,
      postType: "Video",
      title: "Chỉ đăng TikTok",
    },
    {
      id: "FACEBOOK-CHECKED",
      scheduledAt: date(10),
      platform: "Facebook BBStore",
      shopeeSelected: true,
      posted: true,
      postType: "Ảnh Post",
      title: "Không tính vì không phải TikTok",
    },
  ];
  const oneDayWindow: DateWindow = {
    from: date(10, 0),
    to: date(10, 23),
    hasFilter: true,
  };
  const stats = calculatePublicationStats(
    [],
    posts,
    oneDayWindow,
    [
      {
        platform: "Shopee",
        target: 6,
        unit: "Ngày",
        note: "Sáu bài mỗi ngày",
      },
    ],
  );
  const shopeeNorm = stats.normPerformance.rows[0];
  const shopeePlatform = stats.platformRows.find(
    (row) => row.label === "Shopee",
  );

  assert.equal(publicationBelongsToPlatform(posts[0], "Shopee"), true);
  assert.equal(publicationBelongsToPlatform(posts[1], "Shopee"), true);
  assert.equal(publicationBelongsToPlatform(posts[3], "Shopee"), false);
  assert.equal(publicationBelongsToPlatform(posts[4], "Shopee"), false);
  assert.equal(shopeeNorm.scheduled, 3);
  assert.equal(shopeeNorm.posted, 2);
  assert.equal(shopeePlatform?.total, 3);
  assert.equal(stats.total, 5);
});

test("partitions every unscheduled asset into one exclusive age group", () => {
  const stats = calculatePublicationStats(
    [
      task("OLD", {
        publicationIds: [],
        startDate: new Date(2026, 5, 20),
        completedDate: new Date(2026, 5, 21),
      }),
      task("RECENT", {
        publicationIds: [],
        startDate: new Date(2026, 6, 2),
      }),
      task("TRANSITION", {
        publicationIds: [],
        startDate: new Date(2026, 5, 28),
        completedDate: new Date(2026, 6, 2),
      }),
      task("UNDATED", {
        publicationIds: [],
        startDate: null,
      }),
    ],
    [],
    { from: null, to: null, hasFilter: false },
  );

  assert.deepEqual(stats.unscheduledBreakdown, [
    { label: "Ấn phẩm cũ", value: 1 },
    { label: "Bắt đầu từ 01/07", value: 1 },
    { label: "Ấn phẩm chuyển tiếp", value: 1 },
    { label: "Chưa đủ mốc ngày", value: 1 },
  ]);
  assert.equal(
    stats.unscheduledBreakdown.reduce(
      (sum, item) => sum + item.value,
      0,
    ),
    stats.unscheduledTasks.length,
  );
});

test("classifies Xào Source at Edit as a final video asset", () => {
  const xaoSourceTask = task("XAO-SOURCE", {
    stage: "Edit",
    formatType: "Xào Source",
    publicationIds: ["POST-ISSUE"],
  });
  const stats = calculatePublicationStats(
    [xaoSourceTask],
    [
      {
        id: "POST-ISSUE",
        scheduledAt: date(10),
        platform: "Facebook",
        posted: true,
        postType: "Reels",
        title: "Xào source",
        bookTaskCode: "XAO-SOURCE",
      },
    ],
    dateWindow,
  );

  assert.equal(stats.video, 1);
  assert.equal(stats.unknown, 0);
  assert.equal(stats.classifiedPosts[0].task?.code, "XAO-SOURCE");
});

test("excludes Pending / Cancel tasks from every collection metric", () => {
  const result = calculateCollections(
    [
      task("ACTIVE", {
        collection: "BST 08.2026-Tiệc",
        status: "Done",
        expectedMinutes: 60,
      }),
      task("PENDING-SPACED", {
        collection: "BST 08.2026-Tiệc",
        status: "Pending / Cancel",
        expectedMinutes: 90,
      }),
      task("PENDING-COMPACT", {
        collection: "BST 09.2026-Công sở",
        status: "Pending/Cancel",
        expectedMinutes: 120,
      }),
    ],
    "08.2026",
  );

  assert.deepEqual(result.months, ["08.2026"]);
  assert.deepEqual(
    result.collectionTasks.map((item) => item.code),
    ["ACTIVE"],
  );
  assert.deepEqual(result.collection, {
    taskDone: 1,
    taskTotal: 1,
    minuteDone: 60,
    minuteTotal: 60,
  });
  assert.equal(result.childCollections.length, 1);
  assert.equal(result.childCollections[0].taskTotal, 1);
  assert.equal(result.childCollections[0].minuteTotal, 60);
});

test("allocates shoot participation by time, tasks and products", () => {
  const sessions = [
    {
      id: "FULL-DAY",
      date: new Date(2026, 6, 20),
      duration: "Một ngày",
      sessionUnits: 2,
      taskCount: 10,
      productCount: 4,
      productCodes: ["A", "B", "C", "D"],
      taskCodes: [],
      type: "Bộ Sưu Tập",
      timeWindow: "",
      model: "",
      staffNames: ["An", "Bình"],
      staffCount: 2,
      status: "Đóng",
    },
    {
      id: "HALF-DAY",
      date: new Date(2026, 6, 21),
      duration: "Một buổi",
      sessionUnits: 1,
      taskCount: 6,
      productCount: 3,
      productCodes: ["E", "F", "G"],
      taskCodes: [],
      type: "Order Lại",
      timeWindow: "",
      model: "",
      staffNames: ["An", "Chi"],
      staffCount: 2,
      status: "Đóng",
    },
  ];
  const result = calculateShootStaffContributions(sessions);
  const an = result.rows.find((row) => row.staffName === "An");
  const binh = result.rows.find((row) => row.staffName === "Bình");
  const chi = result.rows.find((row) => row.staffName === "Chi");

  assert.equal(result.sessionCount, 2);
  assert.equal(result.namedSessionCount, 2);
  assert.equal(result.coveragePercentage, 100);
  assert.equal(an?.sessionCount, 2);
  assert.equal(an?.timeValue, 1.5);
  assert.equal(an?.taskValue, 8);
  assert.equal(an?.productValue, 3.5);
  assert.equal(an?.timePercentage, 50);
  assert.ok(
    Math.abs((binh?.timePercentage ?? 0) - 100 / 3) < 1e-9,
  );
  assert.ok(
    Math.abs((chi?.timePercentage ?? 0) - 100 / 6) < 1e-9,
  );
});

test("sums shoot task minutes by outsource when present, otherwise by assignee", () => {
  const sessions = [
    {
      id: "SESSION-01",
      date: date(20),
      duration: "Một buổi",
      sessionUnits: 1,
      taskCount: 3,
      productCount: 0,
      productCodes: [],
      taskCodes: ["TASK-01", "TASK-02"],
      type: "Bộ Sưu Tập",
      timeWindow: "",
      model: "",
      staffNames: ["An", "Bình"],
      staffCount: 2,
      status: "Đóng",
    },
  ];
  const result = calculateShootTaskMinutesByStaff(sessions, [
    task("TASK-01", { assignee: "An", expectedMinutes: 45 }),
    task("TASK-02", { assignee: "An", expectedMinutes: 75 }),
    task("TASK-03", {
      assignee: "Bình",
      expectedMinutes: 60,
      shootSession: "SESSION-01",
    }),
    task("TASK-OUTSOURCE", {
      assignee: "Người follow",
      outsource: "Agency A",
      expectedMinutes: 90,
      shootSession: "SESSION-01",
    }),
    task("TASK-OUTSIDE", {
      assignee: "An",
      expectedMinutes: 999,
      shootSession: "SESSION-02",
    }),
  ]);

  assert.equal(result[0].linkedTasks.length, 4);
  assert.equal(
    result[0].staffRows.find((row) => row.staffName === "An")?.minutes,
    120,
  );
  assert.equal(
    result[0].staffRows.find((row) => row.staffName === "Bình")?.minutes,
    60,
  );
  assert.equal(
    result[0].staffRows.find((row) => row.staffName === "Agency A")?.minutes,
    90,
  );
  assert.equal(
    result[0].staffRows.find((row) => row.staffName === "Người follow"),
    undefined,
  );
});

test("calculates weekly Media capacity from standard minutes and handoff dates", () => {
  const data: DashboardData = {
    fileName: "capacity.xlsx",
    publications: [],
    norms: [
      {
        formatType: "Video ngắn",
        recordMinutes: 120,
        editMinutes: 60,
        graphicMinutes: 0,
        contentMinutes: 0,
      },
      {
        formatType: "Ảnh social",
        recordMinutes: 90,
        editMinutes: 0,
        graphicMinutes: 90,
        contentMinutes: 0,
      },
    ],
    feedback: [
      {
        taskCode: "FOCUS-VIDEO",
        at: new Date(2026, 6, 22, 10),
        assignee: "An",
      },
    ],
    shootSessions: [
      {
        id: "BASE-SESSION",
        date: new Date(2026, 6, 13),
        duration: "Một ngày",
        sessionUnits: 2,
        taskCount: 10,
        productCount: 4,
        productCodes: ["BASE-1", "BASE-2", "BASE-3", "BASE-4"],
        taskCodes: ["BASE-SHOOT"],
        type: "Bộ Sưu Tập",
        timeWindow: "8h30–17h30",
        model: "",
        staffNames: ["An", "Bình", "Chi", "Dũng"],
        staffCount: 4,
        status: "Đóng",
      },
      {
        id: "FOCUS-SESSION",
        date: new Date(2026, 6, 21),
        duration: "Một buổi",
        sessionUnits: 1,
        taskCount: 6,
        productCount: 3,
        productCodes: ["SP-1", "SP-2", "SP-3"],
        taskCodes: ["FOCUS-SHOOT"],
        type: "Bộ Sưu Tập",
        timeWindow: "8h30–12h",
        model: "",
        staffNames: ["An", "Bình", "Chi"],
        staffCount: 3,
        status: "Mở",
      },
    ],
    tasks: [
      task("BASE-SHOOT", {
        stage: "Quay",
        startDate: new Date(2026, 6, 13),
      }),
      task("BASE-OUTPUT", {
        stage: "Edit",
        inspectionDate: new Date(2026, 6, 14),
      }),
      task("FOCUS-SHOOT", {
        stage: "Quay",
        startDate: new Date(2026, 6, 20),
        shootSession: "FOCUS-SESSION",
      }),
      task("FOCUS-VIDEO", {
        stage: "Edit",
        inspectionDate: new Date(2026, 6, 21),
        handoffRating: "✅ Bàn giao đúng hạn",
      }),
      task("FOCUS-GRAPHIC", {
        stage: "Graphic Design",
        formatType: "Ảnh social",
        inspectionDate: new Date(2026, 6, 22),
        handoffRating: "🔥 Bàn giao trễ hạn",
      }),
      task("EXCLUDED-OUTSOURCE", {
        stage: "Edit",
        inspectionDate: new Date(2026, 6, 22),
        outsource: "Vendor A",
      }),
      task("EXCLUDED-PENDING", {
        stage: "Quay",
        startDate: new Date(2026, 6, 21),
        status: "Pending / Cancel",
      }),
    ],
  };

  const result = calculateMediaCapacity(
    data,
    new Date(2026, 6, 26),
    new Date(2026, 6, 22, 14),
  );

  assert.equal(result.focusWeek.label, "20/07–26/07");
  assert.equal(result.elapsedWorkingDays, 3);
  assert.equal(result.focusWeek.shootTasks.length, 1);
  assert.equal(result.focusWeek.shootOpeningBacklogTasks.length, 1);
  assert.equal(result.focusWeek.shootHandedTasks.length, 0);
  assert.equal(result.focusWeek.shootClosingBacklogTasks.length, 2);
  assert.equal(result.focusWeek.shootMinutes, 120);
  assert.equal(result.focusWeek.linkedShootTasks.length, 1);
  assert.equal(result.focusWeek.unlinkedShootTasks.length, 0);
  assert.equal(result.focusWeek.sessionUnits, 1);
  assert.equal(result.focusWeek.scheduledTaskCount, 6);
  assert.equal(result.focusWeek.uniqueProductCount, 3);
  assert.equal(result.focusWeek.uniqueStaffCount, 3);
  assert.equal(result.focusWeek.outputTasks.length, 2);
  assert.equal(result.focusWeek.outputOpeningBacklogTasks.length, 2);
  assert.equal(result.focusWeek.outputStartedTasks.length, 0);
  assert.equal(result.focusWeek.outputHandedCarryTasks.length, 2);
  assert.equal(result.focusWeek.outputHandedNewTasks.length, 0);
  assert.equal(result.focusWeek.outputClosingBacklogTasks.length, 0);
  assert.equal(result.focusWeek.outputMinutes, 150);
  assert.equal(result.focusWeek.videoTasks.length, 1);
  assert.equal(result.focusWeek.graphicTasks.length, 1);
  assert.equal(result.focusWeek.onTimeTasks.length, 1);
  assert.equal(result.focusWeek.lateTasks.length, 1);
  assert.equal(result.focusWeek.feedbackRows.length, 1);
  assert.equal(result.shootReference.p50Minutes, 60);
  assert.equal(result.outputReference.p50Minutes, 30);
  assert.equal(result.shootTaskReference.p50, 0.5);
  assert.equal(result.outputTaskReference.p50, 0.5);
  assert.equal(result.sessionReference.p50, 2);
  assert.equal(result.scheduledTaskReference.p50, 10);
  assert.equal(result.productReference.p50, 4);
  assert.equal(result.snapshot.weekKey, "2026-07-20");

  const customRange = calculateMediaCapacity(
    data,
    new Date(2026, 6, 22, 23, 59),
    new Date(2026, 6, 22, 14),
    {
      from: new Date(2026, 6, 13),
      to: new Date(2026, 6, 22, 23, 59),
    },
  );
  assert.equal(customRange.focusWeek.label, "13/07–22/07");
  assert.equal(customRange.focusWeek.shootTasks.length, 2);
  assert.equal(customRange.focusWeek.sessionUnits, 3);
  assert.equal(customRange.focusWeek.uniqueStaffCount, 4);
  assert.equal(customRange.focusWeek.outputTasks.length, 3);
});

test("locks Media baseline by month and forecasts an incomplete week", () => {
  const baselineStarts = Array.from(
    { length: 12 },
    (_, index) => new Date(2026, 4, 4 + index * 7, 9),
  );
  const baselineTasks = baselineStarts.flatMap((start, weekIndex) =>
    Array.from({ length: 10 }, (_, taskIndex) =>
      task(`BASE-${weekIndex}-${taskIndex}`, {
        inspectionDate: new Date(start),
      }),
    ),
  );
  const data: DashboardData = {
    fileName: "baseline.xlsx",
    publications: [],
    feedback: [],
    norms: [],
    tasks: [
      ...baselineTasks,
      task("FOCUS-1", {
        inspectionDate: new Date(2026, 6, 27, 10),
      }),
      task("FOCUS-2", {
        inspectionDate: new Date(2026, 6, 29, 10),
      }),
      task("FUTURE-SHOOT", {
        stage: "Quay",
        startDate: new Date(2026, 7, 1, 10),
        shootSession: "FOCUS-SESSION",
      }),
    ],
    shootSessions: [
      ...baselineStarts.map((start, index) => ({
        id: `BASE-SESSION-${index}`,
        date: new Date(start),
        duration: "Nhiều buổi",
        sessionUnits: 5,
        taskCount: 60,
        productCount: 22,
        productCodes: Array.from(
          { length: 22 },
          (_, codeIndex) => `SP-${index}-${codeIndex}`,
        ),
        taskCodes: [],
        type: "Bộ Sưu Tập",
        timeWindow: "",
        model: "",
        status: "Đóng",
      })),
      {
        id: "FOCUS-SESSION",
        date: new Date(2026, 7, 1, 10),
        duration: "Nhiều buổi",
        sessionUnits: 5,
        taskCount: 60,
        productCount: 22,
        productCodes: Array.from(
          { length: 22 },
          (_, index) => `FOCUS-SP-${index}`,
        ),
        taskCodes: ["FUTURE-SHOOT"],
        type: "Bộ Sưu Tập",
        timeWindow: "",
        model: "",
        status: "Mở",
      },
    ],
  };

  const result = calculateMediaCapacity(
    data,
    new Date(2026, 6, 30),
    new Date(2026, 6, 30, 12),
  );

  assert.equal(result.officialBaseline.versionLabel, "08/2026");
  assert.equal(
    result.officialBaseline.windowLabel,
    "04/05/2026–26/07/2026",
  );
  assert.equal(result.officialBaseline.sessionWeekCount, 12);
  assert.equal(result.officialBaseline.outputWeekCount, 12);
  assert.equal(result.officialBaseline.sessionReference.p50, 5);
  assert.equal(result.officialBaseline.scheduledTaskReference.p50, 60);
  assert.equal(result.officialBaseline.productReference.p50, 22);
  assert.equal(result.officialBaseline.outputReference.p50, 10);
  assert.equal(result.focusWeek.sessionUnits, 0);
  assert.equal(result.focusFullWeek.sessionUnits, 5);
  assert.equal(result.forecastOutputCount, 3);
  assert.equal(result.snapshot.baselineVersion, "08/2026");
  assert.equal(result.snapshot.sessionReferenceUnits, 5);

  const customRange = calculateShootTypeBaselines(
    data.shootSessions ?? [],
    new Date(2026, 6, 20),
    new Date(2026, 6, 26, 23, 59),
  );
  assert.equal(customRange.length, 1);
  assert.equal(customRange[0].type, "Bộ Sưu Tập");
  assert.equal(customRange[0].sessions.length, 1);
  assert.equal(customRange[0].taskPerSessionP50, 12);

  const plan = calculateShootTypeBaselinePlan(
    data.shootSessions ?? [],
    new Date(2026, 4, 4),
    new Date(2026, 6, 26, 23, 59),
  );
  assert.equal(plan.weekCount, 12);
  assert.equal(plan.weeklySessionP50, 5);
  assert.equal(plan.overallTaskPerSessionP50, 12);
  assert.equal(plan.weeklyTaskBaseline, 60);
  assert.equal(plan.weeklyProductBaseline, 22);
  assert.equal(plan.observedWeeklyTaskP50, 60);
  assert.equal(plan.observedWeeklyProductP50, 22);
  assert.equal(plan.modelToObservedPercentage, 100);
  assert.equal(plan.rows[0].confidence, "stable");
  assert.equal(plan.fallbackTypeCount, 0);
});

test("uses each shoot type P50 without a minimum sample threshold", () => {
  const plan = calculateShootTypeBaselinePlan(
    [
      {
        id: "COLLECTION",
        date: new Date(2026, 6, 27, 9),
        duration: "Một ngày",
        sessionUnits: 2,
        taskCount: 8,
        productCount: 6,
        productCodes: ["A", "B", "C", "D", "E", "F"],
        taskCodes: [],
        type: "Bộ Sưu Tập",
        timeWindow: "8h30–17h30",
        model: "",
        staffCount: 2,
        status: "Đóng",
      },
      {
        id: "REORDER",
        date: new Date(2026, 6, 28, 9),
        duration: "Một buổi",
        sessionUnits: 1,
        taskCount: 20,
        productCount: 10,
        productCodes: ["G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
        taskCodes: [],
        type: "Order Lại",
        timeWindow: "8h30–12h",
        model: "",
        staffCount: 4,
        status: "Đóng",
      },
    ],
    new Date(2026, 6, 27),
    new Date(2026, 7, 2, 23, 59),
  );

  assert.equal(plan.weeklySessionP50, 3);
  assert.ok(Math.abs(plan.weeklyTaskBaseline - 28) < 1e-9);
  assert.ok(Math.abs(plan.weeklyProductBaseline - 16) < 1e-9);
  assert.equal(plan.fallbackTypeCount, 0);
  assert.equal(plan.staffCoveragePercentage, 100);
  assert.equal(plan.overallStaffPerSessionP50, 2);
  assert.equal(plan.overallTaskPerStaffSessionP50, 2);
  assert.equal(plan.rows[0].taskPerStaffSessionP50, 2);
  assert.equal(plan.rows[1].taskPerStaffSessionP50, 5);
  assert.ok(plan.rows.every((row) => !row.usesOverallFallback));
});

test("weights a full-day shoot as two four-hour samples for P50", () => {
  const baseSession = {
    duration: "Một buổi",
    sessionUnits: 1,
    productCount: 0,
    productCodes: [] as string[],
    taskCodes: [] as string[],
    type: "Bộ Sưu Tập",
    timeWindow: "",
    model: "",
    status: "Đóng",
  };
  const rows = calculateShootTypeBaselines(
    [
      {
        ...baseSession,
        id: "TWO",
        date: new Date(2026, 5, 30),
        taskCount: 2,
      },
      {
        ...baseSession,
        id: "SIXTY-ONE",
        date: new Date(2026, 6, 8),
        taskCount: 61,
      },
      {
        ...baseSession,
        id: "ONE",
        date: new Date(2026, 6, 20),
        taskCount: 1,
      },
      {
        ...baseSession,
        id: "FULL-DAY",
        date: new Date(2026, 7, 1),
        duration: "Một ngày",
        sessionUnits: 2,
        taskCount: 56,
      },
    ],
    new Date(2026, 5, 29),
    new Date(2026, 7, 2, 23, 59),
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].sessionUnits, 5);
  assert.equal(rows[0].taskPerSessionP50, 28);
});

test("groups Media trend by day and only keeps Sundays with data", () => {
  const mondayTask = task("TREND-MON");
  const sundayTask = task("TREND-SUN");
  const common = [
    {
      metric: "shoot" as const,
      date: new Date(2026, 6, 6, 9),
      minutes: 60,
      task: mondayTask,
    },
  ];
  const withoutSunday = calculateMediaTrendSeries(
    common,
    new Date(2026, 6, 6),
    new Date(2026, 6, 12, 23, 59),
    "day",
    new Date(2026, 6, 20),
  );
  assert.equal(withoutSunday.rows.length, 6);
  assert.equal(withoutSunday.rows.at(-1)?.label, "11/07");

  const withSunday = calculateMediaTrendSeries(
    [
      ...common,
      {
        metric: "output" as const,
        date: new Date(2026, 6, 12, 10),
        minutes: 30,
        task: sundayTask,
      },
    ],
    new Date(2026, 6, 6),
    new Date(2026, 6, 12, 23, 59),
    "day",
    new Date(2026, 6, 20),
  );
  assert.equal(withSunday.rows.length, 7);
  assert.equal(withSunday.rows.at(-1)?.label, "12/07");
  assert.deepEqual(withSunday.rows.at(-1)?.outputTasks, [sundayTask]);
});

test("excludes partial Media trend buckets from its matching P50", () => {
  const rows = calculateMediaTrendSeries(
    [
      {
        metric: "shoot",
        date: new Date(2026, 6, 6, 9),
        minutes: 100,
        task: task("FULL-WEEK"),
      },
      {
        metric: "shoot",
        date: new Date(2026, 6, 13, 9),
        minutes: 900,
        task: task("CLIPPED-WEEK"),
      },
    ],
    new Date(2026, 6, 6),
    new Date(2026, 6, 15, 23, 59),
    "week",
    new Date(2026, 6, 20),
  );
  assert.equal(rows.rows.length, 2);
  assert.equal(rows.rows[0].isComplete, true);
  assert.equal(rows.rows[1].isComplete, false);
  assert.equal(rows.rows[0].totalMinutes, 100);
  assert.equal(rows.rows[0].rollingAverageMinutes, null);
  assert.equal(rows.shootReference.p50Minutes, 100);
  assert.equal(rows.totalReference.p50Minutes, 100);
});

test("calculates total Media load and its four-period moving average", () => {
  const events = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(2026, 6, 6 + index * 7, 9);
    return [
      {
        metric: "shoot" as const,
        date,
        minutes: 40 * (index + 1),
        task: task(`SHOOT-${index}`),
      },
      {
        metric: "output" as const,
        date,
        minutes: 60 * (index + 1),
        task: task(`OUTPUT-${index}`),
      },
    ];
  }).flat();
  const result = calculateMediaTrendSeries(
    events,
    new Date(2026, 6, 6),
    new Date(2026, 7, 9, 23, 59),
    "week",
    new Date(2026, 7, 20),
  );

  assert.deepEqual(
    result.rows.map((row) => row.totalMinutes),
    [100, 200, 300, 400, 500],
  );
  assert.deepEqual(
    result.rows.map((row) => row.rollingAverageMinutes),
    [null, null, null, 250, 350],
  );
  assert.equal(result.totalReference.p50Minutes, 300);
});
