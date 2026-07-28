// ─── Task Classification & Grouping Utilities ──────────────────────────────

import type { Task, WorkNorm, DateWindow, PieDatum } from "./types";

export function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedKey(value: unknown) {
  return normalize(value).toLocaleLowerCase("vi");
}

export function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function matchesGroup(value: string, label: string) {
  return (normalize(value) || "Chưa xác định") === label;
}

export function assigneeNames(value: string) {
  const names = Array.from(
    new Set(
      value
        .split(",")
        .map(normalize)
        .filter(Boolean),
    ),
  );
  return names.length ? names : ["Chưa có assignee"];
}

export function isVideoPublication(task: Task) {
  return (
    normalizedKey(task.formatType).includes("video") &&
    normalizedKey(task.stage) === "edit"
  );
}

export function isGraphicPublication(task: Task) {
  return (
    Boolean(normalizedKey(task.formatType)) &&
    !normalizedKey(task.formatType).includes("video") &&
    normalizedKey(task.stage) === "graphic design"
  );
}

export function isFinalPublicationTask(task: Task) {
  return isVideoPublication(task) || isGraphicPublication(task);
}

export function isNoSocialPublicationTask(task: Task) {
  return normalizedKey(task.platform) === "không đăng social";
}

export function publicationReadyDate(task: Task) {
  return (
    task.businessApprovalDate ??
    task.completedDate ??
    task.inspectionDate ??
    task.startDate
  );
}

export function normMinutesFor(task: Task, norms: Map<string, WorkNorm>) {
  const norm = norms.get(normalizedKey(task.formatType));
  if (!norm) return null;
  const stage = normalizedKey(task.stage);
  if (stage === "quay" || stage === "chụp") return norm.recordMinutes || null;
  if (stage === "edit") return norm.editMinutes || null;
  if (stage === "graphic design") return norm.graphicMinutes || null;
  if (stage === "viết content") return norm.contentMinutes || null;
  return null;
}

export function cycleBucket(days: number) {
  if (days === 0) return "Hoàn thành cùng ngày";
  if (days === 1) return "Sau 1 ngày";
  if (days <= 3) return "2–3 ngày";
  if (days <= 5) return "4–5 ngày";
  return "Trên 5 ngày";
}

export function agingBucket(days: number) {
  if (days === 0) return "Bắt đầu hôm nay";
  if (days === 1) return "1 ngày";
  if (days <= 3) return "2–3 ngày";
  if (days <= 7) return "4–7 ngày";
  return "Trên 7 ngày";
}

export function groupCount<T>(rows: T[], key: (row: T) => string): PieDatum[] {
  const result = new Map<string, number>();
  for (const row of rows) {
    const label = normalize(key(row)) || "Chưa xác định";
    result.set(label, (result.get(label) ?? 0) + 1);
  }
  return Array.from(result.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function collectionMonths(task: Task) {
  return Array.from(new Set(task.collection.match(/\d{2}\.\d{4}/g) ?? []));
}

export function collectionNames(task: Task, month: string) {
  return Array.from(
    new Set(
      task.collection
        .split(",")
        .map(normalize)
        .filter((name) => name && name.includes(month)),
    ),
  );
}

export function isCollectionDone(task: Task) {
  const status = normalizedKey(task.status);
  return status === "done" || status === "kinh doanh done";
}

export function outsourceName(task: Task) {
  return normalizedKey(task.outsource) === "outsource"
    ? "Chưa xác định người outsource"
    : task.outsource;
}

export function inWindow(date: Date | null, window: DateWindow) {
  if (!window.hasFilter) return true;
  if (!date) return false;
  if (window.from && date < window.from) return false;
  if (window.to && date > window.to) return false;
  return true;
}

export function classifyTask(task: Task, window: DateWindow) {
  if (!window.hasFilter) {
    return {
      included: true,
      started: true,
      inspectionCarry: false,
      completionCarry: false,
    };
  }
  const started = inWindow(task.startDate, window);
  const startsOutside =
    Boolean(task.startDate) && !inWindow(task.startDate, window);
  const inspectionCarry =
    startsOutside &&
    Boolean(task.inspectionDate) &&
    inWindow(task.inspectionDate, window);
  const completionCarry =
    startsOutside &&
    Boolean(task.completedDate) &&
    inWindow(task.completedDate, window);
  return {
    included: started || inspectionCarry || completionCarry,
    started,
    inspectionCarry,
    completionCarry,
  };
}
