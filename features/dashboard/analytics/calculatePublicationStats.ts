import { startOfDay } from "@/shared/date/dateUtils";
import type { DateWindow, PostingNorm, PublicationPost, Task } from "../model/types";
import { inWindow, isFinalPublicationTask, isGraphicPublication, isNoSocialPublicationTask, isPendingCancelTask, isVideoPublication, normalize, normalizedKey, publicationReadyDate } from "../model/taskUtils";
import type { PublicationSource, PublicationPlatformRow, ClassifiedPublication } from "./publication/types";
import { publicationBelongsToPlatform, isMediaResponseExcludedPlatform } from "./publication/platforms";
import { calculatePostingNormPerformance } from "./publication/normPerformance";
import { OLD_ASSET_CUTOFF, calculatePublicationSupplyPerformance } from "./publication/supplyPerformance";
import { calculateMediaPostingResponsePerformance } from "./publication/mediaResponse";
import { calculatePublicationDailyRows } from "./publication/daily";

// API công khai giữ nguyên đường import cũ; phần cài đặt nằm trong publication/.
export type {
  ClassifiedPublication,
  MediaPostingResponseItem,
  MediaPostingResponsePerformance,
  PublicationDailyRow,
  PublicationNormPerformance,
  PublicationPlatformRow,
  PublicationSource,
} from "./publication/types";
export {
  publicationBelongsToPlatform,
  taskPlatformNames,
} from "./publication/platforms";
export {
  calculatePostingNormDailyTarget,
  calculatePublicationDailyRows,
} from "./publication/daily";


function classifyPublicationSource(
  post: PublicationPost,
  taskByCode: Map<string, Task>,
): PublicationSource {
  const bookTaskCode = normalize(post.bookTaskCode);
  if (!bookTaskCode) return "reup";
  const task = taskByCode.get(bookTaskCode);
  if (!task) return "unknown";
  if (isVideoPublication(task)) return "video";
  if (isGraphicPublication(task)) return "graphic";
  return "unknown";
}

function publicationIssueReason(
  post: PublicationPost,
  taskByCode: Map<string, Task>,
) {
  const bookTaskCode = normalize(post.bookTaskCode);
  const task = taskByCode.get(bookTaskCode);
  if (!task) return "Không tìm thấy Book Task trong Tasklist";
  if (!normalize(task.formatType)) {
    return "Format Type của task đang trống";
  }
  const formatType = normalizedKey(task.formatType);
  if (formatType.includes("video") || formatType.includes("xào source")) {
    return `Task Video/Xào Source nhưng Công đoạn là ${task.stage || "trống"}, không phải Edit`;
  }
  return `Format Type ${task.formatType} nhưng Công đoạn là ${task.stage || "trống"}, không phải Graphic Design`;
}

/**
 * Tập dòng đăng bài dùng cho mọi chỉ số nghiệp vụ: đã loại task Pending/Cancel,
 * loại task Không Đăng Social, và giới hạn theo Ngày Đăng trong bộ lọc.
 */
export function selectEligiblePosts(
  tasks: Task[],
  publications: PublicationPost[],
  dateWindow: DateWindow,
) {
  const pendingCancelTasks = tasks.filter(isPendingCancelTask);
  const pendingCancelTaskCodes = new Set(
    pendingCancelTasks.map((task) => normalizedKey(task.code)),
  );
  const pendingCancelPublicationIds = new Set(
    pendingCancelTasks.flatMap((task) =>
      (task.publicationIds ?? []).map(normalizedKey),
    ),
  );
  const eligibleTasks = tasks.filter((task) => !isPendingCancelTask(task));
  const taskByCode = new Map(
    eligibleTasks.map((task) => [normalize(task.code), task]),
  );
  const noSocialTaskCodes = new Set(
    eligibleTasks
      .filter(isNoSocialPublicationTask)
      .map((task) => normalize(task.code)),
  );
  const postsInWindow = publications.filter(
    (post) =>
      !pendingCancelTaskCodes.has(normalizedKey(post.bookTaskCode)) &&
      !pendingCancelPublicationIds.has(normalizedKey(post.id)) &&
      post.scheduledAt &&
      inWindow(post.scheduledAt, dateWindow),
  );
  return {
    taskByCode,
    postsInWindow,
    posts: postsInWindow.filter(
      (post) => !noSocialTaskCodes.has(normalize(post.bookTaskCode)),
    ),
    noSocialPosts: postsInWindow.filter((post) =>
      noSocialTaskCodes.has(normalize(post.bookTaskCode)),
    ),
  };
}

