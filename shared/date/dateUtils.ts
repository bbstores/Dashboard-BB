// ─── Date & Time Utilities ──────────────────────────────────────────────────

import { VIETNAM_HOLIDAYS_2026 } from "./constants";

export function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function inputDate(value: string, end = false) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return end ? endOfDay(date) : startOfDay(date);
}

export function dateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

export function businessMinutesBetween(start: Date | null, end: Date | null) {
  if (!start || !end || end <= start) return null;
  let total = 0;
  const day = startOfDay(start);
  const lastDay = startOfDay(end);
  while (day <= lastDay) {
    const weekday = day.getDay();
    if (
      weekday !== 0 &&
      !VIETNAM_HOLIDAYS_2026.has(dateKey(day))
    ) {
      const intervals = [
        [8, 30, 12, 0],
        [13, 0, 17, 30],
      ];
      for (const [startHour, startMinute, endHour, endMinute] of intervals) {
        const intervalStart = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          startHour,
          startMinute,
        );
        const intervalEnd = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          endHour,
          endMinute,
        );
        const overlapStart = Math.max(start.getTime(), intervalStart.getTime());
        const overlapEnd = Math.min(end.getTime(), intervalEnd.getTime());
        if (overlapEnd > overlapStart) {
          total += (overlapEnd - overlapStart) / 60000;
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return total;
}

export function calendarDaysBetween(start: Date | null, end: Date | null) {
  if (!start || !end || end < start) return null;
  return Math.floor(
    (startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000,
  );
}

export function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = Array.from(values).sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index];
}

export function operationalMinute(value: Date) {
  const clockMinute = value.getHours() * 60 + value.getMinutes();
  const workdayStart = 8 * 60 + 30;
  return clockMinute >= workdayStart
    ? clockMinute - workdayStart
    : clockMinute + 1440 - workdayStart;
}

export function operationalDayStart(value: Date) {
  const date = startOfDay(value);
  const clockMinute = value.getHours() * 60 + value.getMinutes();
  if (clockMinute < 8 * 60 + 30) date.setDate(date.getDate() - 1);
  return date;
}

export function operationalDayLag(start: Date | null, end: Date | null) {
  if (!start || !end) return null;
  return Math.round(
    (operationalDayStart(end).getTime() -
      operationalDayStart(start).getTime()) /
      86400000,
  );
}

export function isWorkingDay(date: Date) {
  return (
    date.getDay() !== 0 && !VIETNAM_HOLIDAYS_2026.has(dateKey(date))
  );
}

export function nextWorkingDay(value: Date) {
  const date = startOfDay(value);
  date.setDate(date.getDate() + 1);
  while (!isWorkingDay(date)) date.setDate(date.getDate() + 1);
  return date;
}

export function sameCalendarDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}
