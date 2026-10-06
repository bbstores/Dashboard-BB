import { REVIEWER_RETURN_SOURCES } from "../analytics/calculateReviewerReturns";
import type { ReviewerReturnEvent, ReviewerReturnEvidence } from "../model/types";
import { formatNumber } from "@/shared/formatting/format";

export function formatReviewerTimestamp(date: Date | null) {
  return date ? new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date) : "—";
}

export function reviewerReturnEventLabel(event: ReviewerReturnEvent) {
  if (event.source === "bod") return event.by;
  if (event.source === "hieu") return `Hiếu tự mở lại sau Done · ${event.by}`;
  const label = REVIEWER_RETURN_SOURCES.find(({ source }) => source === event.source)?.label;
  return `Reject · ${label === event.by ? label : `${label} (${event.by})`}`;
}

export function ReviewerReturnEvidenceTable({ rows, rowOffset }: {
  rows: ReviewerReturnEvidence[];
  rowOffset: number;
}) {
  return (
    <table className="detailTable reviewerReturnEvidenceTable">
      <thead>
        <tr>
          <th>STT</th><th>Task</th><th>Người làm</th><th>Người chuyển Done gần nhất</th>
          <th>Done mới nhất</th><th>Các lần trả</th><th>Số lần cấp sau trả</th>
          <th>BOD hiện tại</th><th>Trạng thái hiện tại</th><th>Phản hồi bị loại</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.task.code}-${index}`}>
            <td data-label="STT" className="detailRowNumber">{rowOffset + index + 1}</td>
            <td data-label="Task" className="taskIdentity"><strong>{row.task.code}</strong><span>{row.task.title}</span></td>
            <td data-label="Người làm">{row.task.assignee || "—"}</td>
            <td data-label="Người chuyển Done gần nhất">{row.task.approvalBy || "—"}</td>
            <td data-label="Done mới nhất">{formatReviewerTimestamp(row.approvedAt)}</td>
            <td data-label="Các lần trả">
              {row.events.length ? row.events.map((event, eventIndex) => (
                <div className={`reviewerReturnEvent ${event.source === "hieu" ? "self" : "counted"}`} key={eventIndex}>
                  <strong>{reviewerReturnEventLabel(event)}</strong>
                  <span>{formatReviewerTimestamp(event.at)}</span>
                  {event.error && <span>Lỗi: {event.error}</span>}
                  <small>{event.source === "hieu" ? "Không cộng vào tổng bị trả" : "Được tính"}</small>
                </div>
              )) : "Chưa ghi nhận lần trả của cấp sau"}
            </td>
            <td data-label="Số lần cấp sau trả">{formatNumber(row.events.filter((event) => event.source !== "hieu").length)}</td>
            <td data-label="BOD hiện tại">{row.task.bodApproval || "—"}</td>
            <td data-label="Trạng thái hiện tại"><span className="statusPill">{row.task.status || "Chưa xác định"}</span></td>
            <td data-label="Phản hồi bị loại">
              {row.ignoredFeedback.length ? row.ignoredFeedback.map((feedback, feedbackIndex) => (
                <div className="reviewerReturnEvent" key={feedbackIndex}>
                  <strong>{feedback.rejectedBy || "Thiếu người trả"}</strong>
                  <span>{formatReviewerTimestamp(feedback.at)}</span>
                  <small>Ngoài luồng duyệt · xem là thao tác nhầm</small>
                </div>
              )) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
