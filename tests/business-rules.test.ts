import assert from "node:assert/strict";
import test from "node:test";
import {
  feedbackReturnSource,
  groupWithOther,
  isOtherGroupLabel,
  otherGroupLabels,
} from "../features/dashboard/model/taskUtils";
import { isEndOfDayBacklogTask } from "../features/dashboard/analytics/calculateBacklog";
import { calculateLeaderboard } from "../features/dashboard/analytics/calculateLeaderboard";
import { isReworkStatus } from "../features/dashboard/model/slaUtils";
import { percentileOf } from "../shared/date/dateUtils";
import {
  isHolidayKey,
  registerHolidays,
  registeredHolidayCount,
} from "../shared/date/constants";
import type { Task } from "../features/dashboard/model/types";

function task(overrides: Partial<Task> = {}): Task {
  return {
    code: "ANON-001",
    title: "Anonymous task",
    stage: "Edit",
    formatType: "Video",
    productCode: "",
    collection: "",
    expectedMinutes: 60,
    status: "In Progress",
    assignee: "Nhân sự A",
    startDate: new Date(2026, 6, 20, 9),
    completedDate: null,
    inspectionDate: null,
    businessApprovalDate: null,
    handoffRating: "",
    overallRating: "",
    type: "Social",
    outsource: "",
    ...overrides,
  };
}

test("splits rejects into lead, BOD and business gates", () => {
  assert.equal(
    feedbackReturnSource({ rejectedBy: "Thúy Sang - OM SOCIAL" }),
    "business",
  );
  assert.equal(feedbackReturnSource({ rejectedBy: "Thùy An" }), "bod");
  assert.equal(
    feedbackReturnSource({ rejectedBy: "Hiếu - Producer" }),
    "internal",
  );
  // Tên gần giống nhau sau khi bỏ dấu không được rơi sai cổng.
  assert.equal(
    feedbackReturnSource({ rejectedBy: "Phương Thuỳ - Media" }),
    "internal",
  );
  assert.equal(feedbackReturnSource({ rejectedBy: "" }), "internal");
});

test("keeps rework tasks in the open work pool", () => {
  const cutoff = new Date(2026, 6, 30, 23, 59);
  const handedOver = {
    inspectionDate: new Date(2026, 6, 21, 17),
  };

  assert.ok(isReworkStatus("REJECT"));
  assert.ok(isReworkStatus("Thực Hiện Lại"));
  assert.ok(!isReworkStatus("Done"));

  // Đã bàn giao và Done thì rời khỏi tồn.
  assert.equal(
    isEndOfDayBacklogTask(
      task({ ...handedOver, status: "Done" }),
      cutoff,
    ),
    false,
  );
  // Bị reject hoặc đang làm lại thì vẫn là việc đang mở.
  for (const status of ["REJECT", "Thực Hiện Lại"]) {
    assert.equal(
      isEndOfDayBacklogTask(task({ ...handedOver, status }), cutoff),
      true,
      status,
    );
  }
  // BOD ghi ĐANG SỬA cũng là việc đang mở.
  assert.equal(
    isEndOfDayBacklogTask(
      task({ ...handedOver, status: "Done", bodApproval: "ĐANG SỬA" }),
      cutoff,
    ),
    true,
  );
});

test("leaderboard drops cancelled work and keeps unassigned volume", () => {
  const rows = calculateLeaderboard([
    {
      task: task({ code: "A", expectedMinutes: 90 }),
      included: true,
      started: true,
      inspectionCarry: false,
      completionCarry: false,
    },
    {
      task: task({
        code: "B",
        expectedMinutes: 500,
        status: "Pending / Cancel",
      }),
      included: true,
      started: true,
      inspectionCarry: false,
      completionCarry: false,
    },
    {
      task: task({ code: "C", expectedMinutes: 30, assignee: "" }),
      included: true,
      started: true,
      inspectionCarry: false,
      completionCarry: false,
    },
  ]);

  const byLabel = new Map(rows.map((row) => [row.label, row.value]));
  assert.equal(byLabel.get("Nhân sự A"), 90);
  assert.equal(byLabel.get("Chưa có assignee"), 30);
  assert.equal(
    rows.reduce((sum, row) => sum + row.value, 0),
    120,
  );
});

test("folds the distribution tail into one Khác group", () => {
  const rows = Array.from({ length: 14 }, (_, index) => ({
    label: `Định dạng ${index + 1}`,
    value: 20 - index,
  }));
  const folded = groupWithOther(rows);

  assert.equal(folded.length, 10);
  assert.equal(folded.at(-1)!.label, "Khác · 5 nhóm");
  assert.ok(isOtherGroupLabel(folded.at(-1)!.label));
  assert.equal(
    folded.reduce((sum, row) => sum + row.value, 0),
    rows.reduce((sum, row) => sum + row.value, 0),
  );
  assert.deepEqual(otherGroupLabels(rows), [
    "Định dạng 10",
    "Định dạng 11",
    "Định dạng 12",
    "Định dạng 13",
    "Định dạng 14",
  ]);
  // Ít nhóm thì không gom, tránh tạo lát Khác chỉ chứa một nhóm.
  assert.deepEqual(groupWithOther(rows.slice(0, 10)), rows.slice(0, 10));
});

test("reports a missing percentile sample as null, not zero", () => {
  assert.equal(percentileOf([], 0.5), null);
  assert.equal(percentileOf([0], 0.5), 0);
  assert.equal(percentileOf([10, 20, 30], 0.5), 20);
});

test("registers workbook holidays on top of the past-year baseline", () => {
  assert.equal(registeredHolidayCount(), 0);
  assert.ok(isHolidayKey("2026-02-16"));

  registerHolidays(["2026-11-24", "2027-01-01"]);

  assert.equal(registeredHolidayCount(), 2);
  assert.ok(isHolidayKey("2026-11-24"), "ngày nghỉ mới từ workbook");
  assert.ok(isHolidayKey("2027-01-01"), "phủ được năm sau");
  assert.ok(isHolidayKey("2026-02-16"), "vẫn giữ ngày nghỉ đã qua");
  assert.ok(!isHolidayKey("2026-11-25"));

  registerHolidays([]);
});
