import {
  formatDate,
  formatNumber,
} from "@/shared/formatting/format";
import type {
  BusinessComparisonPoint,
  MediaComparisonPoint,
} from "./calculateReportComparison";
import {
  getBusinessComparisonStats,
  getMediaComparisonContext,
} from "./calculateReportComparison";
import {
  normalize,
  normalizedKey,
} from "../model/taskUtils";
import {
  evaluateOverall,
  handoffLateMinutes,
} from "../model/slaUtils";
import type {
  ClassifiedPublication,
} from "./calculatePublicationStats";
import type {
  DashboardData,
  DetailView,
  SavedReport,
  Task,
} from "../model/types";

export type ComparisonEvidenceSelection = {
  chartTitle: string;
  formattedValue: string;
  key: string;
  point: MediaComparisonPoint | BusinessComparisonPoint;
  seriesLabel: string;
  value: number;
};

function uniqueTasks(tasks: Array<Task | undefined>) {
  const seen = new Set<Task>();
  return tasks.filter((task): task is Task => {
    if (!task || seen.has(task)) return false;
    seen.add(task);
    return true;
  });
}

function baseDetail(
  selection: ComparisonEvidenceSelection,
  extra: string,
): Pick<DetailView, "title" | "subtitle"> {
  return {
    title: `${selection.chartTitle} · ${selection.seriesLabel}`,
    subtitle: `${selection.point.name} (${formatDate(selection.point.from)}–${formatDate(selection.point.to)}) · Giá trị điểm: ${selection.formattedValue}${extra ? ` · ${extra}` : ""}`,
  };
}

function taskDetail(
  selection: ComparisonEvidenceSelection,
  tasks: Task[],
  extra = "",
): DetailView {
  return {
    ...baseDetail(selection, extra),
    tasks: uniqueTasks(tasks),
  };
}

function publicationDetail(
  selection: ComparisonEvidenceSelection,
  rows: ClassifiedPublication[],
  reason: (row: ClassifiedPublication) => string,
  extra = "",
): DetailView {
  return {
    ...baseDetail(selection, extra),
    publicationEvidence: rows.map((row) => ({
      post: row.post,
      task: row.task,
      reason: reason(row),
    })),
    publicationEvidenceLabel: "Nhóm dữ liệu",
  };
}

