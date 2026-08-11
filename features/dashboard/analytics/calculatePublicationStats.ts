import {
  dateKey,
  startOfDay,
} from "@/shared/date/dateUtils";
import type {
  DateWindow,
  PostingNorm,
  PublicationPost,
  Task,
} from "../model/types";
import {
  inWindow,
  isFinalPublicationTask,
  isGraphicPublication,
  isNoSocialPublicationTask,
  isVideoPublication,
  normalize,
  normalizedKey,
  publicationReadyDate,
} from "../model/taskUtils";

export type PublicationSource =
  | "reup"
  | "video"
  | "graphic"
  | "unknown";

export type PublicationDailyRow = {
  date: Date;
  total: number;
  posted: number;
};

export type PublicationPlatformRow = {
  label: string;
  total: number;
  reup: number;
  video: number;
  graphic: number;
  unknown: number;
};

export type ClassifiedPublication = {
  post: PublicationPost;
  source: PublicationSource;
  task?: Task;
};

export type PublicationNormRow = {
  platform: string;
  target: number | null;
  unit: string;
  note: string;
  expected: number | null;
  scheduled: number;
  posted: number;
  gap: number | null;
  attainment: number | null;
  status: "met" | "near" | "below" | "flexible";
  posts: PublicationPost[];
};

export type PublicationNormPerformance = {
  rows: PublicationNormRow[];
  days: number;
  from: Date | null;
  to: Date | null;
  expectedTotal: number;
  scheduledTotal: number;
  postedTotal: number;
  attainment: number;
  fixedChannelCount: number;
  flexibleChannelCount: number;
  unmappedPlatforms: Array<{
    platform: string;
    posts: PublicationPost[];
  }>;
};

export function publicationBelongsToPlatform(
  post: PublicationPost,
  platform: string,
) {
  const postPlatform = normalizedKey(post.platform);
  const targetPlatform = normalizedKey(platform);
  if (targetPlatform === "shopee") {
    return (
      postPlatform === "shopee" ||
      (postPlatform.includes("tiktok") &&
        Boolean(post.shopeeSelected))
    );
  }
  return postPlatform === targetPlatform;
}

export const OLD_ASSET_CUTOFF = new Date(2026, 6, 1);

function publicationNormRange(
  posts: PublicationPost[],
  dateWindow: DateWindow,
) {
  const dates = posts
    .map((post) => post.scheduledAt)
    .filter((date): date is Date => Boolean(date));
  const from = dateWindow.from
    ? startOfDay(dateWindow.from)
    : dates.length
      ? startOfDay(
          new Date(Math.min(...dates.map((date) => date.getTime()))),
        )
      : null;
  const to = dateWindow.to
    ? startOfDay(dateWindow.to)
    : dates.length
      ? startOfDay(
          new Date(Math.max(...dates.map((date) => date.getTime()))),
        )
      : null;
  if (!from || !to || from > to) {
    return { from: null, to: null, days: 0 };
  }
  let days = 0;
  for (
    let cursor = from;
    cursor <= to;
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    )
  ) {
    days += 1;
  }
  return { from, to, days };
}

