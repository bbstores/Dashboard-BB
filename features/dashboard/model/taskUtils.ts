// ─── Task Classification & Grouping Utilities ──────────────────────────────

import type {
  DateWindow,
  Feedback,
  FeedbackReturnSource,
  PieDatum,
  Task,
  WorkNorm,
} from "./types";

export function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedKey(value: unknown) {
  return normalize(value).toLocaleLowerCase("vi");
}

/**
 * Ba cổng reject trong quy trình: lead kiểm duyệt (nội bộ), BOD, và team kinh doanh.
 * Nhận diện theo tên người trả về vì workbook không có cột phân loại nguồn.
 */
const FEEDBACK_SOURCE_NAMES: Array<{
  match: string;
  source: FeedbackReturnSource;
}> = [
  { match: "thuy sang", source: "business" },
  { match: "thuy an", source: "bod" },
];

export function feedbackReturnSource(
  feedback: Pick<Feedback, "rejectedBy">,
): FeedbackReturnSource {
  const rejectedBy = normalizedKey(feedback.rejectedBy)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  return (
    FEEDBACK_SOURCE_NAMES.find((entry) =>
      rejectedBy.includes(entry.match),
    )?.source ?? "internal"
  );
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
  const formatType = normalizedKey(task.formatType);
  return (
    (formatType.includes("video") || formatType.includes("xào source")) &&
    normalizedKey(task.stage) === "edit"
  );
}

export function isGraphicPublication(task: Task) {
  const formatType = normalizedKey(task.formatType);
  return (
    Boolean(formatType) &&
    !formatType.includes("video") &&
    !formatType.includes("xào source") &&
    normalizedKey(task.stage) === "graphic design"
  );
}

export function isFinalPublicationTask(task: Task) {
  return isVideoPublication(task) || isGraphicPublication(task);
}

export function isNoSocialPublicationTask(task: Task) {
  return normalizedKey(task.platform) === "không đăng social";
}

export function isPendingCancelTask(
  task: Pick<Task, "status">,
) {
  return (
    normalizedKey(task.status).replace(/\s*\/\s*/g, "/") ===
    "pending/cancel"
  );
}

export function publicationSkipsBusinessApproval(task: Task) {
  const title = normalizedKey(task.title);
  const isInstagramTask =
    title.includes("instagram") ||
    /(^|[^\p{L}\p{N}])ig(?=$|[^\p{L}\p{N}])/u.test(title);
  return Boolean(normalize(task.collection)) || isInstagramTask;
}

export function isPublicationReady(task: Task) {
  if (!isFinalPublicationTask(task) || isNoSocialPublicationTask(task)) {
    return false;
  }
  const status = normalizedKey(task.status);
  if (publicationSkipsBusinessApproval(task)) {
    return ["done", "kinh doanh done", "kinh doanh duyệt"].includes(status);
  }
  return ["kinh doanh done", "kinh doanh duyệt"].includes(status);
}

export function publicationSupplyReadyDate(task: Task) {
  if (!isPublicationReady(task)) return null;
  return publicationSkipsBusinessApproval(task)
    ? task.completedDate ?? task.businessApprovalDate
    : task.businessApprovalDate;
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

/** Task tồn luôn bắt đầu trước ngày mốc nên `days` tối thiểu là 1. */
export function agingBucket(days: number) {
  if (days <= 1) return "1 ngày";
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

/**
 * Gom đuôi phân bố thành một nhóm "Khác".
 *
 * Bảng màu chỉ có 10 màu và lặp bằng modulo, nên phân bố nhiều hơn 10 nhóm sẽ
 * có hai nhóm cùng màu. Gom đuôi vừa tránh trùng màu vừa bỏ các lát 1 task
 * không đọc được.
 */
export function groupWithOther(
  rows: PieDatum[],
  maxGroups = 9,
): PieDatum[] {
  if (rows.length <= maxGroups + 1) return rows;
  const head = rows.slice(0, maxGroups);
  const tail = rows.slice(maxGroups);
  return [
    ...head,
    {
      label: `Khác · ${tail.length} nhóm`,
      value: tail.reduce((sum, row) => sum + row.value, 0),
    },
  ];
}

/** Các nhãn đã bị gộp vào lát "Khác", để drill-down lấy đúng tập task. */
export function otherGroupLabels(
  rows: PieDatum[],
  maxGroups = 9,
): string[] {
  if (rows.length <= maxGroups + 1) return [];
  return rows.slice(maxGroups).map((row) => row.label);
}

export function isOtherGroupLabel(label: string) {
  return label.startsWith("Khác · ");
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
