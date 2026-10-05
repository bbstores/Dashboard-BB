import { dateKey, startOfDay } from "@/shared/date/dateUtils";
import type { DateWindow, PostingNorm, PublicationPost } from "../../model/types";
import { normalizedKey } from "../../model/taskUtils";
import type { PublicationDailyRow } from "./types";

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
