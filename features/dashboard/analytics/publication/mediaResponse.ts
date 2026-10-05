import { endOfDay } from "@/shared/date/dateUtils";
import type { PublicationPost, Task } from "../../model/types";
import { normalize, normalizedKey, publicationSkipsBusinessApproval } from "../../model/taskUtils";
import type { PublicationNormPerformance, MediaPostingResponseItem, MediaPostingResponsePlatformRow, MediaPostingResponsePerformance } from "./types";
import { publicationBelongsToPlatform, comparablePlatformKey } from "./platforms";

export function calculateMediaPostingResponsePerformance(
  tasks: Task[],
  posts: PublicationPost[],
  normPerformance: PublicationNormPerformance,
): MediaPostingResponsePerformance {
  const taskByCode = new Map(
    tasks.map((task) => [normalizedKey(task.code), task]),
  );
  const items = posts
    .filter((post) => Boolean(normalize(post.bookTaskCode)))
    .map((post): MediaPostingResponseItem => {
      const task = taskByCode.get(normalizedKey(post.bookTaskCode));
      if (!task) {
        return {
          post,
          status: "unmatched",
          readyAt: null,
          rule: "business-done",
          reason: "Không tìm thấy Book Task trong Tasklist",
        };
      }

      const usesDoneRule = publicationSkipsBusinessApproval(task);
      const rule = usesDoneRule ? "done" : "business-done";
      const taskStatus = normalizedKey(task.status);
      const acceptedStatuses = usesDoneRule
        ? ["done", "kinh doanh done", "kinh doanh duyệt"]
        : ["kinh doanh done", "kinh doanh duyệt"];
      const statusIsComplete = acceptedStatuses.includes(taskStatus);
      const readyAt = usesDoneRule
        ? task.completedDate ?? task.businessApprovalDate
        : task.businessApprovalDate;
      const ruleLabel = usesDoneRule
        ? "BST/IG · Done"
        : "Kinh doanh Done";

      if (!statusIsComplete) {
        return {
          post,
          task,
          status: "incomplete",
          readyAt,
          rule,
          reason: `${ruleLabel} chưa đạt · trạng thái hiện tại: ${task.status || "trống"}`,
        };
      }
      if (!readyAt) {
        return {
          post,
          task,
          status: "incomplete",
          readyAt: null,
          rule,
          reason: `${ruleLabel} đã đạt nhưng thiếu ngày hoàn tất để đối chiếu`,
        };
      }
      if (post.scheduledAt && readyAt <= endOfDay(post.scheduledAt)) {
        return {
          post,
          task,
          status: "on-time",
          readyAt,
          rule,
          reason: `${ruleLabel} hoàn tất trước hoặc trong ngày đăng`,
        };
      }
      return {
        post,
        task,
        status: "late",
        readyAt,
        rule,
        reason: `${ruleLabel} hoàn tất sau ngày đăng`,
      };
    });

  const itemByPost = new Map(items.map((item) => [item.post, item]));
  const platformMap = new Map<
    string,
    {
      totalPosts: number;
      posts: PublicationPost[];
      items: MediaPostingResponseItem[];
    }
  >();
  for (const post of posts) {
    const baseLabel = normalize(post.platform) || "Chưa xác định";
    const labels = [
      baseLabel,
      ...(publicationBelongsToPlatform(post, "Shopee") &&
      normalizedKey(baseLabel) !== "shopee"
        ? ["Shopee"]
        : []),
    ];
    for (const platform of labels) {
      const row = platformMap.get(platform) ?? {
        totalPosts: 0,
        posts: [],
        items: [],
      };
      row.totalPosts += 1;
      row.posts.push(post);
      const item = itemByPost.get(post);
      if (item) row.items.push(item);
      platformMap.set(platform, row);
    }
  }

  const onTimePosts = items.filter(
    (item) => item.status === "on-time",
  ).length;
  const normRowByPlatform = new Map(
    normPerformance.rows.map((row) => [
      comparablePlatformKey(row.platform),
      row,
    ]),
  );
  for (const normRow of normPerformance.rows) {
    const hasPlatform = Array.from(platformMap.keys()).some(
      (platform) =>
        comparablePlatformKey(platform) ===
        comparablePlatformKey(normRow.platform),
    );
    if (!hasPlatform) {
      platformMap.set(normRow.platform, {
        totalPosts: 0,
        posts: [],
        items: [],
      });
    }
  }
  const platformRows = Array.from(platformMap.entries())
    .map(([platform, row]): MediaPostingResponsePlatformRow => {
      const mediaPosts = row.items.length;
      const platformOnTimePosts = row.items.filter(
        (item) => item.status === "on-time",
      ).length;
      const normRow = normRowByPlatform.get(
        comparablePlatformKey(platform),
      );
      return {
        platform,
        target: normRow?.target ?? null,
        unit: normRow?.unit ?? "",
        note: normRow?.note ?? "Chưa có định mức",
        expectedPosts: normRow?.expected ?? null,
        totalPosts: row.totalPosts,
        postedPosts: row.posts.filter((post) => post.posted).length,
        postingAttainment: normRow?.attainment ?? null,
        mediaPosts,
        onTimePosts: platformOnTimePosts,
        mediaShare: row.totalPosts
          ? (mediaPosts / row.totalPosts) * 100
          : 0,
        responseRate: mediaPosts
          ? (platformOnTimePosts / mediaPosts) * 100
          : 0,
        posts: row.posts,
        items: row.items,
      };
    })
    .sort(
      (left, right) =>
        right.totalPosts - left.totalPosts ||
        left.platform.localeCompare(right.platform, "vi"),
    );

  return {
    days: normPerformance.days,
    from: normPerformance.from,
    to: normPerformance.to,
    expectedPosts: normPerformance.expectedTotal,
    totalPosts: posts.length,
    postedPosts: normPerformance.postedTotal,
    postingAttainment: normPerformance.attainment,
    fixedChannelCount: normPerformance.fixedChannelCount,
    flexibleChannelCount: normPerformance.flexibleChannelCount,
    unmappedPlatformCount: normPerformance.unmappedPlatforms.length,
    mediaPosts: items.length,
    onTimePosts,
    latePosts: items.filter((item) => item.status === "late").length,
    incompletePosts: items.filter(
      (item) => item.status === "incomplete",
    ).length,
    unmatchedPosts: items.filter(
      (item) => item.status === "unmatched",
    ).length,
    mediaShare: posts.length ? (items.length / posts.length) * 100 : 0,
    responseRate: items.length ? (onTimePosts / items.length) * 100 : 0,
    items,
    platformRows,
  };
}
