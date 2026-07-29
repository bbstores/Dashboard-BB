import type { DetailView, Task } from "../model/types";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
} from "@/shared/formatting/format";
import { normalizedKey } from "../model/taskUtils";

function TaskDetailRow({
  task,
  index,
  detail,
}: {
  task: Task;
  index: number;
  detail: DetailView;
}) {
  const hasBusinessApproval = Boolean(task.businessApprovalDate);
  const milestones = [
    {
      label: "Bắt đầu",
      date: task.receivedStartDate
        ? formatDateTime(task.receivedStartDate)
        : formatDate(task.startDate),
      reached: Boolean(task.receivedStartDate || task.startDate),
    },
    {
      label: "Kiểm duyệt",
      date: formatDateTime(task.inspectionDate),
      reached: Boolean(task.inspectionDate),
    },
    {
      label: "Hoàn thành",
      date: formatDateTime(task.completedDate),
      reached:
        Boolean(task.completedDate) ||
        ["done", "kinh doanh done"].includes(
          normalizedKey(task.status),
        ),
    },
    ...(hasBusinessApproval
      ? [
          {
            label: "Kinh doanh duyệt",
            date: formatDateTime(task.businessApprovalDate),
            reached: true,
          },
        ]
      : []),
  ];
  const reachedIndex = milestones.reduce(
    (last, milestone, milestoneIndex) =>
      milestone.reached ? milestoneIndex : last,
    -1,
  );
  const progress =
    milestones.length > 1 && reachedIndex >= 0
      ? (reachedIndex / (milestones.length - 1)) * 100
      : 0;

  return (
    <tr>
      <td data-label="STT" className="detailRowNumber">
        {index + 1}
      </td>
      <td data-label="Task" className="taskIdentity">
        <strong>{task.code}</strong>
        <span>{task.title || "Chưa có tên task"}</span>
      </td>
      <td data-label="Assignee" className="assigneeCell">
        {task.assignee || "Chưa có assignee"}
      </td>
      <td data-label="Trạng thái">
        <span className="statusPill">
          {task.status || "Chưa xác định"}
        </span>
      </td>
      <td
        data-label="Timeline"
        className={`taskTimeline stages${milestones.length}`}
      >
        <b
          className="taskTimelineTrack"
          aria-hidden="true"
          style={{
            background: `linear-gradient(to right, #174f3d 0 ${progress}%, #d9ddd4 ${progress}% 100%)`,
          }}
        />
        {milestones.map((milestone, milestoneIndex) => (
          <span
            className={milestone.reached ? "reachedMilestone" : ""}
            key={milestone.label}
          >
            <i>{String(milestoneIndex + 1).padStart(2, "0")}</i>
            <small>{milestone.label}</small>
            <strong>{milestone.date}</strong>
          </span>
        ))}
      </td>
      <td data-label="Phút dự kiến" className="minutesCell">
        <strong>{formatNumber(task.expectedMinutes)}</strong>
        <small>phút</small>
      </td>
      {detail.taskMetric && (
        <td
          data-label={detail.taskMetric.label}
          className="calculatedMetricCell"
        >
          <strong>
            {detail.taskMetric.format(
              detail.taskMetric.value(task),
            )}
          </strong>
          {detail.taskMetric.describe && (
            <small>
              {detail.taskMetric.describe(
                detail.taskMetric.value(task),
              )}
            </small>
          )}
        </td>
      )}
    </tr>
  );
}

