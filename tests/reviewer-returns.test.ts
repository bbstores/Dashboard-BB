import assert from "node:assert/strict";
import test from "node:test";
import { calculateReviewerReturns, getReviewerReturns, isTrustedReturner } from "../features/dashboard/analytics/calculateReviewerReturns";
import { calculateReportComparison, type ReviewComparisonPoint } from "../features/dashboard/analytics/calculateReportComparison";
import { buildComparisonDetail } from "../features/dashboard/analytics/buildComparisonDetail";
import type { DashboardData, Feedback, SavedReport, Task } from "../features/dashboard/model/types";

const at = (day: number, hour = 10) => new Date(2026, 8, day, hour);
const window = { from: at(21, 0), to: new Date(2026, 8, 27, 23, 59, 59, 999), hasFilter: true };

function task(code: string, overrides: Partial<Task> = {}): Task {
  return {
    code, title: code, stage: "Edit", formatType: "Video", productCode: "", collection: "",
    expectedMinutes: 60, status: "Done", assignee: "Nhân sự", startDate: at(21),
    inspectionDate: at(22, 9), completedDate: at(22), businessApprovalDate: null,
    handoffRating: "", overallRating: "", type: "", outsource: "", approvalBy: "Hiếu - Producer",
    ...overrides,
  };
}

function feedback(taskCode: string, overrides: Partial<Feedback> = {}): Feedback {
  return { taskCode, at: at(23), assignee: "Nhân sự", rejectedBy: "BOSS BB 🤍", ...overrides };
}

function data(tasks: Task[], feedback: Feedback[] = []): DashboardData {
  return { tasks, feedback, publications: [], norms: [], fileName: "reviewer.xlsx" };
}

test("only the five authorized returners are trusted, including export spellings", () => {
  for (const name of ["Thuỳ An", "Thùy An", "BOSS BB 🤍", "Hiếu - Producer", "Thu Trang - Content MKT", "Thu Trang", "Media Planner"]) {
    assert.equal(isTrustedReturner(name), true, name);
  }
  for (const name of ["Thúy Sang - OM SOCIAL", "Bảo Ngân", "Thu Trang Media Planner", "Hoàng Anh - MEDIA PLANNER", "BOSS BB giả", "", undefined]) {
    assert.equal(isTrustedReturner(name), false, String(name));
  }
});

test("counts unique tasks across Reject and BOD and keeps history events separate", () => {
  const workbook = data([
    task("BOTH", { bodApproval: "KHÔNG DUYỆT ", bodApprovalDate: at(24) }),
    task("BOD", { bodApproval: "KHÔNG DUYỆT", bodApprovalDate: at(24) }),
    task("CLEAN"),
    task("OTHER", { approvalBy: "Media Planner" }),
  ], [
    feedback("BOTH", { id: "ERR-1" }),
    feedback("BOTH", { id: "ERR-1" }),
    feedback("BOTH", { id: "ERR-2", rejectedBy: "Thu Trang - Content MKT" }),
    feedback("BOTH", { id: "ERR-3", rejectedBy: "Media Planner" }),
    feedback("BOTH", { id: "ERR-4", rejectedBy: "Hiếu - Producer" }),
    feedback("OTHER"),
    feedback("CLEAN", { rejectedBy: "Thúy Sang - OM SOCIAL" }),
    feedback("CLEAN", { rejectedBy: "" }),
    feedback("UNKNOWN"),
  ]);
  const stats = calculateReviewerReturns(workbook, window);
  assert.equal(stats.approvedTasks, 3);
  assert.equal(stats.returnedTasks, 2);
  assert.equal(stats.rejectTasks, 1);
  assert.equal(stats.bodTasks, 2);
  assert.equal(stats.rejectEvents, 4, "BOD snapshot does not add a duplicate history event");
  assert.equal(stats.ignoredEvents, 2);
  assert.equal(stats.uncertainTasks, 0);
  assert.ok(Math.abs(stats.returnRate! - 200 / 3) < 1e-10);
  assert.deepEqual(stats.returnedRows.map((row) => row.task.code), ["BOTH", "BOD"]);
  assert.equal(getReviewerReturns(workbook), getReviewerReturns(workbook));
});

