import type { DetailView, Task } from "../model/types";
import { formatNumber, formatDate, formatDateTime } from "@/shared/formatting/format";
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
      date: formatDate(task.startDate),
      reached: Boolean(task.startDate),
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
  const count = detail.feedback?.length ?? detail.tasks?.length ?? 0;
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
          <span>{detail.feedback ? "lần phản hồi" : "task"}</span>
        </div>
        <div className="detailTableWrap">
          {detail.feedback ? (
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
