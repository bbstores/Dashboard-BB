import { endOfDay } from "@/shared/date/dateUtils";
import type { PublicationPost, Task } from "../../model/types";
import { isFinalPublicationTask, isNoSocialPublicationTask, isPublicationReady, normalizedKey, publicationSupplyReadyDate } from "../../model/taskUtils";
import type { ClassifiedPublication, MediaSupplySlot, MediaSupplyPlatformRow, PublicationNormRow, PublicationNormPerformance, PublicationSupplyPerformance } from "./types";
import { publicationBelongsToPlatform, comparablePlatformKey, taskPlatformNames } from "./platforms";

export const OLD_ASSET_CUTOFF = new Date(2026, 6, 1);

export function calculatePublicationSupplyPerformance(
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
