import { useMemo, useState } from "react";
import type { DetailView, Task } from "../model/types";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
} from "@/shared/formatting/format";
import { normalizedKey } from "../model/taskUtils";

type FeedbackEvidence = NonNullable<DetailView["feedback"]>[number];
type PublicationEvidence = NonNullable<
  DetailView["publicationEvidence"]
>[number];
type CostAllocationEvidence = NonNullable<
  DetailView["costAllocations"]
>[number];
type CostTaskSummaryEvidence = NonNullable<
  DetailView["costTaskSummaries"]
>[number];

type DetailRecord =
  | { kind: "task"; value: Task }
  | { kind: "feedback"; value: FeedbackEvidence }
  | { kind: "publication"; value: PublicationEvidence }
  | { kind: "costAllocation"; value: CostAllocationEvidence }
  | { kind: "costTaskSummary"; value: CostTaskSummaryEvidence };

type DetailColumn = {
  key: string;
  label: string;
  value: (record: DetailRecord) => string | number;
  search?: (record: DetailRecord) => string;
};

const detailCollator = new Intl.Collator("vi", {
  numeric: true,
  sensitivity: "base",
});

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("vi")
    .trim();
}

function detailRecords(detail: DetailView): DetailRecord[] {
  if (detail.publicationEvidence) {
    return detail.publicationEvidence.map((value) => ({
      kind: "publication",
      value,
    }));
  }
  if (detail.costTaskSummaries) {
    return detail.costTaskSummaries.map((value) => ({
      kind: "costTaskSummary",
      value,
    }));
  }
  if (detail.costAllocations) {
    return detail.costAllocations.map((value) => ({
      kind: "costAllocation",
      value,
    }));
  }
  if (detail.feedback) {
    return detail.feedback.map((value) => ({
      kind: "feedback",
      value,
    }));
  }
  return (detail.tasks ?? []).map((value) => ({
    kind: "task",
    value,
  }));
}