test("does not attribute earlier review rounds to the latest reviewer or use current status to erase a return", () => {
  const stats = calculateReviewerReturns(data([
    task("BEFORE-FIRST", { firstCompletedDate: at(22) }),
    task("EARLIER-ROUND", { firstCompletedDate: at(21) }),
    task("SAME-TIME"),
    task("REOPENED", { status: "Thực Hiện Lại" }),
  ], [
    feedback("BEFORE-FIRST", { at: at(21), rejectedBy: "Hiếu - Producer" }),
    feedback("EARLIER-ROUND", { at: at(21, 12) }),
    feedback("SAME-TIME", { at: at(22) }),
    feedback("REOPENED"),
  ]), window);
  assert.equal(stats.returnedTasks, 1);
  assert.equal(stats.uncertainTasks, 2);
  assert.deepEqual(stats.uncertainRows.map((row) => row.task.code), ["EARLIER-ROUND", "SAME-TIME"]);
  assert.equal(stats.rows[0].events.length, 0, "reject before the first Done is not a post-approval return");
  assert.equal(stats.returnedRows[0].task.code, "REOPENED");
});

test("missing dates remain uncertain and missing latest Done cannot be assigned to a period", () => {
  const workbook = data([
    task("BOD-NO-DATE", { bodApproval: "KHÔNG DUYỆT" }),
    task("REJECT-NO-DATE"),
    task("NO-LATEST-DONE", { completedDate: null, firstCompletedDate: at(22) }),
    task("INVALID-DATE", { completedDate: new Date(Number.NaN) }),
    task("BOD-BEFORE-DONE", { bodApproval: "KHÔNG DUYỆT", bodApprovalDate: at(21) }),
  ], [feedback("REJECT-NO-DATE", { at: null }), feedback("NO-LATEST-DONE")]);
  const stats = calculateReviewerReturns(workbook, window);
  assert.equal(stats.approvedTasks, 3);
  assert.equal(stats.returnedTasks, 0);
  assert.equal(stats.uncertainTasks, 3);
  assert.deepEqual(getReviewerReturns(workbook).unassignedRows.map((row) => row.task.code), ["NO-LATEST-DONE", "INVALID-DATE"]);
});

test("reports use the latest Done period and follow subsequent returns beyond its end", () => {
  const workbook = data([
    task("END", { completedDate: window.to }),
    task("NEXT", { completedDate: at(28, 0) }),
    task("START", { completedDate: window.from }),
    task("LATEST", { firstCompletedDate: at(10), completedDate: at(28) }),
  ], [feedback("END", { at: at(30) }), feedback("START", { at: at(28) })]);
  const stats = calculateReviewerReturns(workbook, window);
  assert.equal(stats.approvedTasks, 2);
  assert.equal(stats.returnedTasks, 2);
  const empty = calculateReviewerReturns(workbook, { from: at(1), to: at(7), hasFilter: true });
  assert.equal(empty.returnRate, null);
});

test("legacy files without Approval By leave the new metric unavailable", () => {
  const stats = calculateReviewerReturns(data([task("LEGACY", { approvalBy: undefined })]), window);
  assert.equal(stats.available, false);
  assert.equal(stats.returnRate, null);
});

test("comparison totals and drawer evidence use the same task population", () => {
  const workbook = data([task("RETURNED"), task("CLEAN"), task("UNCERTAIN", { bodApproval: "KHÔNG DUYỆT" })], [feedback("RETURNED")]);
  const report: SavedReport = {
    id: "WEEK", name: "Media tuần", department: "media", createdAt: "2026-09-28T00:00:00Z",
    filters: { dateFrom: "2026-09-21", dateTo: "2026-09-27", backlogDate: "2026-09-27", collectionMonth: "", leaderboardUnit: "minutes", pieScopes: {}, pieExcludeOutsource: {} },
  };
  const [point] = calculateReportComparison(workbook, [report], "review", "week") as ReviewComparisonPoint[];
  assert.equal(point.reviewerReturns.approvedTasks, 3);
  assert.equal(point.reviewerReturns.returnedTasks, 1);
  for (const [key, expected] of [
    ["hieuReturnedTasks", ["RETURNED"]],
    ["hieuReturnRate", ["RETURNED"]],
    ["hieuUncertainTasks", ["UNCERTAIN"]],
    ["hieuApprovedTasks", ["RETURNED", "CLEAN", "UNCERTAIN"]],
  ] as const) {
    const detail = buildComparisonDetail(workbook, report, "review", {
      chartTitle: "Hiếu", key, point, seriesLabel: key, value: 1, formattedValue: "1",
    });
    assert.deepEqual(detail.reviewerReturnEvidence?.map((row) => row.task.code), expected);
  }
});
