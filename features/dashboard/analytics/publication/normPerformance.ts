import { startOfDay } from "@/shared/date/dateUtils";
import type { DateWindow, PostingNorm, PublicationPost } from "../../model/types";
import { normalize, normalizedKey } from "../../model/taskUtils";
import type { PublicationNormRow, PublicationNormPerformance } from "./types";
import { publicationBelongsToPlatform } from "./platforms";

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
