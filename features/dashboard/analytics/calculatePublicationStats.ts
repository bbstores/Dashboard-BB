import {
  dateKey,
  startOfDay,
} from "@/shared/date/dateUtils";
import type {
  DateWindow,
  PublicationPost,
  Task,
} from "../model/types";
import {
  inWindow,
  isFinalPublicationTask,
  isGraphicPublication,
  isVideoPublication,
  normalize,
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

export const OLD_ASSET_CUTOFF = new Date(2026, 6, 1);

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

function dailyRows(
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
) {
  const taskByCode = new Map(
    tasks.map((task) => [normalize(task.code), task]),
  );
  const filteredPosts = publications.filter(
    (post) =>
      post.scheduledAt &&
      inWindow(post.scheduledAt, dateWindow),
  );
  const classifiedPosts = filteredPosts.map((post) => ({
    post,
    source: classifyPublicationSource(post, taskByCode),
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
    const label = normalize(item.post.platform) || "Chưa xác định";
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

  const unscheduledTasks = tasks.filter(
    (task) =>
      isFinalPublicationTask(task) &&
      !(task.publicationIds?.length),
  );
  const oldAssets = unscheduledTasks.filter((task) => {
    const readyAt = publicationReadyDate(task);
    return Boolean(readyAt && readyAt < OLD_ASSET_CUTOFF);
  });

  return {
    total: filteredPosts.length,
    posted: filteredPosts.filter((post) => post.posted).length,
    reup: sourceCounts.reup,
    media: sourceCounts.video + sourceCounts.graphic,
    video: sourceCounts.video,
    graphic: sourceCounts.graphic,
    unknown: sourceCounts.unknown,
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
    dailyRows: dailyRows(filteredPosts, dateWindow),
    unscheduledTasks,
    unscheduledVideoTasks:
      unscheduledTasks.filter(isVideoPublication),
    unscheduledGraphicTasks:
      unscheduledTasks.filter(isGraphicPublication),
    oldAssets,
    unknownPosts: classifiedPosts
      .filter((item) => item.source === "unknown")
      .map((item) => item.post),
  };
}
