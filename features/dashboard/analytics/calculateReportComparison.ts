import {
  businessMinutesBetween,
  dateKey,
  inputDate,
  percentileOf,
  startOfDay,
} from "@/shared/date/dateUtils";
import { isHolidayKey } from "@/shared/date/constants";
import type {
  DashboardData,
  DateWindow,
  ReportDepartment,
  SavedReport,
  Task,
} from "../model/types";
import { EXCLUDED_BACKLOG_STATUSES } from "../model/constants";
import {
  inWindow,
  isGraphicPublication,
  isVideoPublication,
  normalizedKey,
} from "../model/taskUtils";
import { evaluateOverall, isReworkStatus } from "../model/slaUtils";
import { calculateBacklogBreakdown } from "./calculateBacklog";
import { calculateCosts } from "./calculateCosts";
import { calculateLeaderboard } from "./calculateLeaderboard";
import { calculatePublicationStats } from "./calculatePublicationStats";
import { calculateSla } from "./calculateSla";
import { calculateTaskSelection } from "./classifyTasks";
import { calculateReviewerReturns } from "./calculateReviewerReturns";

export type ComparisonPeriod = "week" | "month";
/** Kiểm duyệt chưa có báo cáo lưu riêng nên dùng các kỳ của báo cáo Media. */
export type ComparisonDepartment = ReportDepartment | "review";

export function comparisonReportDepartment(
  department: ComparisonDepartment,
): ReportDepartment {
  return department === "review" ? "media" : department;
}

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