function mediaDetail(
  data: DashboardData,
  report: SavedReport,
  selection: ComparisonEvidenceSelection,
): DetailView {
  const point = selection.point as MediaComparisonPoint;
  const dateWindow = {
    from: point.from,
    to: point.to,
    hasFilter: true,
  };
  const stats = getMediaComparisonContext(data, report, dateWindow);

  if (selection.key.startsWith("assignee:")) {
    const name = selection.key.slice("assignee:".length);
    const row = stats.leaderboard.find((item) => item.label === name);
    return {
      ...taskDetail(
        selection,
        row?.tasks ?? [],
        "Mỗi task nhiều người được cộng đủ phút cho từng assignee",
      ),
      taskMetric: {
        label: "Phút dự kiến",
        value: (task) => task.expectedMinutes,
        format: (value) => `${formatNumber(value)} phút`,
      },
    };
  }

  switch (selection.key) {
    case "started":
      return taskDetail(
        selection,
        stats.startedInWindow.map((row) => row.task),
        "Ngày Bắt Đầu nằm trong kỳ",
      );
    case "inspectionCarry":
      return taskDetail(
        selection,
        stats.inspectionCarryIntoWindow.map((row) => row.task),
        "Bắt đầu ngoài kỳ, Ngày Kiểm Duyệt nằm trong kỳ",
      );
    case "completionCarry":
      return taskDetail(
        selection,
        stats.completionCarryIntoWindow.map((row) => row.task),
        "Bắt đầu ngoài kỳ, Ngày Hoàn Thành nằm trong kỳ",
      );
    case "backlog":
      return taskDetail(
        selection,
        stats.backlogTasks,
        `Tồn tại mốc cuối kỳ ${formatDate(point.to)}`,
      );
    case "backlogOverSevenDays":
      return taskDetail(
        selection,
        stats.sla.openAgingRows
          .filter((row) => row.days > 7)
          .map((row) => row.task),
        "Task tồn có tuổi lớn hơn 7 ngày tại cuối kỳ",
      );
    case "totalMinutes":
      return {
        ...taskDetail(
          selection,
          stats.leaderboard.flatMap((row) => row.tasks),
          "Task nhiều assignee chỉ hiện một dòng nhưng phút được cộng cho từng người",
        ),
        taskMetric: {
          label: "Phút dự kiến",
          value: (task) => task.expectedMinutes,
          format: (value) => `${formatNumber(value)} phút`,
        },
      };
    case "feedback":
      return {
        ...baseDetail(selection, "Các lần phản hồi phát sinh trong kỳ"),
        feedback: stats.selectedFeedback.map((item) => ({
          ...item,
          task:
            stats.taskByCode.get(normalizedKey(item.taskCode)) ??
            data.tasks.find(
              (task) =>
                normalizedKey(task.code) ===
                normalizedKey(item.taskCode),
            ),
        })),
      };
    case "handoffOnTimeRate": {
      const eligible = stats.sla.handedForKpi;
      const onTime = stats.sla.onTimeHandoffs.length;
      return taskDetail(
        selection,
        eligible.map((row) => row.task),
        `${formatNumber(onTime)}/${formatNumber(eligible.length)} task bàn giao đúng hạn`,
      );
    }
    case "overallOnTimeRate": {
      const eligible = stats.selectedTasks
        .map((task) => ({
          task,
          evaluation: evaluateOverall(task, point.to),
        }))
        .filter((row) =>
          ["onTime", "late"].includes(row.evaluation.code),
        );
      const onTime = eligible.filter(
        (row) => row.evaluation.code === "onTime",
      ).length;
      return taskDetail(
        selection,
        eligible.map((row) => row.task),
        `${formatNumber(onTime)}/${formatNumber(eligible.length)} task hoàn thành đúng hạn`,
      );
    }
    case "overdue":
      return taskDetail(
        selection,
        stats.sla.overdueHandoffs.map((row) => row.task),
        "Task quá hạn bàn giao tại cuối kỳ",
      );
    case "handoffLateP50": {
      const rows = stats.sla.lateHandoffs;
      return {
        ...taskDetail(
          selection,
          rows.map((row) => row.task),
          `${formatNumber(rows.length)} task bàn giao trễ trong mẫu`,
        ),
        taskMetric: {
          label: "Phút trễ",
          value: handoffLateMinutes,
          format: (value) => `${formatNumber(value)} phút`,
        },
      };
    }
    case "checkingP50":
    case "checkingP90": {
      const rows = stats.sla.checkingToDoneRows;
      const minuteByTask = new Map(
        rows.map((row) => [row.task, row.minutes]),
      );
      return {
        ...taskDetail(
          selection,
          rows.map((row) => row.task),
          `${formatNumber(rows.length)} task có đủ Ngày Kiểm Duyệt và Ngày Hoàn Thành`,
        ),
        taskMetric: {
          label: "Thời gian Checking",
          value: (task) => minuteByTask.get(task) ?? 0,
          format: (value) => `${formatNumber(value)} phút`,
        },
      };
    }
    case "video":
      return taskDetail(
        selection,
        stats.videoTasks,
        "Format Type chứa Video và Công đoạn Edit",
      );
    case "graphic":
      return taskDetail(
        selection,
        stats.graphicTasks,
        "Không phải Video và Công đoạn Graphic Design",
      );
    case "cost":
    case "costPerTask":
      return {
        ...baseDetail(
          selection,
          selection.key === "costPerTask"
            ? `${formatNumber(stats.costs.selectedTaskCosts.length)} task nhận chi phí`
            : "Chi phí đã phân bổ cho task có Ngày Bắt Đầu trong kỳ",
        ),
        costTaskSummaries: stats.costs.selectedTaskCosts,
      };
    default:
      return taskDetail(selection, stats.selectedTasks);
  }
}

