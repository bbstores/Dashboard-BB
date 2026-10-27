// ─── SLA Evaluation Utilities ───────────────────────────────────────────────

import type { Task, MilestoneEvaluation } from "./types";
import { KPI_START_DATE } from "./constants";
import {
  startOfDay,
  endOfDay,
  nextWorkingDay,
  businessMinutesBetween,
  isWorkingDay,
} from "@/shared/date/dateUtils";
import { normalizedKey } from "./taskUtils";

const SPECIAL_MEDIA_STAGES = new Set(["quay", "chụp"]);

function isSpecialMediaTask(task: Task) {
  return SPECIAL_MEDIA_STAGES.has(normalizedKey(task.stage));
}

/** Hạn rơi vào Chủ nhật hoặc ngày nghỉ thì dời sang ngày làm việc kế tiếp, giữ nguyên giờ. */
function moveToWorkingDay(value: Date) {
  const date = new Date(value);
  while (!isWorkingDay(date)) date.setDate(date.getDate() + 1);
  return date;
}

/**
 * Mốc phúc lợi của Quay/Chụp: hạn tính từ ngày bắt đầu, chốt 14:00.
 * Bàn giao D+2 14:00, hoàn thành D+3 14:00 — hai mốc tính độc lập nhau nên
 * phép dời ngày nghỉ của mốc bàn giao không được cộng dồn sang mốc hoàn thành.
 */
const MEDIA_DEADLINE_HOUR = 14;

function mediaDueDate(startDate: Date, dayOffset: number) {
  const dueDate = startOfDay(startDate);
  dueDate.setDate(dueDate.getDate() + dayOffset);
  dueDate.setHours(MEDIA_DEADLINE_HOUR, 0, 0, 0);
  return moveToWorkingDay(dueDate);
}

/**
 * Mốc chấm bàn giao: lần bàn giao đầu tiên, vì Ngày Kiểm Duyệt bị ghi đè khi
 * nộp lại sau trả về. Task trước 22/09/2026 chưa có mốc này nên dùng Ngày Kiểm Duyệt.
 */
export function handoffAt(task: Task) {
  return task.firstHandoffDate ?? task.inspectionDate;
}

/** Hạn bàn giao áp dụng từ KPI_START_DATE. */
export function handoffDueDate(task: Task) {
  if (!task.startDate) return null;
  if (!isSpecialMediaTask(task)) return endOfDay(task.startDate);
  return mediaDueDate(task.startDate, 2);
}

/** Hạn hoàn thành: công đoạn thường là cuối ngày làm việc kế tiếp; Quay/Chụp là D+3 14:00. */
export function completionDueDate(task: Task) {
  if (!task.startDate) return null;
  if (!isSpecialMediaTask(task)) {
    return endOfDay(nextWorkingDay(task.startDate));
  }
  return mediaDueDate(task.startDate, 3);
}

export function evaluateHandoff(task: Task, asOf: Date): MilestoneEvaluation {
  if (!task.startDate) {
    return { label: "⚪ Thiếu ngày bắt đầu", code: "invalid" };
  }
  if (task.startDate < KPI_START_DATE) {
    return { label: "📜 Không tính KPI", code: "excluded" };
  }
  const status = normalizedKey(task.status);
  if (isStoppedStatus(status)) {
    return { label: "⏸ Không tính / Đã dừng", code: "excluded" };
  }
  const handedAt = handoffAt(task);
  if (handedAt) {
    if (handedAt < startOfDay(task.startDate)) {
      return { label: "⚠️ Sai thứ tự ngày", code: "invalid" };
    }
    return handedAt <= handoffDueDate(task)!
      ? { label: "✅ Bàn giao đúng hạn", code: "onTime" }
      : { label: "🔥 Bàn giao trễ hạn", code: "late" };
  }
  if (["done", "kinh doanh done"].includes(status)) {
    return { label: "⚠️ Done nhưng thiếu ngày kiểm duyệt", code: "invalid" };
  }
  if (asOf > handoffDueDate(task)!) {
    return { label: "❌ Quá hạn chưa bàn giao", code: "overdue" };
  }
  if (["to do", "todo"].includes(status)) {
    return { label: "⚪ Chưa bắt đầu", code: "notStarted" };
  }
  return { label: "🟢 Đang trong hạn bàn giao", code: "ongoing" };
}

/** Task đã dừng hoặc lưu trữ: không tính vào cả hai mốc đánh giá. */
function isStoppedStatus(status: string) {
  return ["archived", "pending / cancel", "pending/cancel"].includes(status);
}

/** Đang trong luồng duyệt; Skip là task bỏ qua bước Hiếu, vẫn chờ lead/BOD duyệt. */
function isInReviewStatus(status: string) {
  return ["checking", "reviewing", "skip"].includes(status);
}

/** Trạng thái thuộc vòng lặp làm lại sau khi bị reject. */
export function isReworkStatus(status: string) {
  return ["reject", "thực hiện lại", "thuc hien lai"].includes(
    normalizedKey(status),
  );
}

export function evaluateOverall(task: Task, asOf: Date): MilestoneEvaluation {
  if (!task.startDate) {
    return { label: "⚪ Thiếu ngày bắt đầu", code: "invalid" };
  }
  if (task.startDate < KPI_START_DATE) {
    return { label: "📜 Không tính KPI", code: "excluded" };
  }
  const status = normalizedKey(task.status);
  if (isStoppedStatus(status)) {
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
  if (isReworkStatus(status)) {
    return { label: "🔄 Đang làm lại sau reject", code: "ongoing" };
  }
  if (asOf > dueDate) {
    return { label: "❌ Quá hạn hoàn thành", code: "overdue" };
  }
  if (isInReviewStatus(status)) {
    return { label: "🟡 Đang kiểm duyệt", code: "ongoing" };
  }
  if (status === "in progress") {
    return { label: "🟢 Đang thực hiện", code: "ongoing" };
  }
  return { label: "⚪ Chưa bắt đầu", code: "notStarted" };
}

export function handoffLateMinutes(task: Task) {
  const handedAt = handoffAt(task);
  if (!task.startDate || !handedAt) return 0;
  if (isSpecialMediaTask(task)) {
    const dueDate = handoffDueDate(task)!;
    if (handedAt <= dueDate) return 0;
    return businessMinutesBetween(dueDate, handedAt) ?? 0;
  }
  const anchor = nextWorkingDay(task.startDate);
  anchor.setHours(8, 30, 0, 0);
  if (handedAt <= anchor) return 0;
  return businessMinutesBetween(anchor, handedAt) ?? 0;
}

export function lateMinuteBucket(minutes: number) {
  if (minutes === 0) return "Trễ ngày · 0 phút làm việc";
  if (minutes <= 60) return "1–60 phút";
  if (minutes <= 120) return "61–120 phút";
  if (minutes <= 240) return "121–240 phút";
  if (minutes <= 480) return "241–480 phút";
  return "Trên 480 phút";
}