export type ReviewComparisonPoint = ComparisonBase & {
  reviewedTasks: number;
  reviewOnTimeRate: number;
  reviewMinutesP25: number;
  reviewMinutesP50: number;
  reviewMinutesP75: number;
  reviewMinutesP90: number;
  pendingReview: number;
  pendingReviewAt: Date;
  reviewerReturns: Pick<ReturnType<typeof calculateReviewerReturns>,
    "available" | "approvedTasks" | "returnedTasks" | "sourceTasks" | "returnRate"
  >;
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
      !isHolidayKey(dateKey(cursor))
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

const mediaContextCache = new WeakMap<
  DashboardData,
  Map<string, MediaComparisonContext>
>();
const businessStatsCache = new WeakMap<
  DashboardData,
  Map<string, ReturnType<typeof calculatePublicationStats>>
>();
const comparisonPointCache = new WeakMap<
  DashboardData,
  Map<
    string,
    MediaComparisonPoint | BusinessComparisonPoint | ReviewComparisonPoint
  >
>();
const reviewContextCache = new WeakMap<
  DashboardData,
  Map<string, ReviewComparisonContext>
>();

function reportCacheKey(report: SavedReport) {
  return `${report.department}:${report.id}:${JSON.stringify(report.filters)}`;
}

function buildMediaComparisonContext(
  data: DashboardData,
  report: SavedReport,
  window: DateWindow,
) {
  const selection = calculateTaskSelection(data.tasks, window);
  const backlogCutoff =
    inputDate(report.filters.dateTo, true) ?? window.to!;
  const backlog = calculateBacklogBreakdown(data.tasks, backlogCutoff);
  const sla = calculateSla(
    data,
    selection.selectedTasks,
    window,
    backlogCutoff,
    window.to!,
  );
  const leaderboard = calculateLeaderboard(selection.classified);
  const costs = calculateCosts(data.tasks, data.costs, window);
  const selectedFeedback = data.feedback.filter((item) =>
    inWindow(item.at, window),
  );
  const taskByCode = new Map(
    data.tasks.map((task) => [normalizedKey(task.code), task]),
  );
  const overallEligible = selection.selectedTasks
    .map((task) => ({
      task,
      evaluation: evaluateOverall(task, window.to!),
    }))
    .filter((row) => ["onTime", "late"].includes(row.evaluation.code));
  const publicationTasks = report.filters.pieExcludeOutsource
    .videoPublications ||
    report.filters.pieExcludeOutsource.graphicPublications
    ? selection.selectedTasks.filter((task) => !task.outsource)
    : selection.selectedTasks;
  const videoTasks = (
    report.filters.pieExcludeOutsource.videoPublications
      ? publicationTasks
      : selection.selectedTasks
  ).filter(isVideoPublication);
  const graphicTasks = (
    report.filters.pieExcludeOutsource.graphicPublications
      ? publicationTasks
      : selection.selectedTasks
  ).filter(isGraphicPublication);
  return {
    ...selection,
    backlogTasks: backlog.backlogTasks,
    sla,
    leaderboard,
    costs,
    selectedFeedback,
    taskByCode,
    overallEligible,
    videoTasks,
    graphicTasks,
  };
}

export type MediaComparisonContext = ReturnType<
  typeof buildMediaComparisonContext
>;

export function getMediaComparisonContext(
  data: DashboardData,
  report: SavedReport,
  window: DateWindow,
) {
  let cache = mediaContextCache.get(data);
  if (!cache) {
    cache = new Map();
    mediaContextCache.set(data, cache);
  }
  const key = reportCacheKey(report);
  const cached = cache.get(key);
  if (cached) return cached;
  const context = buildMediaComparisonContext(data, report, window);
  cache.set(key, context);
  return context;
}

export function getBusinessComparisonStats(
  data: DashboardData,
  report: SavedReport,
  window: DateWindow,
) {
  let cache = businessStatsCache.get(data);
  if (!cache) {
    cache = new Map();
    businessStatsCache.set(data, cache);
  }
  const key = reportCacheKey(report);
  const cached = cache.get(key);
  if (cached) return cached;
  const stats = calculatePublicationStats(
    data.tasks,
    data.publications,
    window,
  );
  cache.set(key, stats);
  return stats;
}

const FINISHED_STATUSES = new Set(["done", "kinh doanh done"]);
const NOT_SUBMITTED_STATUSES = new Set(["in progress", "to do", "todo"]);
const EXCLUDED_REVIEW_STAGES = new Set(["trainning", "training"]);

/** Thứ Hai đầu tiên của kỳ (00:00) — mốc chụp tồn duyệt mỗi tuần. */
function firstMonday(window: DateWindow) {
  const cursor = startOfDay(window.from!);
  while (cursor.getDay() !== 1 && cursor <= window.to!) {
    cursor.setDate(cursor.getDate() + 1);
  }
  return cursor <= window.to! ? cursor : startOfDay(window.from!);
}

/**
 * Task đã gửi kiểm duyệt trước mốc nhưng chưa hoàn thành tại mốc.
 * Task chưa có Ngày Hoàn Thành chỉ được tính khi trạng thái hiện tại vẫn
 * nằm ở bước duyệt — task bị trả về, mở lại hoặc Done thiếu ngày thì không.
 */
export function isPendingReviewTask(task: Task, cutoff: Date) {
  if (!task.inspectionDate || task.inspectionDate >= cutoff) return false;
  if (EXCLUDED_REVIEW_STAGES.has(normalizedKey(task.stage))) return false;
  const status = normalizedKey(task.status);
  if (EXCLUDED_BACKLOG_STATUSES.has(status)) return false;
  if (task.completedDate) return task.completedDate >= cutoff;
  return (
    !FINISHED_STATUSES.has(status) &&
    !NOT_SUBMITTED_STATUSES.has(status) &&
    !isReworkStatus(status)
  );
}

function buildReviewComparisonContext(
  data: DashboardData,
  window: DateWindow,
) {
  const completedInWindow = data.tasks.filter(
    (task) => task.completedDate && inWindow(task.completedDate, window),
  );
  const onTimeEligible = completedInWindow
    .map((task) => ({
      task,
      evaluation: evaluateOverall(task, window.to!),
    }))
    .filter((row) => ["onTime", "late"].includes(row.evaluation.code));
  const reviewRows = completedInWindow
    .map((task) => ({
      task,
      minutes: businessMinutesBetween(
        task.inspectionDate,
        task.completedDate,
      ),
    }))
    .filter(
      (row): row is { task: Task; minutes: number } => row.minutes !== null,
    );
  const pendingReviewAt = firstMonday(window);
  return {
    onTimeEligible,
    onTimeTasks: onTimeEligible
      .filter((row) => row.evaluation.code === "onTime")
      .map((row) => row.task),
    reviewRows,
    pendingReviewAt,
    pendingReviewTasks: data.tasks.filter((task) =>
      isPendingReviewTask(task, pendingReviewAt),
    ),
    reviewerReturns: calculateReviewerReturns(data, window),
  };
}

type ReviewComparisonContext = ReturnType<
  typeof buildReviewComparisonContext
>;

export function getReviewComparisonContext(
  data: DashboardData,
  report: SavedReport,
  window: DateWindow,
) {
  let cache = reviewContextCache.get(data);
  if (!cache) {
    cache = new Map();
    reviewContextCache.set(data, cache);
  }
  const key = reportCacheKey(report);
  const cached = cache.get(key);
  if (cached) return cached;
  const context = buildReviewComparisonContext(data, window);
  cache.set(key, context);
  return context;
}

function reviewPoint(
  data: DashboardData,
  report: SavedReport,
  window: DateWindow,
): ReviewComparisonPoint {
  const stats = getReviewComparisonContext(data, report, window);
  const minutes = stats.reviewRows.map((row) => row.minutes);
  // Kỳ không có mẫu quy về 0 để vẽ được đường, giống bảng Media.
  const minutePercentile = (ratio: number) =>
    percentileOf(minutes, ratio) ?? 0;
  return {
    ...basePoint(report, window),
    reviewedTasks: stats.onTimeEligible.length,
    reviewOnTimeRate: stats.onTimeEligible.length
      ? (stats.onTimeTasks.length / stats.onTimeEligible.length) * 100
      : 0,
    reviewMinutesP25: minutePercentile(0.25),
    reviewMinutesP50: minutePercentile(0.5),
    reviewMinutesP75: minutePercentile(0.75),
    reviewMinutesP90: minutePercentile(0.9),
    pendingReview: stats.pendingReviewTasks.length,
    pendingReviewAt: stats.pendingReviewAt,
    reviewerReturns: {
      available: stats.reviewerReturns.available,
      approvedTasks: stats.reviewerReturns.approvedTasks,
      returnedTasks: stats.reviewerReturns.returnedTasks,
      sourceTasks: stats.reviewerReturns.sourceTasks,
      returnRate: stats.reviewerReturns.returnRate,
    },
  };
}

function mediaPoint(
  data: DashboardData,
  report: SavedReport,
  window: DateWindow,
): MediaComparisonPoint {
  const stats = getMediaComparisonContext(data, report, window);
  const overallOnTime = stats.overallEligible.filter(
    (row) => row.evaluation.code === "onTime",
  ).length;
  const assigneeMinutes = Object.fromEntries(
    stats.leaderboard.map((row) => [row.label, row.value]),
  );
  const totalMinutes = Object.values(assigneeMinutes).reduce(
    (sum, value) => sum + value,
    0,
  );
  const video = stats.videoTasks.length;
  const graphic = stats.graphicTasks.length;

  return {
    ...basePoint(report, window),
    totalTasks: stats.selectedTasks.length,
    started: stats.startedInWindow.length,
    inspectionCarry: stats.inspectionCarryIntoWindow.length,
    completionCarry: stats.completionCarryIntoWindow.length,
    backlog: stats.backlogTasks.length,
    backlogOverSevenDays: stats.sla.openAgingRows.filter(
      (row) => row.days > 7,
    ).length,
    totalMinutes,
    feedback: stats.selectedFeedback.length,
    handoffOnTimeRate: stats.sla.handoffOnTimeRate,
    overallOnTimeRate: stats.overallEligible.length
      ? (overallOnTime / stats.overallEligible.length) * 100
      : 0,
    overdue: stats.sla.overdueHandoffs.length,
    // Bảng so sánh vẽ thanh và delta nên cần số; kỳ không có mẫu quy về 0.
    // Card SLA trực tiếp vẫn hiện "—" để không nhầm với thành tích 0 phút.
    handoffLateP50: stats.sla.handoffLateP50 ?? 0,
    checkingP50: stats.sla.checkingToDoneP50 ?? 0,
    checkingP90: stats.sla.checkingToDoneP90 ?? 0,
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
  const stats = getBusinessComparisonStats(data, report, window);
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
  department: ComparisonDepartment,
  period: ComparisonPeriod,
) {
  const reportDepartment = comparisonReportDepartment(department);
  return reports
    .filter(
      (report) =>
        report.department === reportDepartment &&
        comparisonPeriod(report) === period,
    )
    .map((report) => {
      const window = reportWindow(report)!;
      let cache = comparisonPointCache.get(data);
      if (!cache) {
        cache = new Map();
        comparisonPointCache.set(data, cache);
      }
      const key = `${period}:${department}:${reportCacheKey(report)}`;
      const cached = cache.get(key);
      if (cached) return cached;
      const point = department === "media"
        ? mediaPoint(data, report, window)
        : department === "review"
          ? reviewPoint(data, report, window)
          : businessPoint(data, report, window);
      cache.set(key, point);
      return point;
    })
    .sort((left, right) => left.from.getTime() - right.from.getTime());
}