function businessDetail(
  data: DashboardData,
  report: SavedReport,
  selection: ComparisonEvidenceSelection,
): DetailView {
  const point = selection.point as BusinessComparisonPoint;
  const stats = getBusinessComparisonStats(data, report, {
    from: point.from,
    to: point.to,
    hasFilter: true,
  });
  const sourceRows = (source: ClassifiedPublication["source"]) =>
    stats.classifiedPosts.filter((row) => row.source === source);
  const mediaRows = stats.classifiedPosts.filter(
    (row) => row.source === "video" || row.source === "graphic",
  );

  if (selection.key.startsWith("platform:")) {
    const platform = selection.key.slice("platform:".length);
    return publicationDetail(
      selection,
      stats.classifiedPosts.filter(
        (row) =>
          (normalize(row.post.platform) || "Chưa xác định") ===
          platform,
      ),
      () => `Nền tảng ${platform}`,
    );
  }

  switch (selection.key) {
    case "totalPosts":
      return publicationDetail(
        selection,
        stats.classifiedPosts,
        (row) => (row.post.posted ? "Đã đăng" : "Chưa đăng"),
      );
    case "posted":
      return publicationDetail(
        selection,
        stats.classifiedPosts.filter((row) => row.post.posted),
        () => "Đã đăng",
      );
    case "postedRate":
      return publicationDetail(
        selection,
        stats.classifiedPosts,
        (row) => (row.post.posted ? "Đã đăng" : "Chưa đăng"),
        `${formatNumber(stats.posted)}/${formatNumber(stats.total)} bài đã đăng`,
      );
    case "perDay":
      return publicationDetail(
        selection,
        stats.classifiedPosts,
        () => "Nằm trong tổng bài của kỳ",
        `${formatNumber(stats.total)} bài / ${formatNumber(point.workingDays)} ngày làm việc`,
      );
    case "reup":
      return publicationDetail(
        selection,
        sourceRows("reup"),
        () => "Reup · Book Task trống",
      );
    case "video":
      return publicationDetail(
        selection,
        sourceRows("video"),
        () => "Media · Video",
      );
    case "graphic":
      return publicationDetail(
        selection,
        sourceRows("graphic"),
        () => "Media · Hình ảnh",
      );
    case "unknown":
      return publicationDetail(
        selection,
        sourceRows("unknown"),
        () => "Chưa xác định nguồn bài",
      );
    case "scheduled":
      return taskDetail(
        selection,
        stats.assetScheduledTasks,
        "Task thành phẩm đã có liên kết Đăng Bài",
      );
    case "unscheduled":
      return taskDetail(
        selection,
        stats.assetUnscheduledTasks,
        "Task thành phẩm chưa có liên kết Đăng Bài",
      );
    case "oldAssets":
      return taskDetail(
        selection,
        stats.oldAssets,
        "Ấn phẩm cũ chưa được lên lịch",
      );
    case "uniqueMediaTasks":
      return taskDetail(
        selection,
        uniqueTasks(mediaRows.map((row) => row.task)),
        "Task media gốc duy nhất được dùng trong lịch đăng",
      );
    case "postsPerMediaTask":
      return publicationDetail(
        selection,
        mediaRows,
        (row) => `Bài từ task ${row.post.bookTaskCode || "không xác định"}`,
        `${formatNumber(stats.media)} bài / ${formatNumber(stats.uniqueMediaTasks)} task media gốc`,
      );
    case "dataIssues":
      return {
        ...baseDetail(selection, "Các dòng cần kiểm tra Book Task hoặc Nền Tảng"),
        publicationEvidence: [
          ...stats.unknownPostDetails,
          ...stats.noSocialPostDetails,
        ],
      };
    default:
      return publicationDetail(
        selection,
        stats.classifiedPosts,
        () => "Thuộc kỳ báo cáo",
      );
  }
}

export function buildComparisonDetail(
  data: DashboardData,
  report: SavedReport,
  department: SavedReport["department"],
  selection: ComparisonEvidenceSelection,
): DetailView {
  return department === "media"
    ? mediaDetail(data, report, selection)
    : businessDetail(data, report, selection);
}