function detailColumns(detail: DetailView): DetailColumn[] {
  if (detail.publicationEvidence) {
    return [
      {
        key: "post",
        label: "Bài đăng",
        value: (record) =>
          record.kind === "publication"
            ? `${record.value.post.id} ${record.value.post.title}`
            : "",
      },
      {
        key: "scheduledAt",
        label: "Ngày đăng",
        value: (record) =>
          record.kind === "publication"
            ? (record.value.post.scheduledAt?.getTime() ?? -1)
            : -1,
        search: (record) =>
          record.kind === "publication"
            ? formatDate(record.value.post.scheduledAt)
            : "",
      },
      {
        key: "platform",
        label: "Nền tảng",
        value: (record) =>
          record.kind === "publication"
            ? record.value.post.platform
            : "",
      },
      {
        key: "bookTask",
        label: "Book Task",
        value: (record) =>
          record.kind === "publication"
            ? `${record.value.post.bookTaskCode ?? ""} ${record.value.task?.title ?? ""}`
            : "",
      },
      {
        key: "formatStage",
        label: "Format / Công đoạn",
        value: (record) =>
          record.kind === "publication"
            ? `${record.value.task?.formatType ?? ""} ${record.value.task?.stage ?? ""}`
            : "",
      },
      {
        key: "reason",
        label: detail.publicationEvidenceLabel ?? "Lý do",
        value: (record) =>
          record.kind === "publication" ? record.value.reason : "",
      },
    ];
  }
  if (detail.costTaskSummaries) {
    return [
      {
        key: "taskCode",
        label: "Mã task",
        value: (record) =>
          record.kind === "costTaskSummary"
            ? record.value.task.code
            : "",
      },
      {
        key: "taskTitle",
        label: "Tên task",
        value: (record) =>
          record.kind === "costTaskSummary"
            ? record.value.task.title
            : "",
      },
      {
        key: "billCode",
        label: "Mã bill phân bổ",
        value: (record) =>
          record.kind === "costTaskSummary"
            ? record.value.bills.map((bill) => bill.id).join(" ")
            : "",
      },
      {
        key: "billTitle",
        label: "Tên bill",
        value: (record) =>
          record.kind === "costTaskSummary"
            ? record.value.bills.map((bill) => bill.title).join(" ")
            : "",
      },
      {
        key: "totalAmount",
        label: "Tổng tiền",
        value: (record) =>
          record.kind === "costTaskSummary"
            ? record.value.totalAmount
            : 0,
        search: (record) =>
          record.kind === "costTaskSummary"
            ? `${record.value.totalAmount} ${formatCurrency(record.value.totalAmount)}`
            : "",
      },
    ];
  }
  if (detail.costAllocations) {
    return [
      {
        key: "proposal",
        label: "Phiếu chi",
        value: (record) =>
          record.kind === "costAllocation"
            ? `${record.value.proposalId} ${record.value.proposalTitle}`
            : "",
      },
      {
        key: "classification",
        label: "Phân loại",
        value: (record) =>
          record.kind === "costAllocation"
            ? record.value.classification
            : "",
      },
      {
        key: "entity",
        label: "Đơn vị",
        value: (record) =>
          record.kind === "costAllocation" ? record.value.entity : "",
      },
      {
        key: "task",
        label: "Task",
        value: (record) =>
          record.kind === "costAllocation"
            ? `${record.value.task.code} ${record.value.task.title}`
            : "",
      },
      {
        key: "startDate",
        label: "Ngày bắt đầu",
        value: (record) =>
          record.kind === "costAllocation"
            ? (record.value.task.startDate?.getTime() ?? -1)
            : -1,
        search: (record) =>
          record.kind === "costAllocation"
            ? formatDate(record.value.task.startDate)
            : "",
      },
      {
        key: "unitAmount",
        label: "Thành tiền/đơn vị",
        value: (record) =>
          record.kind === "costAllocation"
            ? record.value.unitAmount
            : 0,
        search: (record) =>
          record.kind === "costAllocation"
            ? `${record.value.unitAmount} ${formatCurrency(record.value.unitAmount)}`
            : "",
      },
      {
        key: "linkedTaskCount",
        label: "Số task chia",
        value: (record) =>
          record.kind === "costAllocation"
            ? record.value.linkedTaskCount
            : 0,
      },
      {
        key: "allocatedAmount",
        label: "Chi phí task",
        value: (record) =>
          record.kind === "costAllocation"
            ? record.value.allocatedAmount
            : 0,
        search: (record) =>
          record.kind === "costAllocation"
            ? `${record.value.allocatedAmount} ${formatCurrency(record.value.allocatedAmount)}`
            : "",
      },
    ];
  }
  if (detail.feedback) {
    return [
      {
        key: "taskCode",
        label: "Task",
        value: (record) =>
          record.kind === "feedback" ? record.value.taskCode : "",
      },
      {
        key: "taskTitle",
        label: "Tên task",
        value: (record) =>
          record.kind === "feedback"
            ? (record.value.task?.title ?? "")
            : "",
      },
      {
        key: "assignee",
        label: "Người làm",
        value: (record) =>
          record.kind === "feedback"
            ? record.value.assignee || record.value.task?.assignee || ""
            : "",
      },
      {
        key: "at",
        label: "Thời điểm",
        value: (record) =>
          record.kind === "feedback"
            ? (record.value.at?.getTime() ?? -1)
            : -1,
        search: (record) =>
          record.kind === "feedback"
            ? formatDateTime(record.value.at)
            : "",
      },
      {
        key: "status",
        label: "Trạng thái",
        value: (record) =>
          record.kind === "feedback"
            ? (record.value.task?.status ?? "")
            : "",
      },
    ];
  }

  const taskColumns: DetailColumn[] = [
    {
      key: "task",
      label: "Task",
      value: (record) =>
        record.kind === "task"
          ? `${record.value.code} ${record.value.title}`
          : "",
    },
    {
      key: "assignee",
      label: "Assignee",
      value: (record) =>
        record.kind === "task" ? record.value.assignee : "",
    },
    {
      key: "status",
      label: "Trạng thái",
      value: (record) =>
        record.kind === "task" ? record.value.status : "",
    },
    {
      key: "timeline",
      label: "Timeline công việc",
      value: (record) =>
        record.kind === "task"
          ? (record.value.startDate?.getTime() ?? -1)
          : -1,
      search: (record) =>
        record.kind === "task"
          ? [
              formatDateTime(
                record.value.receivedStartDate ??
                  record.value.startDate,
              ),
              formatDateTime(record.value.inspectionDate),
              formatDateTime(record.value.completedDate),
              formatDateTime(record.value.businessApprovalDate),
            ].join(" ")
          : "",
    },
    {
      key: "minutes",
      label: "Phút dự kiến",
      value: (record) =>
        record.kind === "task" ? record.value.expectedMinutes : 0,
    },
  ];
  if (detail.taskMetric) {
    taskColumns.push({
      key: "metric",
      label: detail.taskMetric.label,
      value: (record) =>
        record.kind === "task"
          ? detail.taskMetric?.value(record.value) ?? 0
          : 0,
      search: (record) =>
        record.kind === "task"
          ? detail.taskMetric?.format(
              detail.taskMetric.value(record.value),
            ) ?? ""
          : "",
    });
  }
  return taskColumns;
}

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
  const [search, setSearch] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    "asc",
  );
  const records = useMemo(() => detailRecords(detail), [detail]);
  const columns = useMemo(() => detailColumns(detail), [detail]);

  const visibleRecords = useMemo(() => {
    const globalNeedle = normalizeSearch(search);
    const columnNeedle = normalizeSearch(filterValue);
    const selectedFilter = columns.find(
      (column) => column.key === filterColumn,
    );
    const selectedSort = columns.find(
      (column) => column.key === sortColumn,
    );
    const matching = records.filter((record) => {
      const matchesGlobal =
        !globalNeedle ||
        columns.some((column) =>
          normalizeSearch(
            column.search?.(record) ?? column.value(record),
          ).includes(globalNeedle),
        );
      const matchesColumn =
        !columnNeedle ||
        !selectedFilter ||
        normalizeSearch(
          selectedFilter.search?.(record) ??
            selectedFilter.value(record),
        ).includes(columnNeedle);
      return matchesGlobal && matchesColumn;
    });
    if (!selectedSort) return matching;
    return matching
      .map((record, index) => ({ record, index }))
      .sort((a, b) => {
        const left = selectedSort.value(a.record);
        const right = selectedSort.value(b.record);
        const comparison =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : detailCollator.compare(String(left), String(right));
        return (
          (sortDirection === "asc" ? comparison : -comparison) ||
          a.index - b.index
        );
      })
      .map(({ record }) => record);
  }, [
    columns,
    filterColumn,
    filterValue,
    records,
    search,
    sortColumn,
    sortDirection,
  ]);

  const count = records.length;
  const visibleCount = visibleRecords.length;
  const hasRecords = visibleCount > 0;
  const isFiltered =
    normalizeSearch(search).length > 0 ||
    (Boolean(filterColumn) && normalizeSearch(filterValue).length > 0);
  const unit = detail.publicationEvidence
    ? "bài đăng"
    : detail.costTaskSummaries
      ? "task có chi phí"
      : detail.costAllocations
        ? "dòng phân bổ"
        : detail.feedback
          ? "lần phản hồi"
          : "task";

  const costTaskSummaryRows = visibleRecords.flatMap((record) =>
    record.kind === "costTaskSummary" ? [record.value] : [],
  );
  const costAllocationRows = visibleRecords.flatMap((record) =>
    record.kind === "costAllocation" ? [record.value] : [],
  );
  const publicationRows = visibleRecords.flatMap((record) =>
    record.kind === "publication" ? [record.value] : [],
  );
  const feedbackRows = visibleRecords.flatMap((record) =>
    record.kind === "feedback" ? [record.value] : [],
  );
  const taskRows = visibleRecords.flatMap((record) =>
    record.kind === "task" ? [record.value] : [],
  );

  const resetTools = () => {
    setSearch("");
    setFilterColumn("");
    setFilterValue("");
    setSortColumn("");
    setSortDirection("asc");
  };

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
          <strong>{formatNumber(visibleCount)}</strong>
          <span>
            {isFiltered
              ? `/ ${formatNumber(count)} ${unit} phù hợp`
              : unit}
          </span>
        </div>
        <div className="detailTools">
          <label className="detailToolField detailSearchField">
            <span>Tìm toàn bảng</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã task, tên, trạng thái..."
              aria-label="Tìm trong bảng dẫn chứng"
            />
          </label>
          <label className="detailToolField">
            <span>Lọc theo cột</span>
            <select
              value={filterColumn}
              onChange={(event) => {
                setFilterColumn(event.target.value);
                setFilterValue("");
              }}
              aria-label="Cột cần lọc"
            >
              <option value="">Chọn cột</option>
              {columns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
          <label className="detailToolField detailColumnFilterField">
            <span>Giá trị cần lọc</span>
            <input
              type="search"
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
              placeholder={
                filterColumn ? "Nhập giá trị cần lọc" : "Chọn cột trước"
              }
              disabled={!filterColumn}
              aria-label="Giá trị lọc theo cột"
            />
          </label>
          <label className="detailToolField">
            <span>Sắp xếp theo</span>
            <select
              value={sortColumn}
              onChange={(event) => setSortColumn(event.target.value)}
              aria-label="Sắp xếp theo cột"
            >
              <option value="">Thứ tự gốc</option>
              {columns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="detailSortDirection"
            disabled={!sortColumn}
            onClick={() =>
              setSortDirection((current) =>
                current === "asc" ? "desc" : "asc",
              )
            }
            aria-label="Đổi hướng sắp xếp"
          >
            {sortDirection === "asc" ? "Tăng dần ↑" : "Giảm dần ↓"}
          </button>
          <button
            type="button"
            className="detailClearFilters"
            onClick={resetTools}
          >
            Đặt lại
          </button>
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
                {costTaskSummaryRows.map((row, index) => (
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
                {costAllocationRows.map((row, index) => (
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
                {publicationRows.map(
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
                {feedbackRows.map((item, index) => (
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
                {taskRows.map((task, index) => (
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
            <p className="detailEmpty">
              {count > 0
                ? "Không có bản ghi khớp với tìm kiếm và bộ lọc."
                : "Không có bản ghi phù hợp."}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
