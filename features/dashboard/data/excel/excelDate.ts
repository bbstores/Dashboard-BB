import { normalize } from "../../model/taskUtils";

type TextDateParser = (value: string) => Date | null;

function localDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  const date = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second ||
    date.getMilliseconds() !== millisecond
  ) {
    return null;
  }
  return date;
}

function parseDayFirstDate(value: string) {
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  return localDate(Number(match[3]), Number(match[2]), Number(match[1]));
}

function parseYearFirstDateTime(value: string) {
  const match = value.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?$/,
  );
  if (!match) return null;
  const milliseconds = match[7]
    ? Number(match[7].padEnd(3, "0"))
    : 0;
  return localDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
    milliseconds,
  );
}

function excelTemporalValue(
  value: unknown,
  parseText: TextDateParser,
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Excel dates are timezone-free wall-clock values. ExcelJS has already
    // materialized that wall clock in the browser's local timezone.
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds(),
    );
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const utcDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (Number.isNaN(utcDate.getTime())) return null;
    return new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes(),
      utcDate.getUTCSeconds(),
      utcDate.getUTCMilliseconds(),
    );
  }

  if (typeof value === "object") {
    const candidate = value as {
      result?: unknown;
      text?: string;
      richText?: Array<{ text?: string }>;
    };
    if (candidate.result != null) {
      return excelTemporalValue(candidate.result, parseText);
    }
    if (candidate.text) {
      return excelTemporalValue(candidate.text, parseText);
    }
    if (candidate.richText) {
      return excelTemporalValue(
        candidate.richText.map((item) => item.text ?? "").join(""),
        parseText,
      );
    }
  }

  const text = normalize(value);
  return text ? parseText(text) : null;
}

/** Parses the Ngày Bắt Đầu text format: d/mm/yyyy. */
export function excelDate(value: unknown): Date | null {
  return excelTemporalValue(value, parseDayFirstDate);
}

/** Parses Excel milestones that include a time: yyyy/mm/dd hh:mm. */
export function excelDateTime(value: unknown): Date | null {
  return excelTemporalValue(value, parseYearFirstDateTime);
}
