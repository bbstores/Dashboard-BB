// ─── SLA Evaluation Utilities ───────────────────────────────────────────────

import type { Task, MilestoneEvaluation } from "./types";
import { KPI_START_DATE } from "./constants";
import {
  startOfDay,
  endOfDay,
  nextWorkingDay,
  sameCalendarDay,
  businessMinutesBetween,
} from "@/shared/date/dateUtils";
import { normalizedKey } from "./taskUtils";

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
    return sameCalendarDay(task.inspectionDate, task.startDate)
      ? { label: "✅ Bàn giao đúng ngày", code: "onTime" }
      : { label: "🔥 Bàn giao trễ ngày", code: "late" };
  }
  if (
    ["done", "kinh doanh done"].includes(normalizedKey(task.status))
  ) {
    return { label: "⚠️ Done nhưng thiếu ngày kiểm duyệt", code: "invalid" };
  }
  return startOfDay(asOf) > startOfDay(task.startDate)
    ? { label: "❌ Quá hạn chưa bàn giao", code: "overdue" }
    : { label: "🟢 Đang thực hiện trong ngày", code: "ongoing" };
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
  const dueDate = endOfDay(nextWorkingDay(task.startDate));
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