export function calculatePublicationStats(
  tasks: Task[],
  publications: PublicationPost[],
  dateWindow: DateWindow,
  postingNorms: PostingNorm[] = [],
) {
  const pendingCancelTasks = tasks.filter(isPendingCancelTask);
  const pendingCancelTaskCodes = new Set(
    pendingCancelTasks.map((task) => normalizedKey(task.code)),
  );
  const pendingCancelPublicationIds = new Set(
    pendingCancelTasks.flatMap((task) =>
      (task.publicationIds ?? []).map(normalizedKey),
    ),
  );
  const eligibleBusinessTasks = tasks.filter(
    (task) => !isPendingCancelTask(task),
  );
  const eligiblePublications = publications.filter(
    (post) =>
      !pendingCancelTaskCodes.has(normalizedKey(post.bookTaskCode)) &&
      !pendingCancelPublicationIds.has(normalizedKey(post.id)),
  );
  const taskByCode = new Map(
    eligibleBusinessTasks.map((task) => [normalize(task.code), task]),
  );
  const noSocialTaskCodes = new Set(
    eligibleBusinessTasks
      .filter(isNoSocialPublicationTask)
      .map((task) => normalize(task.code)),
  );
  const postsInWindow = eligiblePublications.filter(
    (post) =>
      post.scheduledAt &&
      inWindow(post.scheduledAt, dateWindow),
  );
  const noSocialPosts = postsInWindow.filter((post) =>
    noSocialTaskCodes.has(normalize(post.bookTaskCode)),
  );
  const filteredPosts = postsInWindow.filter(
    (post) =>
      !noSocialTaskCodes.has(normalize(post.bookTaskCode)),
  );
  const classifiedPosts: ClassifiedPublication[] = filteredPosts.map((post) => ({
    post,
    source: classifyPublicationSource(post, taskByCode),
    task: taskByCode.get(normalize(post.bookTaskCode)),
  }));
  const sourceCounts = classifiedPosts.reduce(
    (counts, item) => ({
      ...counts,
      [item.source]: counts[item.source] + 1,
    }),
    { reup: 0, video: 0, graphic: 0, unknown: 0 },
  );

  const platformMap = new Map<string, PublicationPlatformRow>();
  for (const item of classifiedPosts) {
    const baseLabel =
      normalize(item.post.platform) || "Chưa xác định";
    const labels = [
      baseLabel,
      ...(publicationBelongsToPlatform(item.post, "Shopee") &&
      normalizedKey(baseLabel) !== "shopee"
        ? ["Shopee"]
        : []),
    ];
    for (const label of labels) {
      const row = platformMap.get(label) ?? {
        label,
        total: 0,
        reup: 0,
        video: 0,
        graphic: 0,
        unknown: 0,
      };
      row.total += 1;
      row[item.source] += 1;
      platformMap.set(label, row);
    }
  }

  const eligibleTasks = eligibleBusinessTasks.filter(
    (task) =>
      isFinalPublicationTask(task) &&
      !isNoSocialPublicationTask(task),
  );
  const scheduledTasks = eligibleTasks.filter(
    (task) => Boolean(task.publicationIds?.length),
  );
  const unscheduledTasks = eligibleTasks.filter(
    (task) => !(task.publicationIds?.length),
  );
  const recentUnscheduledTasks = unscheduledTasks.filter(
    (task) =>
      Boolean(
        task.startDate &&
        startOfDay(task.startDate) >= OLD_ASSET_CUTOFF,
      ),
  );
  const oldAssets = unscheduledTasks.filter((task) => {
    const readyAt = publicationReadyDate(task);
    return Boolean(readyAt && readyAt < OLD_ASSET_CUTOFF);
  });
  const recentUnscheduledSet = new Set(recentUnscheduledTasks);
  const oldAssetSet = new Set(oldAssets);
  const transitionUnscheduledTasks = unscheduledTasks.filter(
    (task) => {
      if (oldAssetSet.has(task) || recentUnscheduledSet.has(task)) {
        return false;
      }
      const readyAt = publicationReadyDate(task);
      return Boolean(readyAt && readyAt >= OLD_ASSET_CUTOFF);
    },
  );
  const transitionUnscheduledSet = new Set(
    transitionUnscheduledTasks,
  );
  const undatedUnscheduledTasks = unscheduledTasks.filter(
    (task) =>
      !oldAssetSet.has(task) &&
      !recentUnscheduledSet.has(task) &&
      !transitionUnscheduledSet.has(task),
  );
  const postsByTaskCode = new Map<string, PublicationPost[]>();
  const postById = new Map(
    eligiblePublications.map((post) => [normalize(post.id), post]),
  );
  for (const post of eligiblePublications) {
    const taskCode = normalize(post.bookTaskCode);
    if (!taskCode) continue;
    const linkedPosts = postsByTaskCode.get(taskCode) ?? [];
    linkedPosts.push(post);
    postsByTaskCode.set(taskCode, linkedPosts);
  }
  const scheduledPostedTasks = scheduledTasks.filter((task) => {
    const linkedByBookTask =
      postsByTaskCode.get(normalize(task.code)) ?? [];
    const linkedByPublicationId = (task.publicationIds ?? [])
      .map((id) => postById.get(normalize(id)))
      .filter((post): post is PublicationPost => Boolean(post));
    return [...linkedByBookTask, ...linkedByPublicationId].some(
      (post) => post.posted,
    );
  });
  const scheduledPostedCodes = new Set(
    scheduledPostedTasks.map((task) => normalize(task.code)),
  );
  const scheduledUnpostedTasks = scheduledTasks.filter(
    (task) => !scheduledPostedCodes.has(normalize(task.code)),
  );
  const assetStatusTasks = dateWindow.hasFilter
    ? eligibleTasks.filter(
        (task) =>
          task.startDate &&
          inWindow(task.startDate, dateWindow),
      )
    : eligibleTasks;
  const assetScheduledTasks = assetStatusTasks.filter(
    (task) => Boolean(task.publicationIds?.length),
  );
  const assetUnscheduledTasks = assetStatusTasks.filter(
    (task) => !(task.publicationIds?.length),
  );
  const assetScheduledPostedTasks = assetScheduledTasks.filter(
    (task) => scheduledPostedCodes.has(normalize(task.code)),
  );
  const assetScheduledUnpostedTasks = assetScheduledTasks.filter(
    (task) => !scheduledPostedCodes.has(normalize(task.code)),
  );
  const mediaTaskCodes = new Set(
    classifiedPosts
      .filter(
        (item) =>
          item.source === "video" || item.source === "graphic",
      )
      .map((item) => normalize(item.post.bookTaskCode))
      .filter(Boolean),
  );
  const postedMediaEvidence = classifiedPosts.filter(
    (item) =>
      item.post.posted &&
      (item.source === "video" || item.source === "graphic"),
  );
  const postedMediaTaskCodes = new Set(
    postedMediaEvidence
      .map((item) => normalizedKey(item.post.bookTaskCode))
      .filter(Boolean),
  );
  const unknownPostDetails = classifiedPosts
    .filter((item) => item.source === "unknown")
    .map((item) => ({
      post: item.post,
      task: taskByCode.get(normalize(item.post.bookTaskCode)),
      reason: publicationIssueReason(item.post, taskByCode),
    }));
  const noSocialPostDetails = noSocialPosts.map((post) => ({
    post,
    task: taskByCode.get(normalize(post.bookTaskCode)),
    reason:
      "Book Task liên kết tới task có Nền Tảng = Không Đăng Social",
  }));
  const normPerformance = calculatePostingNormPerformance(
    filteredPosts.filter(
      (post) => normalizedKey(post.platform) !== "không đăng social",
    ),
    postingNorms,
    dateWindow,
  );
  const mediaResponsePosts = filteredPosts.filter(
    (post) => !isMediaResponseExcludedPlatform(post.platform),
  );
  const mediaResponseNormPerformance = calculatePostingNormPerformance(
    mediaResponsePosts,
    postingNorms.filter(
      (norm) => !isMediaResponseExcludedPlatform(norm.platform),
    ),
    dateWindow,
  );
  const mediaPostingResponse =
    calculateMediaPostingResponsePerformance(
      eligibleBusinessTasks,
      mediaResponsePosts,
      mediaResponseNormPerformance,
    );
  const supplyPerformance = calculatePublicationSupplyPerformance(
    eligibleBusinessTasks,
    eligiblePublications,
    classifiedPosts,
    normPerformance,
  );

  return {
    total: filteredPosts.length,
    posted: filteredPosts.filter((post) => post.posted).length,
    reup: sourceCounts.reup,
    media: sourceCounts.video + sourceCounts.graphic,
    video: sourceCounts.video,
    graphic: sourceCounts.graphic,
    unknown: sourceCounts.unknown,
    uniqueMediaTasks: mediaTaskCodes.size,
    postedMedia: postedMediaEvidence.length,
    postedVideo: postedMediaEvidence.filter(
      (item) => item.source === "video",
    ).length,
    postedGraphic: postedMediaEvidence.filter(
      (item) => item.source === "graphic",
    ).length,
    uniquePostedMediaTasks: postedMediaTaskCodes.size,
    postedMediaEvidence,
    postMix: [
      { label: "Bài reup", value: sourceCounts.reup },
      { label: "Media · Video", value: sourceCounts.video },
      { label: "Media · Hình ảnh", value: sourceCounts.graphic },
      ...(sourceCounts.unknown
        ? [{ label: "Chưa xác định", value: sourceCounts.unknown }]
        : []),
    ],
    platformRows: Array.from(platformMap.values()).sort(
      (left, right) =>
        right.total - left.total ||
        left.label.localeCompare(right.label, "vi"),
    ),
    classifiedPosts,
    dailyRows: calculatePublicationDailyRows(
      filteredPosts,
      dateWindow,
    ),
    eligibleTasks,
    scheduledTasks,
    unscheduledTasks,
    unscheduledVideoTasks:
      unscheduledTasks.filter(isVideoPublication),
    unscheduledGraphicTasks:
      unscheduledTasks.filter(isGraphicPublication),
    recentUnscheduledTasks,
    recentUnscheduledVideoTasks:
      recentUnscheduledTasks.filter(isVideoPublication),
    recentUnscheduledGraphicTasks:
      recentUnscheduledTasks.filter(isGraphicPublication),
    transitionUnscheduledTasks,
    undatedUnscheduledTasks,
    unscheduledBreakdown: [
      { label: "Ấn phẩm cũ", value: oldAssets.length },
      {
        label: "Bắt đầu từ 01/07",
        value: recentUnscheduledTasks.length,
      },
      {
        label: "Ấn phẩm chuyển tiếp",
        value: transitionUnscheduledTasks.length,
      },
      {
        label: "Chưa đủ mốc ngày",
        value: undatedUnscheduledTasks.length,
      },
    ],
    scheduledPostedTasks,
    scheduledUnpostedTasks,
    assetStatusTasks,
    assetScheduledTasks,
    assetUnscheduledTasks,
    assetScheduledPostedTasks,
    assetScheduledUnpostedTasks,
    assetScheduleMix: [
      { label: "Đã lên lịch", value: assetScheduledTasks.length },
      { label: "Chưa lên lịch", value: assetUnscheduledTasks.length },
    ],
    scheduledPostStatusMix: [
      { label: "Đã đăng", value: assetScheduledPostedTasks.length },
      {
        label: "Chưa đăng",
        value: assetScheduledUnpostedTasks.length,
      },
    ],
    oldAssets,
    unknownPostDetails,
    noSocialPostDetails,
    normPerformance,
    mediaPostingResponse,
    supplyPerformance,
  };
}
