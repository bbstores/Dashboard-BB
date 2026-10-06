import type {
  DashboardData,
  DateWindow,
  Feedback,
  ReviewerReturnEvidence,
  ReviewerReturnEvent,
} from "../model/types";
import { inWindow, normalize, normalizedKey } from "../model/taskUtils";

function personKey(value: string | undefined) {
  return normalizedKey(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const HIEU_KEY = "hieu producer";
const TRUSTED_RETURNERS = new Map([
  ["thuy an", "Thuỳ An"],
  ["boss bb", "Boss BB"],
  [HIEU_KEY, "Hiếu Producer"],
  ["thu trang", "Thu Trang"],
  ["thu trang content mkt", "Thu Trang"],
  ["media planner", "Media Planner"],
]);

export function isTrustedReturner(name: string | undefined) {
  return TRUSTED_RETURNERS.has(personKey(name));
}

function validDate(value: Date | null | undefined): Date | null {
  return value && Number.isFinite(value.getTime()) ? value : null;
}

const cache = new WeakMap<DashboardData, ReturnType<typeof buildReviewerReturns>>();

/**
 * Chỉ xác nhận trả sau Done mới nhất: Approval By không lưu người duyệt
 * của các vòng trước. Ngày Hoàn Thành Lần Đầu chỉ giúp loại reject trước
 * lần Done đầu tiên, không được dùng để gán người duyệt lịch sử cho Hiếu.
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
    const firstDone = validDate(task.firstCompletedDate);
    const events: ReviewerReturnEvent[] = [];
    const ignoredFeedback: Feedback[] = [];
    for (const feedback of feedbackByTask.get(taskKey) ?? []) {
      if (!isTrustedReturner(feedback.rejectedBy)) {
        ignoredFeedback.push(feedback);
        continue;
      }
      const at = validDate(feedback.at);
      // Mốc lần đầu chỉ đáng tin làm cận dưới khi không nằm sau mốc mới nhất.
      if (at && firstDone && (!approvedAt || firstDone <= approvedAt) && at < firstDone) {
        continue;
      }
      const counted = Boolean(approvedAt && at && at > approvedAt);
      events.push({
        kind: "reject",
        at,
        by: normalize(feedback.rejectedBy),
        error: normalize(feedback.error),
        counted,
        reason: counted
          ? "Reject sau Done mới nhất"
          : !at
            ? "Thiếu thời điểm Reject"
            : !approvedAt
              ? "Thiếu ngày Done mới nhất"
              : at.getTime() === approvedAt.getTime()
                ? "Reject trùng mốc Done; chưa xác định thứ tự"
                : "Reject trước Done mới nhất; chưa xác định người duyệt vòng trước",
      });
    }
    if (personKey(task.bodApproval) === "khong duyet") {
      const at = validDate(task.bodApprovalDate);
      const counted = Boolean(approvedAt && at && at > approvedAt);
      events.push({
        kind: "bod",
        at,
        by: "BOD",
        error: "",
        counted,
        reason: counted
          ? "BOD không duyệt sau Done mới nhất"
          : !at
            ? "BOD không duyệt nhưng thiếu Ngày BOD Duyệt"
            : !approvedAt
              ? "Thiếu ngày Done mới nhất"
              : "Mốc BOD không nằm sau Done mới nhất; chưa xác định thứ tự duyệt và trả",
      });
    }
    const issues = [...new Set(events.filter((event) => !event.counted).map((event) => event.reason))];
    if (!approvedAt) issues.unshift("Thiếu ngày Done mới nhất; chưa xếp được kỳ duyệt");
    rows.push({ task, approvedAt, events, ignoredFeedback, issues });
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

export function calculateReviewerReturns(data: DashboardData, window: DateWindow) {
  const all = getReviewerReturns(data);
  const rows = all.rows.filter((row) => row.approvedAt && inWindow(row.approvedAt, window));
  const returnedRows = rows.filter((row) => row.events.some((event) => event.counted));
  const rejectRows = rows.filter((row) => row.events.some((event) => event.kind === "reject" && event.counted));
  const bodRows = rows.filter((row) => row.events.some((event) => event.kind === "bod" && event.counted));
  const uncertainRows = rows.filter((row) => row.issues.length);
  const ignoredRows = rows.filter((row) => row.ignoredFeedback.length);
  return {
    available: all.available,
    rows,
    returnedRows,
    rejectRows,
    bodRows,
    uncertainRows,
    ignoredRows,
    approvedTasks: rows.length,
    returnedTasks: returnedRows.length,
    rejectTasks: rejectRows.length,
    bodTasks: bodRows.length,
    // Lịch sử phản hồi và trạng thái BOD có thể cùng chỉ một lần trả.
    // Chỉ đếm sự kiện của lịch sử, không cộng thêm snapshot BOD vào số lần.
    rejectEvents: rows.reduce((sum, row) => sum + row.events.filter((event) => event.kind === "reject" && event.counted).length, 0),
    uncertainTasks: uncertainRows.length,
    ignoredEvents: rows.reduce((sum, row) => sum + row.ignoredFeedback.length, 0),
    returnRate: rows.length ? (returnedRows.length / rows.length) * 100 : null,
  };
}
