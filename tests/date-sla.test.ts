import assert from "node:assert/strict";
import test from "node:test";
import {
  businessMinutesBetween,
  nextWorkingDay,
  operationalDayLag,
  percentile,
} from "../shared/date/dateUtils";
import {
  completionDueDate,
  evaluateHandoff,
  evaluateOverall,
  handoffDueDate,
  handoffLateMinutes,
  lateMinuteBucket,
} from "../features/dashboard/model/slaUtils";
import type { Task } from "../features/dashboard/model/types";

function at(day: number, hour: number, minute = 0) {
  return new Date(2026, 6, day, hour, minute);
}

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
    startDate: at(20, 9),
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

test("counts only configured business windows, including Saturday", () => {
  assert.equal(
    businessMinutesBetween(at(20, 11, 30), at(20, 13, 30)),
    60,
  );
  assert.equal(
    businessMinutesBetween(at(18, 16, 30), at(20, 9, 30)),
    120,
  );

  const holidayStart = new Date(2026, 8, 2, 9);
  const holidayEnd = new Date(2026, 8, 2, 17);
  assert.equal(businessMinutesBetween(holidayStart, holidayEnd), 0);
});

test("handles working-day and operational-day boundaries", () => {
  const saturday = at(18, 10);
  const monday = nextWorkingDay(saturday);
  assert.equal(monday.getDay(), 1);
  assert.equal(monday.getDate(), 20);
  assert.equal(operationalDayLag(at(20, 8), at(20, 9)), 1);
  assert.equal(percentile([40, 10, 30, 20], 0.5), 20);
  assert.equal(percentile([40, 10, 30, 20], 0.9), 40);
});

test("evaluates handoff and completion SLA edge cases", () => {
  const sameDay = task({ inspectionDate: at(20, 16) });
  assert.equal(evaluateHandoff(sameDay, at(20, 17)).code, "onTime");

  const overdue = task();
  assert.equal(evaluateHandoff(overdue, at(21, 9)).code, "overdue");

  const completedOnNextWorkingDay = task({
    status: "Done",
    completedDate: at(21, 17),
  });
  assert.equal(
    evaluateOverall(completedOnNextWorkingDay, at(22, 9)).code,
    "onTime",
  );

  const completedLate = task({
    status: "Done",
    completedDate: at(22, 9),
  });
  assert.equal(evaluateOverall(completedLate, at(22, 9)).code, "late");
});

test("uses 13:00 media deadlines two days after start and one day after handoff", () => {
  const mediaTask = task({
    stage: "Chụp",
    startDate: at(20, 9),
  });

  assert.equal(handoffDueDate(mediaTask)?.getDate(), 22);
  assert.equal(handoffDueDate(mediaTask)?.getHours(), 13);
  assert.equal(completionDueDate(mediaTask)?.getDate(), 23);
  assert.equal(completionDueDate(mediaTask)?.getHours(), 13);

  assert.equal(
    evaluateHandoff(
      { ...mediaTask, inspectionDate: at(22, 13) },
      at(22, 13),
    ).code,
    "onTime",
  );
  assert.equal(
    evaluateHandoff(
      { ...mediaTask, inspectionDate: at(22, 13, 1) },
      at(22, 13, 1),
    ).code,
    "late",
  );
  assert.equal(evaluateHandoff(mediaTask, at(22, 13)).code, "ongoing");
  assert.equal(evaluateHandoff(mediaTask, at(22, 13, 1)).code, "overdue");

  assert.equal(
    evaluateOverall(
      { ...mediaTask, status: "Done", completedDate: at(23, 13) },
      at(23, 13),
    ).code,
    "onTime",
  );
  assert.equal(
    evaluateOverall(
      { ...mediaTask, status: "Done", completedDate: at(23, 13, 1) },
      at(23, 13, 1),
    ).code,
    "late",
  );
});

test("moves a media deadline falling on Sunday to Monday", () => {
  const friday = new Date(2026, 6, 17, 9);
  const mediaTask = task({ stage: "Quay", startDate: friday });
  const handoffDue = handoffDueDate(mediaTask)!;
  const completionDue = completionDueDate(mediaTask)!;

  assert.equal(handoffDue.getDay(), 1);
  assert.equal(handoffDue.getDate(), 20);
  assert.equal(handoffDue.getHours(), 13);
  assert.equal(completionDue.getDate(), 21);
  assert.equal(completionDue.getHours(), 13);
});

test("calculates handoff lateness in business minutes", () => {
  const lateTask = task({ inspectionDate: at(21, 9, 30) });
  assert.equal(handoffLateMinutes(lateTask), 60);
  assert.equal(lateMinuteBucket(60), "1–60 phút");
  assert.equal(lateMinuteBucket(481), "Trên 480 phút");
});
