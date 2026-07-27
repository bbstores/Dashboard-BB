import {
  dateKey,
  startOfDay,
} from "@/shared/date/dateUtils";
import type {
  DateWindow,
  PublicationPost,
} from "../model/types";
import { inWindow, normalize } from "../model/taskUtils";

export type PublicationBreakdownRow = {
  label: string;
  total: number;
  posted: number;
};

export type PublicationDailyRow = {
  date: Date;
  total: number;
  posted: number;
};

const UNKNOWN_LABEL = "Chưa xác định";

function labelFor(value: string) {
  return normalize(value) || UNKNOWN_LABEL;
}

function groupedRows(
  posts: PublicationPost[],
  key: (post: PublicationPost) => string,
) {
  const rows = new Map<string, PublicationBreakdownRow>();
  for (const post of posts) {
    const label = labelFor(key(post));
    const row = rows.get(label) ?? {
      label,
      total: 0,
      posted: 0,
    };
    row.total += 1;
    if (post.posted) row.posted += 1;
    rows.set(label, row);
  }
  return Array.from(rows.values()).sort(
    (left, right) =>
      right.total - left.total ||
      left.label.localeCompare(right.label, "vi"),
  );
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
  publications: PublicationPost[],
  dateWindow: DateWindow,
  platform: string,
) {
  const filtered = publications.filter(
    (post) =>
      post.scheduledAt &&
      inWindow(post.scheduledAt, dateWindow),
  );
  const platformRows = groupedRows(
    filtered,
    (post) => post.platform,
  );
  const platforms = platformRows.map((row) => row.label);
  const selectedPosts = platform
    ? filtered.filter(
        (post) => labelFor(post.platform) === platform,
      )
    : filtered;

  return {
    total: filtered.length,
    posted: filtered.filter((post) => post.posted).length,
    platforms,
    platformRows,
    selectedPosts,
    postTypeRows: groupedRows(
      selectedPosts,
      (post) => post.postType,
    ),
    dailyRows: dailyRows(selectedPosts, dateWindow),
  };
}
