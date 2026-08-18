import {
  dateKey,
  endOfDay,
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
  isPublicationReady,
  isVideoPublication,
  normalize,
  normalizedKey,
  publicationReadyDate,
  publicationSupplyReadyDate,
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

export type MediaSupplySlot = {
  key: string;
  platform: string;
  task: Task;
  source: "opening" | "delivered";
  state: "free" | "planned" | "used";
  posts: PublicationPost[];
};

export type MediaSupplyPlatformRow = {
  platform: string;
  expectedPosts: number;
  suppliedPosts: number;
  coveredPosts: number;
  usedPosts: number;
  unusedPosts: number;
  coveragePercentage: number;
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

export type PublicationSupplyPerformance = {
  days: number;
  expectedPosts: number;
  kpiDailyRate: number;
  openingReadyTasks: Task[];
  openingFreeTasks: Task[];
  openingPlannedUnpostedTasks: Task[];
  openingPlannedPostedTasks: Task[];
  deliveredTasks: Task[];
  availableTasks: Task[];
  supplySlots: MediaSupplySlot[];
  openingSupplySlots: MediaSupplySlot[];
  deliveredSupplySlots: MediaSupplySlot[];
  usedSupplySlots: MediaSupplySlot[];
  unusedSupplySlots: MediaSupplySlot[];
  freeSupplySlots: MediaSupplySlot[];
  plannedSupplySlots: MediaSupplySlot[];
  openingUsedSupplySlots: MediaSupplySlot[];
  deliveredUsedSupplySlots: MediaSupplySlot[];
  platformSupplyRows: MediaSupplyPlatformRow[];
  mediaCoveredPosts: number;
  legacyOldTasks: Task[];
  usedReadyTasks: Task[];
  unusedReadyTasks: Task[];
  readyWithoutDateTasks: Task[];
  postedWithoutReadyTasks: Task[];
  readyMinutes: number;
  deliveredMinutes: number;
  mediaDeliveryRate: number;
  mediaSupplyCoverage: number;
  actualPosts: number;
  mediaPosts: number;
  reupPosts: number;
  unknownPosts: number;
  postingAttainment: number;
  postingShortfall: number;
  businessUnusedGap: number;
  mediaSupplyGap: number;
  excessPosts: number;
  mediaExcessEstimate: number;
  businessExcessEstimate: number;
  unknownExcessEstimate: number;
  mediaPostEvidence: ClassifiedPublication[];
  reupPostEvidence: ClassifiedPublication[];
  unknownPostEvidence: ClassifiedPublication[];
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

function comparablePlatformKey(value: string) {
  return normalizedKey(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

export function taskPlatformNames(task: Task) {
  return Array.from(
    new Map(
      normalize(task.platform)
        .split(/\s*[,;|\n]\s*/)
        .map(normalize)
        .filter(Boolean)
        .filter(
          (platform) =>
            normalizedKey(platform) !== "không đăng social",
        )
        .map((platform) => [comparablePlatformKey(platform), platform]),
    ).values(),
  );
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

function calculatePublicationSupplyPerformance(
  tasks: Task[],
  publications: PublicationPost[],
  classifiedPosts: ClassifiedPublication[],
  normPerformance: PublicationNormPerformance,
): PublicationSupplyPerformance {
  const from = normPerformance.from;
  const to = normPerformance.to ? endOfDay(normPerformance.to) : null;
  const expectedPosts = normPerformance.expectedTotal;
  const fixedRows = normPerformance.rows.filter(
    (
      row,
    ): row is PublicationNormRow & { expected: number } =>
      row.expected !== null,
  );
  const classifiedByPost = new Map(
    classifiedPosts.map((item) => [normalizedKey(item.post.id), item]),
  );
  let mediaPosts = 0;
  let reupPosts = 0;
  let unknownPosts = 0;
  const mediaPostEvidence = new Map<string, ClassifiedPublication>();
  const reupPostEvidence = new Map<string, ClassifiedPublication>();
  const unknownPostEvidence = new Map<string, ClassifiedPublication>();
  const postedMediaTaskCodes = new Set<string>();

  for (const row of fixedRows) {
    for (const post of row.posts) {
      if (!post.posted) continue;
      const item = classifiedByPost.get(normalizedKey(post.id));
      if (!item) continue;
      const evidenceKey = normalizedKey(post.id);
      if (item.source === "video" || item.source === "graphic") {
        mediaPosts += 1;
        mediaPostEvidence.set(evidenceKey, item);
        const taskCode = normalizedKey(item.task?.code);
        if (taskCode) postedMediaTaskCodes.add(taskCode);
      } else if (item.source === "reup") {
        reupPosts += 1;
        reupPostEvidence.set(evidenceKey, item);
      } else {
        unknownPosts += 1;
        unknownPostEvidence.set(evidenceKey, item);
      }
    }
  }

  const finalTasks = tasks.filter(
    (task) =>
      isFinalPublicationTask(task) &&
      !isNoSocialPublicationTask(task),
  );
  const legacyOldTasks = finalTasks.filter(
    (task) =>
      isPublicationReady(task) &&
      Boolean(task.startDate && task.startDate < OLD_ASSET_CUTOFF) &&
      !task.publicationIds?.length,
  );
  const scopedFinalTasks = finalTasks.filter((task) => {
    if (!task.startDate) return false;
    return (
      task.startDate >= OLD_ASSET_CUTOFF ||
      Boolean(task.publicationIds?.length)
    );
  });
  const readyWithoutDateTasks = scopedFinalTasks.filter(
    (task) => isPublicationReady(task) && !publicationSupplyReadyDate(task),
  );
  const readyDatedTasks = scopedFinalTasks.filter(
    (task) => Boolean(publicationSupplyReadyDate(task)),
  );
  const postsByTaskCode = new Map<string, PublicationPost[]>();
  const postById = new Map(
    publications.map((post) => [normalizedKey(post.id), post]),
  );
  for (const post of publications) {
    const taskCode = normalizedKey(post.bookTaskCode);
    if (!taskCode) continue;
    postsByTaskCode.set(taskCode, [
      ...(postsByTaskCode.get(taskCode) ?? []),
      post,
    ]);
  }

  const linkedPostsForTask = (task: Task) => {
    const linkedPosts = new Map<string, PublicationPost>();
    for (const post of postsByTaskCode.get(normalizedKey(task.code)) ?? []) {
      linkedPosts.set(normalizedKey(post.id), post);
    }
    for (const publicationId of task.publicationIds ?? []) {
      const post = postById.get(normalizedKey(publicationId));
      if (post) linkedPosts.set(normalizedKey(post.id), post);
    }
    return Array.from(linkedPosts.values());
  };

  const fixedRowByPlatform = new Map(
    fixedRows.map((row) => [comparablePlatformKey(row.platform), row]),
  );
  const openingCandidateTasks = from
    ? readyDatedTasks.filter((task) => {
        const readyAt = publicationSupplyReadyDate(task);
        return Boolean(readyAt && readyAt < from);
      })
    : [];
  const deliveredCandidateTasks = readyDatedTasks.filter((task) => {
    const readyAt = publicationSupplyReadyDate(task);
    if (!readyAt) return false;
    if (from && readyAt < from) return false;
    if (to && readyAt > to) return false;
    return true;
  });

  const postIsInRange = (post: PublicationPost) =>
    Boolean(
      post.scheduledAt &&
        (!from || post.scheduledAt >= from) &&
        (!to || post.scheduledAt <= to),
    );
  const slotsForTask = (
    task: Task,
    source: MediaSupplySlot["source"],
  ): MediaSupplySlot[] => {
    const linkedPosts = linkedPostsForTask(task);
    const matchedRows = new Map<
      string,
      PublicationNormRow & { expected: number }
    >();
    for (const platform of taskPlatformNames(task)) {
      const key = comparablePlatformKey(platform);
      const row = fixedRowByPlatform.get(key);
      if (row) matchedRows.set(key, row);
    }

    return Array.from(matchedRows.entries()).flatMap(([key, row]) => {
      const platformPosts = linkedPosts.filter((post) =>
        publicationBelongsToPlatform(post, row.platform),
      );
      if (
        source === "opening" &&
        from &&
        platformPosts.some(
          (post) =>
            post.posted &&
            post.scheduledAt &&
            post.scheduledAt < from,
        )
      ) {
        return [];
      }
      const periodPosts = platformPosts.filter(postIsInRange);
      const state: MediaSupplySlot["state"] = periodPosts.some(
        (post) => post.posted,
      )
        ? "used"
        : periodPosts.length
          ? "planned"
          : "free";
      return [
        {
          key: `${normalizedKey(task.code)}::${key}`,
          platform: row.platform,
          task,
          source,
          state,
          posts: periodPosts,
        },
      ];
    });
  };

  const openingSupplySlots = openingCandidateTasks.flatMap((task) =>
    slotsForTask(task, "opening"),
  );
  const deliveredSupplySlots = deliveredCandidateTasks.flatMap((task) =>
    slotsForTask(task, "delivered"),
  );
  const supplySlots = [...openingSupplySlots, ...deliveredSupplySlots];
  const usedSupplySlots = supplySlots.filter(
    (slot) => slot.state === "used",
  );
  const unusedSupplySlots = supplySlots.filter(
    (slot) => slot.state !== "used",
  );
  const freeSupplySlots = supplySlots.filter(
    (slot) => slot.state === "free",
  );
  const plannedSupplySlots = supplySlots.filter(
    (slot) => slot.state === "planned",
  );
  const openingUsedSupplySlots = openingSupplySlots.filter(
    (slot) => slot.state === "used",
  );
  const deliveredUsedSupplySlots = deliveredSupplySlots.filter(
    (slot) => slot.state === "used",
  );
  const tasksFromSlots = (slots: MediaSupplySlot[]) =>
    Array.from(
      new Map(
        slots.map((slot) => [normalizedKey(slot.task.code), slot.task]),
      ).values(),
    );
  const openingReadyTasks = tasksFromSlots(openingSupplySlots);
  const openingPlannedPostedTasks = tasksFromSlots(
    openingUsedSupplySlots,
  );
  const openingUsedTaskCodes = new Set(
    openingPlannedPostedTasks.map((task) => normalizedKey(task.code)),
  );
  const openingUnusedTasks = openingReadyTasks.filter(
    (task) => !openingUsedTaskCodes.has(normalizedKey(task.code)),
  );
  const openingPlannedUnpostedTasks = openingUnusedTasks.filter((task) =>
    openingSupplySlots.some(
      (slot) =>
        normalizedKey(slot.task.code) === normalizedKey(task.code) &&
        slot.state === "planned",
    ),
  );
  const openingPlannedTaskCodes = new Set(
    openingPlannedUnpostedTasks.map((task) => normalizedKey(task.code)),
  );
  const openingFreeTasks = openingUnusedTasks.filter(
    (task) => !openingPlannedTaskCodes.has(normalizedKey(task.code)),
  );
  const deliveredTasks = tasksFromSlots(deliveredSupplySlots);
  const availableTasks = tasksFromSlots(supplySlots);
  const usedReadyTasks = tasksFromSlots(usedSupplySlots);
  const usedReadyTaskCodes = new Set(
    usedReadyTasks.map((task) => normalizedKey(task.code)),
  );
  const unusedReadyTasks = availableTasks.filter(
    (task) => !usedReadyTaskCodes.has(normalizedKey(task.code)),
  );
  const availableTaskCodes = new Set(
    availableTasks.map((task) => normalizedKey(task.code)),
  );
  const postedWithoutReadyTasks = Array.from(postedMediaTaskCodes)
    .filter((code) => !availableTaskCodes.has(code))
    .map((code) =>
      finalTasks.find((task) => normalizedKey(task.code) === code),
    )
    .filter((task): task is Task => Boolean(task));

  const platformSupplyRows: MediaSupplyPlatformRow[] = fixedRows.map(
    (row) => {
      const slots = supplySlots.filter(
        (slot) =>
          comparablePlatformKey(slot.platform) ===
          comparablePlatformKey(row.platform),
      );
      const suppliedPosts = slots.length;
      const usedPosts = slots.filter(
        (slot) => slot.state === "used",
      ).length;
      const coveredPosts = Math.min(suppliedPosts, row.expected);
      return {
        platform: row.platform,
        expectedPosts: row.expected,
        suppliedPosts,
        coveredPosts,
        usedPosts,
        unusedPosts: suppliedPosts - usedPosts,
        coveragePercentage: row.expected
          ? (coveredPosts / row.expected) * 100
          : 0,
      };
    },
  );
  const mediaCoveredPosts = platformSupplyRows.reduce(
    (sum, row) => sum + row.coveredPosts,
    0,
  );

  const actualPosts = mediaPosts + reupPosts + unknownPosts;
  const postingShortfall = fixedRows.reduce(
    (sum, row) => sum + Math.max(0, row.expected - row.posted),
    0,
  );
  const businessUnusedGap = fixedRows.reduce((sum, row) => {
    const gap = Math.max(0, row.expected - row.posted);
    const unusedForPlatform = unusedSupplySlots.filter(
      (slot) =>
        comparablePlatformKey(slot.platform) ===
        comparablePlatformKey(row.platform),
    ).length;
    return sum + Math.min(gap, unusedForPlatform);
  }, 0);
  const mediaSupplyGap = fixedRows.reduce((sum, row) => {
    const gap = Math.max(0, row.expected - row.posted);
    const unusedForPlatform = unusedSupplySlots.filter(
      (slot) =>
        comparablePlatformKey(slot.platform) ===
        comparablePlatformKey(row.platform),
    ).length;
    return sum + Math.max(0, gap - unusedForPlatform);
  }, 0);
  const excessPosts = fixedRows.reduce(
    (sum, row) => sum + Math.max(0, row.posted - row.expected),
    0,
  );
  const excessShare = (value: number) =>
    actualPosts ? (excessPosts * value) / actualPosts : 0;

  return {
    days: normPerformance.days,
    expectedPosts,
    kpiDailyRate: normPerformance.days
      ? expectedPosts / normPerformance.days
      : 0,
    openingReadyTasks,
    openingFreeTasks,
    openingPlannedUnpostedTasks,
    openingPlannedPostedTasks,
    deliveredTasks,
    availableTasks,
    supplySlots,
    openingSupplySlots,
    deliveredSupplySlots,
    usedSupplySlots,
    unusedSupplySlots,
    freeSupplySlots,
    plannedSupplySlots,
    openingUsedSupplySlots,
    deliveredUsedSupplySlots,
    platformSupplyRows,
    mediaCoveredPosts,
    legacyOldTasks,
    usedReadyTasks,
    unusedReadyTasks,
    readyWithoutDateTasks,
    postedWithoutReadyTasks,
    readyMinutes: availableTasks.reduce(
      (sum, task) => sum + task.expectedMinutes,
      0,
    ),
    deliveredMinutes: deliveredTasks.reduce(
      (sum, task) => sum + task.expectedMinutes,
      0,
    ),
    mediaDeliveryRate: normPerformance.days
      ? deliveredSupplySlots.length / normPerformance.days
      : 0,
    mediaSupplyCoverage: expectedPosts
      ? (mediaCoveredPosts / expectedPosts) * 100
      : 0,
    actualPosts,
    mediaPosts,
    reupPosts,
    unknownPosts,
    postingAttainment: expectedPosts
      ? (actualPosts / expectedPosts) * 100
      : 0,
    postingShortfall,
    businessUnusedGap,
    mediaSupplyGap,
    excessPosts,
    mediaExcessEstimate: excessShare(mediaPosts),
    businessExcessEstimate: excessShare(reupPosts),
    unknownExcessEstimate: excessShare(unknownPosts),
    mediaPostEvidence: Array.from(mediaPostEvidence.values()),
    reupPostEvidence: Array.from(reupPostEvidence.values()),
    unknownPostEvidence: Array.from(unknownPostEvidence.values()),
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
  const formatType = normalizedKey(task.formatType);
  if (formatType.includes("video") || formatType.includes("xào source")) {
    return `Task Video/Xào Source nhưng Công đoạn là ${task.stage || "trống"}, không phải Edit`;
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

export function calculatePostingNormDailyTarget(
  norms: PostingNorm[],
  selectedPlatforms: string[] = [],
) {
  const selectedKeys = new Set(
    selectedPlatforms.map((platform) => normalizedKey(platform)),
  );
  return norms.reduce((sum, norm) => {
    if (norm.target === null) return sum;
    if (
      selectedKeys.size &&
      !selectedKeys.has(normalizedKey(norm.platform))
    ) {
      return sum;
    }
    return (
      sum +
      norm.target /
        (normalizedKey(norm.unit).includes("tuần") ? 7 : 1)
    );
  }, 0);
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
  const supplyPerformance = calculatePublicationSupplyPerformance(
    tasks,
    publications,
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
    supplyPerformance,
  };
}