export function calculatePostingNormPerformance(
  posts: PublicationPost[],
  norms: PostingNorm[],
  dateWindow: DateWindow,
): PublicationNormPerformance {
  const range = publicationNormRange(posts, dateWindow);
  const postsByPlatform = new Map<string, PublicationPost[]>();
  for (const post of posts) {
    const key = normalizedKey(post.platform) || "chưa xác định";
    postsByPlatform.set(key, [...(postsByPlatform.get(key) ?? []), post]);
  }
  const normKeys = new Set(norms.map((norm) => normalizedKey(norm.platform)));
  const rows = norms.map((norm): PublicationNormRow => {
    const platformPosts = posts.filter((post) =>
      publicationBelongsToPlatform(post, norm.platform),
    );
    const expected =
      norm.target === null || range.days <= 0
        ? null
        : norm.target *
          (normalizedKey(norm.unit).includes("tuần")
            ? range.days / 7
            : range.days);
    const posted = platformPosts.filter((post) => post.posted).length;
    const attainment = expected && expected > 0
      ? (posted / expected) * 100
      : null;
    return {
      platform: norm.platform,
      target: norm.target,
      unit: norm.unit,
      note: norm.note,
      expected,
      scheduled: platformPosts.length,
      posted,
      gap: expected === null ? null : posted - expected,
      attainment,
      status:
        expected === null
          ? "flexible"
          : posted >= expected
            ? "met"
            : posted >= expected * 0.8
              ? "near"
              : "below",
      posts: platformPosts,
    };
  });
  const fixedRows = rows.filter(
    (row): row is PublicationNormRow & { expected: number } =>
      row.expected !== null,
  );
  const expectedTotal = fixedRows.reduce(
    (sum, row) => sum + row.expected,
    0,
  );
  const postedTotal = fixedRows.reduce(
    (sum, row) => sum + row.posted,
    0,
  );
  return {
    rows,
    ...range,
    expectedTotal,
    scheduledTotal: fixedRows.reduce(
      (sum, row) => sum + row.scheduled,
      0,
    ),
    postedTotal,
    attainment: expectedTotal
      ? (postedTotal / expectedTotal) * 100
      : 0,
    fixedChannelCount: fixedRows.length,
    flexibleChannelCount: rows.length - fixedRows.length,
    unmappedPlatforms: Array.from(postsByPlatform.entries())
      .filter(([key]) => !normKeys.has(key))
      .map(([platformKey, platformPosts]) => ({
        platform:
          normalize(platformPosts[0]?.platform) || platformKey,
        posts: platformPosts,
      })),
  };
}

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
  if (normalize(task.formatType).toLocaleLowerCase("vi").includes("video")) {
    return `Task Video nhưng Công đoạn là ${task.stage || "trống"}, không phải Edit`;
  }
  return `Format Type ${task.formatType} nhưng Công đoạn là ${task.stage || "trống"}, không phải Graphic Design`;
}

export function calculatePublicationDailyRows(
  posts: PublicationPost[],
  dateWindow: DateWindow,
) {
  const dates = posts
    .map((post) => post.scheduledAt)
    .filter((date): date is Date => Boolean(date));
  const rangeStart = dateWindow.from
    ? startOfDay(dateWindow.from)
    : dates.length
      ? startOfDay(
          new Date(
            Math.min(...dates.map((date) => date.getTime())),
          ),
        )
      : null;
  const rangeEnd = dateWindow.to
    ? startOfDay(dateWindow.to)
    : dates.length
      ? startOfDay(
          new Date(
            Math.max(...dates.map((date) => date.getTime())),
          ),
        )
      : null;
  if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return [];

  const postsByDay = new Map<
    string,
    { total: number; posted: number }
  >();
  for (const post of posts) {
    if (!post.scheduledAt) continue;
    const key = dateKey(post.scheduledAt);
    const row = postsByDay.get(key) ?? { total: 0, posted: 0 };
    row.total += 1;
    if (post.posted) row.posted += 1;
    postsByDay.set(key, row);
  }

  const rows: PublicationDailyRow[] = [];
  for (
    let cursor = rangeStart;
    cursor <= rangeEnd;
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    )
  ) {
    const date = new Date(cursor);
    const values = postsByDay.get(dateKey(date)) ?? {
      total: 0,
      posted: 0,
    };
    rows.push({ date, ...values });
  }
  return rows;
}

export function calculatePublicationStats(
  tasks: Task[],
  publications: PublicationPost[],
  dateWindow: DateWindow,
  postingNorms: PostingNorm[] = [],
) {
  const taskByCode = new Map(
    tasks.map((task) => [normalize(task.code), task]),
  );
  const noSocialTaskCodes = new Set(
    tasks
      .filter(isNoSocialPublicationTask)
      .map((task) => normalize(task.code)),
  );
  const postsInWindow = publications.filter(
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

  const eligibleTasks = tasks.filter(
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
    publications.map((post) => [normalize(post.id), post]),
  );
  for (const post of publications) {
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

  return {
    total: filteredPosts.length,
    posted: filteredPosts.filter((post) => post.posted).length,
    reup: sourceCounts.reup,
    media: sourceCounts.video + sourceCounts.graphic,
    video: sourceCounts.video,
    graphic: sourceCounts.graphic,
    unknown: sourceCounts.unknown,
    uniqueMediaTasks: mediaTaskCodes.size,
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
    normPerformance: calculatePostingNormPerformance(
      filteredPosts.filter(
        (post) => normalizedKey(post.platform) !== "không đăng social",
      ),
      postingNorms,
      dateWindow,
    ),
  };
}
