import type { ReviewerReturnEvidence } from "../model/types";
import { formatNumber } from "@/shared/formatting/format";

export function formatReviewerTimestamp(date: Date | null) {
  return date ? new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date) : "—";
}

export function ReviewerReturnEvidenceTable({ rows, rowOffset }: {
  rows: ReviewerReturnEvidence[];
  rowOffset: number;
}) {
  return (
    <table className="detailTable reviewerReturnEvidenceTable">
      <thead>
        <tr>
          <th>STT</th><th>Task</th><th>Người làm</th><th>Người duyệt mới nhất</th>
          <th>Done mới nhất</th><th>Done lần đầu</th><th>Các lần trả</th>
          <th>Lần Reject được tính</th><th>BOD hiện tại</th><th>Trạng thái hiện tại</th>
          <th>Chưa đủ dữ liệu</th><th>Phản hồi bị loại</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.task.code}-${index}`}>
            <td data-label="STT" className="detailRowNumber">{rowOffset + index + 1}</td>
            <td data-label="Task" className="taskIdentity"><strong>{row.task.code}</strong><span>{row.task.title}</span></td>
            <td data-label="Người làm">{row.task.assignee || "—"}</td>
            <td data-label="Người duyệt mới nhất">{row.task.approvalBy || "—"}</td>
            <td data-label="Done mới nhất">{formatReviewerTimestamp(row.approvedAt)}</td>
            <td data-label="Done lần đầu">{formatReviewerTimestamp(row.task.firstCompletedDate ?? null)}</td>
            <td data-label="Các lần trả">
              {row.events.length ? row.events.map((event, eventIndex) => (
                <div className={`reviewerReturnEvent ${event.counted ? "counted" : "uncertain"}`} key={eventIndex}>
                  <strong>{event.kind === "bod" ? "BOD không duyệt" : "Reject"} · {event.by}</strong>
                  <span>{formatReviewerTimestamp(event.at)}</span>
                  {event.error && <span>Lỗi: {event.error}</span>}
                  <small>{event.reason}{event.counted ? " · Được tính" : " · Chưa tính"}</small>
                </div>
              )) : "Chưa ghi nhận lần trả hợp lệ"}
            </td>
            <td data-label="Lần Reject được tính">{formatNumber(row.events.filter((event) => event.kind === "reject" && event.counted).length)}</td>
            <td data-label="BOD hiện tại">{row.task.bodApproval || "—"}</td>
            <td data-label="Trạng thái hiện tại"><span className="statusPill">{row.task.status || "Chưa xác định"}</span></td>
            <td data-label="Chưa đủ dữ liệu">{row.issues.join("; ") || "—"}</td>
            <td data-label="Phản hồi bị loại">
              {row.ignoredFeedback.length ? row.ignoredFeedback.map((feedback, feedbackIndex) => (
                <div className="reviewerReturnEvent" key={feedbackIndex}>
                  <strong>{feedback.rejectedBy || "Thiếu người trả"}</strong>
                  <span>{formatReviewerTimestamp(feedback.at)}</span>
                  <small>Ngoài danh sách 5 người hợp lệ</small>
                </div>
              )) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
