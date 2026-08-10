// ─── SLA Evaluation Utilities ───────────────────────────────────────────────

import type { Task, MilestoneEvaluation } from "./types";
import { KPI_START_DATE } from "./constants";
import {
  startOfDay,
  endOfDay,
  nextWorkingDay,
  businessMinutesBetween,
} from "@/shared/date/dateUtils";
import { normalizedKey } from "./taskUtils";

const SPECIAL_MEDIA_STAGES = new Set(["quay", "chụp"]);

function isSpecialMediaTask(task: Task) {
  return SPECIAL_MEDIA_STAGES.has(normalizedKey(task.stage));
}

function moveSundayToMonday(value: Date) {
  const date = new Date(value);
  if (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return date;
}

/** Hạn bàn giao áp dụng từ KPI_START_DATE. */
export function handoffDueDate(task: Task) {
  if (!task.startDate) return null;
  if (!isSpecialMediaTask(task)) return endOfDay(task.startDate);

  const dueDate = startOfDay(task.startDate);
  dueDate.setDate(dueDate.getDate() + 2);
  dueDate.setHours(13, 0, 0, 0);
  return moveSundayToMonday(dueDate);
}

/** Hạn hoàn thành: công đoạn thường giữ quy định cũ; Quay/Chụp thêm 1 ngày sau hạn bàn giao. */
export function completionDueDate(task: Task) {
  if (!task.startDate) return null;
  if (!isSpecialMediaTask(task)) {
    return endOfDay(nextWorkingDay(task.startDate));
  }

  const handoffDue = handoffDueDate(task)!;
  const dueDate = new Date(handoffDue);
  dueDate.setDate(dueDate.getDate() + 1);
  return moveSundayToMonday(dueDate);
}

export function evaluateHandoff(task: Task, asOf: Date): MilestoneEvaluation {
  if (!task.startDate) {
    return { label: "⚪ Thiếu ngày bắt đầu", code: "invalid" };
  }
  if (task.startDate < KPI_START_DATE) {
    return { label: "📜 Không tính KPI", code: "excluded" };
  }
  if (["to do", "todo"].includes(normalizedKey(task.status))) {
    return { label: "⚪ Chưa bắt đầu", code: "notStarted" };
  }
  if (task.inspectionDate) {
    if (task.inspectionDate < startOfDay(task.startDate)) {
      return { label: "⚠️ Sai thứ tự ngày", code: "invalid" };
    }
    return task.inspectionDate <= handoffDueDate(task)!
      ? { label: "✅ Bàn giao đúng hạn", code: "onTime" }
      : { label: "🔥 Bàn giao trễ hạn", code: "late" };
  }
  if (
    ["done", "kinh doanh done"].includes(normalizedKey(task.status))
  ) {
    return { label: "⚠️ Done nhưng thiếu ngày kiểm duyệt", code: "invalid" };
  }
  return asOf > handoffDueDate(task)!
    ? { label: "❌ Quá hạn chưa bàn giao", code: "overdue" }
    : { label: "🟢 Đang trong hạn bàn giao", code: "ongoing" };
}

export function evaluateOverall(task: Task, asOf: Date): MilestoneEvaluation {
  if (!task.startDate) {
    return { label: "⚪ Thiếu ngày bắt đầu", code: "invalid" };
  }
  if (task.startDate < KPI_START_DATE) {
    return { label: "📜 Không tính KPI", code: "excluded" };
  }
  const status = normalizedKey(task.status);
  if (
    ["archived", "pending / cancel", "pending/cancel"].includes(status)
  ) {
    return { label: "⏸ Không tính / Đã dừng", code: "excluded" };
  }
  const dueDate = completionDueDate(task)!;
  if (["done", "kinh doanh done"].includes(status)) {
    if (!task.completedDate) {
      return {
        label: "⚠️ Done nhưng thiếu ngày hoàn thành",
        code: "invalid",
      };
    }
    if (task.completedDate < startOfDay(task.startDate)) {
      return { label: "⚠️ Sai thứ tự ngày", code: "invalid" };
    }
    return task.completedDate <= dueDate
      ? { label: "✅ Hoàn thành đúng hạn", code: "onTime" }
      : { label: "🔥 Hoàn thành trễ hạn", code: "late" };
  }
  if (asOf > dueDate) {
    return { label: "❌ Quá hạn hoàn thành", code: "overdue" };
  }
  if (status === "reviewing") {
    return { label: "🟠 Đang reviewing", code: "ongoing" };
  }
  if (status === "checking") {
    return { label: "🟡 Đang kiểm duyệt", code: "ongoing" };
  }
  if (status === "in progress") {
    return { label: "🟢 Đang thực hiện", code: "ongoing" };
  }
  return { label: "⚪ Chưa bắt đầu", code: "notStarted" };
}

export function handoffLateMinutes(task: Task) {
  if (!task.startDate || !task.inspectionDate) return 0;
  if (isSpecialMediaTask(task)) {
    const dueDate = handoffDueDate(task)!;
    if (task.inspectionDate <= dueDate) return 0;
    return businessMinutesBetween(dueDate, task.inspectionDate) ?? 0;
  }
  const anchor = nextWorkingDay(task.startDate);
  anchor.setHours(8, 30, 0, 0);
  if (task.inspectionDate <= anchor) return 0;
  return businessMinutesBetween(anchor, task.inspectionDate) ?? 0;
}

export function lateMinuteBucket(minutes: number) {
  if (minutes === 0) return "Trễ ngày · 0 phút làm việc";
  if (minutes <= 60) return "1–60 phút";
  if (minutes <= 120) return "61–120 phút";
  if (minutes <= 240) return "121–240 phút";
  if (minutes <= 480) return "241–480 phút";
  return "Trên 480 phút";
}