export function DetailDrawer({
  detail,
  onClose,
}: {
  detail: DetailView;
  onClose: () => void;
}) {
  const count =
    detail.publicationEvidence?.length ??
    detail.costTaskSummaries?.length ??
    detail.costAllocations?.length ??
    detail.feedback?.length ??
    detail.tasks?.length ??
    0;
  const hasRecords = count > 0;
  return (
    <div className="detailOverlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="detailDrawer"
        role="dialog"
        aria-modal="true"
        aria-label={detail.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detailHeader">
          <div>
            <span className="chartKicker">DỮ LIỆU DẪN CHỨNG</span>
            <h2>{detail.title}</h2>
            <p>{detail.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng chi tiết">×</button>
        </header>
        <div className="detailCount">
          <strong>{formatNumber(count)}</strong>
          <span>
            {detail.publicationEvidence
              ? "bài đăng"
              : detail.costTaskSummaries
                ? "task có chi phí"
              : detail.costAllocations
                ? "dòng phân bổ"
              : detail.feedback
                ? "lần phản hồi"
                : "task"}
          </span>
        </div>
        <div className="detailTableWrap">
          {detail.costTaskSummaries ? (
            <table className="detailTable costTaskSummaryTable">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã task</th>
                  <th>Tên task</th>
                  <th>Mã bill phân bổ</th>
                  <th>Tên bill</th>
                  <th>Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {detail.costTaskSummaries.map((row, index) => (
                  <tr key={`${row.task.code}-${index}`}>
                    <td data-label="STT" className="detailRowNumber">
                      {index + 1}
                    </td>
                    <td data-label="Mã task" className="costTaskCode">
                      <strong>{row.task.code || "Chưa có mã"}</strong>
                    </td>
                    <td data-label="Tên task" className="detailTitleCell">
                      {row.task.title || "Chưa có tên task"}
                    </td>
                    <td data-label="Mã bill phân bổ">
                      <div className="costBillList costBillCodes">
                        {row.bills.map((bill) => (
                          <span key={bill.id}>
                            {bill.id || "Chưa có mã bill"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Tên bill">
                      <div className="costBillList costBillNames">
                        {row.bills.map((bill) => (
                          <span key={bill.id}>
                            {bill.title || "Chưa có tên bill"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Tổng tiền" className="costAmountCell">
                      <strong>{formatCurrency(row.totalAmount)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : detail.costAllocations ? (
            <table className="detailTable costAllocationTable">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Phiếu chi</th>
                  <th>Phân loại</th>
                  <th>Đơn vị</th>
                  <th>Task</th>
                  <th>Ngày bắt đầu</th>
                  <th>Thành tiền/đơn vị</th>
                  <th>Số task chia</th>
                  <th>Chi phí task</th>
                </tr>
              </thead>
              <tbody>
                {detail.costAllocations.map((row, index) => (
                  <tr
                    key={`${row.proposalId}-${row.entity}-${row.task.code}-${index}`}
                  >
                    <td data-label="STT" className="detailRowNumber">
                      {index + 1}
                    </td>
                    <td data-label="Phiếu chi" className="taskIdentity">
                      <strong>{row.proposalId}</strong>
                      <span>{row.proposalTitle || "Chưa có mô tả"}</span>
                    </td>
                    <td data-label="Phân loại">{row.classification}</td>
                    <td data-label="Đơn vị">{row.entity}</td>
                    <td data-label="Task" className="taskIdentity">
                      <strong>{row.task.code}</strong>
                      <span>{row.task.title}</span>
                    </td>
                    <td data-label="Ngày bắt đầu">
                      {formatDate(row.task.startDate)}
                    </td>
                    <td data-label="Thành tiền/đơn vị">
                      {formatCurrency(row.unitAmount)}
                    </td>
                    <td data-label="Số task chia">
                      {formatNumber(row.linkedTaskCount)}
                    </td>
                    <td data-label="Chi phí task" className="costAmountCell">
                      <strong>{formatCurrency(row.allocatedAmount)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : detail.publicationEvidence ? (
            <table className="detailTable publicationEvidenceTable">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Bài đăng</th>
                  <th>Ngày đăng</th>
                  <th>Nền tảng</th>
                  <th>Book Task</th>
                  <th>Format / Công đoạn</th>
                  <th>{detail.publicationEvidenceLabel ?? "Lý do"}</th>
                </tr>
              </thead>
              <tbody>
                {detail.publicationEvidence.map(
                  ({ post, task, reason }, index) => (
                    <tr key={`${post.id}-${index}`}>
                      <td data-label="STT" className="detailRowNumber">
                        {index + 1}
                      </td>
                      <td data-label="Bài đăng" className="taskIdentity">
                        <strong>{post.id}</strong>
                        <span>{post.title || "Chưa có tên bài"}</span>
                      </td>
                      <td data-label="Ngày đăng">
                        {formatDate(post.scheduledAt)}
                      </td>
                      <td data-label="Nền tảng">
                        {post.platform || "Chưa xác định"}
                      </td>
                      <td data-label="Book Task" className="taskIdentity">
                        <strong>
                          {post.bookTaskCode || "Không có"}
                        </strong>
                        <span>
                          {task?.title || "Không tìm thấy task liên kết"}
                        </span>
                      </td>
                      <td data-label="Format / Công đoạn">
                        <strong>{task?.formatType || "Trống"}</strong>
                        <br />
                        <small>{task?.stage || "Trống"}</small>
                      </td>
                      <td
                        data-label={
                          detail.publicationEvidenceLabel ?? "Lý do"
                        }
                        className="publicationIssueReason"
                      >
                        {reason}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          ) : detail.feedback ? (
            <table className="detailTable feedbackDetailTable">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Task</th>
                  <th>Tên task</th>
                  <th>Người làm</th>
                  <th>Thời điểm</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {detail.feedback.map((item, index) => (
                  <tr key={`${item.taskCode}-${item.at?.getTime() ?? "none"}-${index}`}>
                    <td data-label="STT" className="detailRowNumber">
                      {index + 1}
                    </td>
                    <td data-label="Task"><strong>{item.taskCode}</strong></td>
                    <td data-label="Tên task" className="detailTitleCell">
                      {item.task?.title || "—"}
                    </td>
                    <td data-label="Người làm">{item.assignee || item.task?.assignee || "—"}</td>
                    <td data-label="Thời điểm">{formatDateTime(item.at)}</td>
                    <td data-label="Trạng thái">
                      <span className="statusPill">
                        {item.task?.status || "Chưa xác định"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="detailTable taskDetailTable">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Trạng thái</th>
                  <th>Timeline công việc</th>
                  <th>Phút dự kiến</th>
                  {detail.taskMetric && <th>{detail.taskMetric.label}</th>}
                </tr>
              </thead>
              <tbody>
                {(detail.tasks ?? []).map((task, index) => (
                  <TaskDetailRow
                    detail={detail}
                    index={index}
                    key={`${task.code}-${index}`}
                    task={task}
                  />
                ))}
              </tbody>
            </table>
          )}
          {!hasRecords && (
            <p className="detailEmpty">Không có bản ghi phù hợp.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
