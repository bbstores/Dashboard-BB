import {
  dateKey,
  inputDate,
  startOfDay,
} from "@/shared/date/dateUtils";
import { VIETNAM_HOLIDAYS_2026 } from "@/shared/date/constants";
import type {
  DashboardData,
  DateWindow,
  ReportDepartment,
  SavedReport,
} from "../model/types";
import { evaluateOverall } from "../model/slaUtils";
import { calculateDashboardStats } from "./calculateDashboardStats";
import { calculatePublicationStats } from "./calculatePublicationStats";

export type ComparisonPeriod = "week" | "month";

type ComparisonBase = {
  id: string;
  name: string;
  from: Date;
  to: Date;
  dateLabel: string;
  workingDays: number;
};

export type MediaComparisonPoint = ComparisonBase & {
  totalTasks: number;
  started: number;
  inspectionCarry: number;
  completionCarry: number;
  backlog: number;
  backlogOverSevenDays: number;
  totalMinutes: number;
  feedback: number;
  handoffOnTimeRate: number;
  overallOnTimeRate: number;
  overdue: number;
  handoffLateP50: number;
  checkingP50: number;
  checkingP90: number;
  video: number;
  graphic: number;
  cost: number;
  costPerTask: number;
  assigneeMinutes: Record<string, number>;
};

export type BusinessComparisonPoint = ComparisonBase & {
  total: number;
  posted: number;
  postedRate: number;
  perDay: number;
  reup: number;
  video: number;
  graphic: number;
  unknown: number;
  uniqueMediaTasks: number;
  postsPerMediaTask: number;
  scheduled: number;
  unscheduled: number;
  oldAssets: number;
  dataIssues: number;
  platforms: Record<string, number>;
};

function reportWindow(report: SavedReport): DateWindow | null {
  const from = inputDate(report.filters.dateFrom);
  const to = inputDate(report.filters.dateTo, true);
  if (!from || !to || from > to) return null;
  return { from, to, hasFilter: true };
}

export function comparisonPeriod(report: SavedReport): ComparisonPeriod | null {
  const window = reportWindow(report);
  if (!window?.from || !window.to) return null;
  const inclusiveDays =
    Math.round(
      (startOfDay(window.to).getTime() -
        startOfDay(window.from).getTime()) /
        86400000,
    ) + 1;
  return inclusiveDays <= 8 ? "week" : "month";
}

function workingDays(from: Date, to: Date) {
  let total = 0;
  for (
    let cursor = startOfDay(from);
    cursor <= to;
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    )
  ) {
    if (
      cursor.getDay() !== 0 &&
      !VIETNAM_HOLIDAYS_2026.has(dateKey(cursor))
    ) {
      total += 1;
    }
  }
  return Math.max(1, total);
}

function basePoint(report: SavedReport, window: DateWindow): ComparisonBase {
  const from = window.from!;
  const to = window.to!;
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
  return {
    id: report.id,
    name: report.name,
    from,
    to,
    dateLabel: `${formatter.format(from)}–${formatter.format(to)}`,
    workingDays: workingDays(from, to),
  };
}

function sumValues(values: Array<{ value: number }>) {
  return values.reduce((sum, item) => sum + item.value, 0);
}

function mediaPoint(
  data: DashboardData,
  report: SavedReport,
  window: DateWindow,
): MediaComparisonPoint {
  const stats = calculateDashboardStats(data, {
    dateWindow: window,
    collectionMonth: report.filters.collectionMonth,
    backlogDate: report.filters.dateTo,
  });
  const overall = stats.selectedTasks
    .map((task) => evaluateOverall(task, window.to!))
    .filter((evaluation) =>
      ["onTime", "late"].includes(evaluation.code),
    );
  const overallOnTime = overall.filter(
    (evaluation) => evaluation.code === "onTime",
  ).length;
  const videoMetrics =
    stats.pieMetrics.combined[
      report.filters.pieExcludeOutsource.videoPublications
        ? "withoutOutsource"
        : "all"
    ];
  const graphicMetrics =
    stats.pieMetrics.combined[
      report.filters.pieExcludeOutsource.graphicPublications
        ? "withoutOutsource"
        : "all"
    ];
  const assigneeMinutes = Object.fromEntries(
    stats.leaderboard.map((row) => [row.label, row.value]),
  );
  const totalMinutes = Object.values(assigneeMinutes).reduce(
    (sum, value) => sum + value,
    0,
  );
  const video = sumValues(videoMetrics.videoFormats);
  const graphic = sumValues(graphicMetrics.graphicFormats);

  return {
    ...basePoint(report, window),
    totalTasks: stats.selectedTasks.length,
    started: stats.startedInWindow.length,
    inspectionCarry: stats.inspectionCarryIntoWindow.length,
    completionCarry: stats.completionCarryIntoWindow.length,
    backlog: stats.backlogTotal,
    backlogOverSevenDays: stats.sla.openAgingRows.filter(
      (row) => row.days > 7,
    ).length,
    totalMinutes,
    feedback: stats.selectedFeedback.length,
    handoffOnTimeRate: stats.sla.handoffOnTimeRate,
    overallOnTimeRate: overall.length
      ? (overallOnTime / overall.length) * 100
      : 0,
    overdue: stats.sla.overdueHandoffs.length,
    handoffLateP50: stats.sla.handoffLateP50,
    checkingP50: stats.sla.checkingToDoneP50,
    checkingP90: stats.sla.checkingToDoneP90,
    video,
    graphic,
    cost: stats.costs.selectedAmount,
    costPerTask: stats.costs.selectedTaskCosts.length
      ? stats.costs.selectedAmount / stats.costs.selectedTaskCosts.length
      : 0,
    assigneeMinutes,
  };
}

function businessPoint(
  data: DashboardData,
  report: SavedReport,
  window: DateWindow,
): BusinessComparisonPoint {
  const stats = calculatePublicationStats(
    data.tasks,
    data.publications,
    window,
  );
  const base = basePoint(report, window);

  return {
    ...base,
    total: stats.total,
    posted: stats.posted,
    postedRate: stats.total ? (stats.posted / stats.total) * 100 : 0,
    perDay: stats.total / base.workingDays,
    reup: stats.reup,
    video: stats.video,
    graphic: stats.graphic,
    unknown: stats.unknown,
    uniqueMediaTasks: stats.uniqueMediaTasks,
    postsPerMediaTask: stats.uniqueMediaTasks
      ? stats.media / stats.uniqueMediaTasks
      : 0,
    scheduled: stats.assetScheduledTasks.length,
    unscheduled: stats.assetUnscheduledTasks.length,
    oldAssets: stats.oldAssets.length,
    dataIssues:
      stats.unknownPostDetails.length +
      stats.noSocialPostDetails.length,
    platforms: Object.fromEntries(
      stats.platformRows.map((row) => [row.label, row.total]),
    ),
  };
}

export function calculateReportComparison(
  data: DashboardData,
  reports: SavedReport[],
  department: ReportDepartment,
  period: ComparisonPeriod,
) {
  return reports
    .filter(
      (report) =>
        report.department === department &&
        comparisonPeriod(report) === period,
    )
    .map((report) => {
      const window = reportWindow(report)!;
      return department === "media"
        ? mediaPoint(data, report, window)
        : businessPoint(data, report, window);
    })
    .sort((left, right) => left.from.getTime() - right.from.getTime());
}
