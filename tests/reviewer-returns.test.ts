import assert from "node:assert/strict";
import test from "node:test";
import { calculateReviewerReturns, getReviewerReturns, returnSourceOf } from "../features/dashboard/analytics/calculateReviewerReturns";
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

test("maps export spellings to the later reviewers, Hiếu and nobody else", () => {
  for (const [name, source] of [
    ["Thuỳ An", "thuyAn"], ["Thùy An", "thuyAn"], ["BOSS BB 🤍", "boss"],
    ["Thu Trang - Content MKT", "thuTrang"], ["Thu Trang", "thuTrang"], ["Media Planner", "thuTrang"],
    ["Thúy Sang - OM SOCIAL", "thuySang"], ["Hiếu - Producer", "hieu"],
  ] as const) {
    assert.equal(returnSourceOf(name), source, name);
  }
  for (const name of ["TRÂMM", "Bảo Ngân", "Phương Thuỳ - Media", "Hoàng Anh - MEDIA PLANNER", "BOSS BB giả", "", undefined]) {
    assert.equal(returnSourceOf(name), null, String(name));
  }
});

test("counts unique returned tasks across later reviewers and BOD, and splits them by source", () => {
  const workbook = data([
    task("BOTH", { bodApproval: "KHÔNG DUYỆT ", bodApprovalDate: at(24) }),
    task("BOD", { bodApproval: "ĐANG SỬA" }),
    task("SANG"),
    task("CLEAN", { bodApproval: "DUYỆT" }),
    task("OTHER", { approvalBy: "Media Planner" }),
  ], [
    feedback("BOTH", { id: "ERR-1" }),
    feedback("BOTH", { id: "ERR-1" }),
    feedback("BOTH", { id: "ERR-2", rejectedBy: "Thu Trang - Content MKT" }),
    feedback("BOTH", { id: "ERR-3", rejectedBy: "Media Planner" }),
    feedback("SANG", { rejectedBy: "Thúy Sang - OM SOCIAL" }),
    feedback("OTHER"),
    feedback("CLEAN", { rejectedBy: "TRÂMM" }),
    feedback("CLEAN", { rejectedBy: "" }),
    feedback("UNKNOWN"),
  ]);
  const stats = calculateReviewerReturns(workbook, window);
  assert.equal(stats.approvedTasks, 4);
  assert.equal(stats.returnedTasks, 3);
  assert.deepEqual(stats.returnedRows.map((row) => row.task.code), ["BOTH", "BOD", "SANG"]);
  assert.deepEqual(stats.sourceTasks, { thuyAn: 0, boss: 1, thuTrang: 1, thuySang: 1, bod: 2, hieu: 0 });
  assert.equal(stats.rows[0].events.length, 4, "duplicate feedback ID counted once, BOD added once");
  assert.equal(stats.rows.find((row) => row.task.code === "CLEAN")?.ignoredFeedback.length, 2);
  assert.equal(stats.returnRate, 75);
  assert.equal(getReviewerReturns(workbook), getReviewerReturns(workbook));
});

test("later-reviewer returns count even when the task was Done again afterwards", () => {
  // Thuỳ An trả ngày 21, task làm lại và Done ngày 22: Ngày Hoàn Thành đã bị ghi đè.
  const stats = calculateReviewerReturns(data([task("REDONE"), task("NO-TIME")], [
    feedback("REDONE", { at: at(21), rejectedBy: "Thùy An" }),
    feedback("NO-TIME", { at: null }),
  ]), window);
  assert.equal(stats.returnedTasks, 2);
  assert.equal(stats.sourceTasks.thuyAn, 1);
});

test("Hiếu's own rejects are normal review before Done and a separate self-reopen after it", () => {
  const stats = calculateReviewerReturns(data([task("REVIEW"), task("REOPEN"), task("REOPEN-AND-BOSS")], [
    feedback("REVIEW", { at: at(21), rejectedBy: "Hiếu - Producer" }),
    feedback("REOPEN", { at: at(24), rejectedBy: "Hiếu - Producer" }),
    feedback("REOPEN-AND-BOSS", { at: at(24), rejectedBy: "Hiếu - Producer" }),
    feedback("REOPEN-AND-BOSS", { at: at(25) }),
  ]), window);
  assert.equal(stats.rows[0].events.length, 0);
  assert.equal(stats.returnedTasks, 1);
  assert.deepEqual(stats.returnedRows.map((row) => row.task.code), ["REOPEN-AND-BOSS"]);
  assert.deepEqual(stats.sourceRows.hieu.map((row) => row.task.code), ["REOPEN", "REOPEN-AND-BOSS"]);
});

test("tasks without a latest Done stay out of every period", () => {
  const workbook = data([
    task("NO-LATEST-DONE", { completedDate: null }),
    task("INVALID-DATE", { completedDate: new Date(Number.NaN) }),
    task("IN-WINDOW"),
  ], [feedback("NO-LATEST-DONE")]);
  const stats = calculateReviewerReturns(workbook, window);
  assert.equal(stats.approvedTasks, 1);
  assert.equal(stats.returnedTasks, 0);
  assert.deepEqual(getReviewerReturns(workbook).unassignedRows.map((row) => row.task.code), ["NO-LATEST-DONE", "INVALID-DATE"]);
});

test("reports use the latest Done period and follow subsequent returns beyond its end", () => {
  const workbook = data([
    task("END", { completedDate: window.to }),
    task("NEXT", { completedDate: at(28, 0) }),
    task("START", { completedDate: window.from }),
  ], [feedback("END", { at: at(30) }), feedback("START", { at: at(28) }), feedback("NEXT")]);
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
  const workbook = data([task("RETURNED"), task("CLEAN"), task("BOD", { bodApproval: "KHÔNG DUYỆT" })], [feedback("RETURNED")]);
  const report: SavedReport = {
    id: "WEEK", name: "Media tuần", department: "media", createdAt: "2026-09-28T00:00:00Z",
    filters: { dateFrom: "2026-09-21", dateTo: "2026-09-27", backlogDate: "2026-09-27", collectionMonth: "", leaderboardUnit: "minutes", pieScopes: {}, pieExcludeOutsource: {} },
  };
  const [point] = calculateReportComparison(workbook, [report], "review", "week") as ReviewComparisonPoint[];
  assert.equal(point.reviewerReturns.approvedTasks, 3);
  assert.equal(point.reviewerReturns.returnedTasks, 2);
  for (const [key, expected] of [
    ["hieuReturnedTasks", ["RETURNED", "BOD"]],
    ["hieuReturnRate", ["RETURNED", "BOD"]],
    ["hieuReturn:boss", ["RETURNED"]],
    ["hieuReturn:bod", ["BOD"]],
    ["hieuApprovedTasks", ["RETURNED", "CLEAN", "BOD"]],
  ] as const) {
    const detail = buildComparisonDetail(workbook, report, "review", {
      chartTitle: "Hiếu", key, point, seriesLabel: key, value: 1, formattedValue: "1",
    });
    assert.deepEqual(detail.reviewerReturnEvidence?.map((row) => row.task.code), expected, key);
  }
});
