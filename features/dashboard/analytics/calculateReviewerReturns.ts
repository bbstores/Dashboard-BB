import type {
  DashboardData,
  DateWindow,
  Feedback,
  ReviewerReturnEvidence,
  ReviewerReturnEvent,
  ReviewerReturnSource,
} from "../model/types";
import { inWindow, normalize, normalizedKey } from "../model/taskUtils";

function personKey(value: string | undefined) {
  return normalizedKey(value)
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const HIEU_KEY = "hieu producer";
/** Các cấp lead chỉ duyệt sau khi Hiếu đã Done. */
const LATER_REVIEWERS = new Map<string, ReviewerReturnSource>([
  ["thuy an", "thuyAn"],
  ["boss bb", "boss"],
  ["thu trang", "thuTrang"],
  ["thu trang content mkt", "thuTrang"],
  ["media planner", "thuTrang"],
  ["thuy sang", "thuySang"],
  ["thuy sang om social", "thuySang"],
]);
/** Mọi trạng thái BOD khác DUYỆT đều cho thấy BOD đã trả task. */
const BOD_RETURN_STATES = new Set(["khong duyet", "dang sua", "da sua", "thuc hien lai"]);

export const REVIEWER_RETURN_SOURCES: Array<{ source: ReviewerReturnSource; label: string }> = [
  { source: "thuyAn", label: "Thuỳ An" },
  { source: "boss", label: "Boss BB" },
  { source: "thuTrang", label: "Thu Trang" },
  { source: "thuySang", label: "Thúy Sang" },
  { source: "bod", label: "BOD" },
  { source: "hieu", label: "Hiếu tự mở lại" },
];

export function returnSourceOf(name: string | undefined): ReviewerReturnSource | null {
  const key = personKey(name);
  return key === HIEU_KEY ? "hieu" : LATER_REVIEWERS.get(key) ?? null;
}

function validDate(value: Date | null | undefined): Date | null {
  return value && Number.isFinite(value.getTime()) ? value : null;
}

const cache = new WeakMap<DashboardData, ReturnType<typeof buildReviewerReturns>>();

/**
 * Ngày Hoàn Thành bị ghi đè mỗi lần task Done lại, nên lần trả của cấp sau
 * thường nằm trước Done mới nhất. Vì cấp lead chỉ duyệt sau Hiếu, mọi lần
 * trả của họ đều được tính, không so với mốc Done. Riêng Reject của Hiếu chỉ
 * là "tự mở lại" khi nằm sau Done mới nhất; trước đó là vòng duyệt bình thường.
 */
function buildReviewerReturns(data: DashboardData) {
  const feedbackByTask = new Map<string, Feedback[]>();
  const seenFeedback = new Set<string>();
  for (const feedback of data.feedback) {
    const taskKey = normalizedKey(feedback.taskCode);
    if (feedback.id) {
      const eventKey = `${taskKey}:${normalizedKey(feedback.id)}`;
      if (seenFeedback.has(eventKey)) continue;
      seenFeedback.add(eventKey);
    }
    const rows = feedbackByTask.get(taskKey) ?? [];
    rows.push(feedback);
    feedbackByTask.set(taskKey, rows);
  }

  const rows: ReviewerReturnEvidence[] = [];
  const seenTasks = new Set<string>();
  for (const task of data.tasks) {
    if (personKey(task.approvalBy) !== HIEU_KEY) continue;
    const taskKey = normalizedKey(task.code);
    if (seenTasks.has(taskKey)) continue;
    seenTasks.add(taskKey);
    const approvedAt = validDate(task.completedDate);
    const events: ReviewerReturnEvent[] = [];
    const ignoredFeedback: Feedback[] = [];
    for (const feedback of feedbackByTask.get(taskKey) ?? []) {
      const source = returnSourceOf(feedback.rejectedBy);
      if (!source) {
        ignoredFeedback.push(feedback);
        continue;
      }
      const at = validDate(feedback.at);
      if (source === "hieu" && !(approvedAt && at && at > approvedAt)) continue;
      events.push({ source, at, by: normalize(feedback.rejectedBy), error: normalize(feedback.error) });
    }
    if (BOD_RETURN_STATES.has(personKey(task.bodApproval))) {
      events.push({ source: "bod", at: validDate(task.bodApprovalDate), by: `BOD · ${normalize(task.bodApproval)}`, error: "" });
    }
    events.sort((a, b) => (a.at?.getTime() ?? Infinity) - (b.at?.getTime() ?? Infinity));
    rows.push({ task, approvedAt, events, ignoredFeedback });
  }
  return {
    available: data.tasks.some((task) => task.approvalBy !== undefined),
    rows,
    unassignedRows: rows.filter((row) => !row.approvedAt),
  };
}

export function getReviewerReturns(data: DashboardData) {
  let result = cache.get(data);
  if (!result) {
    result = buildReviewerReturns(data);
    cache.set(data, result);
  }
  return result;
}

function isReturnedAfterReview(row: ReviewerReturnEvidence) {
  return row.events.some((event) => event.source !== "hieu");
}

export function calculateReviewerReturns(data: DashboardData, window: DateWindow) {
  const all = getReviewerReturns(data);
  const rows = all.rows.filter((row) => row.approvedAt && inWindow(row.approvedAt, window));
  const returnedRows = rows.filter(isReturnedAfterReview);
  const sourceRows = Object.fromEntries(REVIEWER_RETURN_SOURCES.map(({ source }) => [
    source,
    rows.filter((row) => row.events.some((event) => event.source === source)),
  ])) as Record<ReviewerReturnSource, ReviewerReturnEvidence[]>;
  return {
    available: all.available,
    rows,
    returnedRows,
    sourceRows,
    approvedTasks: rows.length,
    returnedTasks: returnedRows.length,
    sourceTasks: Object.fromEntries(
      Object.entries(sourceRows).map(([source, list]) => [source, list.length]),
    ) as Record<ReviewerReturnSource, number>,
    returnRate: rows.length ? (returnedRows.length / rows.length) * 100 : null,
  };
}
