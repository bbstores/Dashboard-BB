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

function excelWallClockDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Excel serial dates have no timezone. ExcelJS materializes their
    // wall-clock fields in UTC, so copy those fields into local time.
    return localDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      value.getUTCMilliseconds(),
    );
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const utcDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (Number.isNaN(utcDate.getTime())) return null;
    return localDate(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth() + 1,
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes(),
      utcDate.getUTCSeconds(),
      utcDate.getUTCMilliseconds(),
    );
  }

  return null;
}

function swappedMonthAndDay(date: Date) {
  return localDate(
    date.getFullYear(),
    date.getDate(),
    date.getMonth() + 1,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function restoreYearFirstDateOrder(date: Date) {
  const swapped = swappedMonthAndDay(date);
  return swapped ?? date;
}

function dateTimeFromNumberFormat(
  value: unknown,
  numberFormat: string,
) {
  const date = excelWallClockDate(value);
  if (!date) return null;

  const normalizedFormat = numberFormat
    .toLocaleLowerCase("en")
    .replace(/\[[^\]]*]/g, "")
    .replace(/"[^"]*"/g, "");
  const yearIndex = normalizedFormat.search(/y/);
  const monthIndex = normalizedFormat.search(/m/);
  const dayIndex = normalizedFormat.search(/d/);
  const isYearFirst =
    yearIndex >= 0 &&
    monthIndex > yearIndex &&
    dayIndex > yearIndex;

  if (!isYearFirst) return null;
  // The source exporter parses yyyy/mm/dd as yyyy/dd/mm before writing the
  // Excel serial. Restore the original literal order for ambiguous dates.
  return monthIndex < dayIndex
    ? restoreYearFirstDateOrder(date)
    : date;
}

function excelTemporalValue(
  value: unknown,
  parseText: TextDateParser,
): Date | null {
  if (value == null || value === "") return null;

  if (typeof value === "object" && !(value instanceof Date)) {
    const candidate = value as {
      result?: unknown;
      text?: string;
      richText?: Array<{ text?: string }>;
      numberFormat?: string;
    };
    if (candidate.result != null && candidate.numberFormat) {
      const formattedDate = dateTimeFromNumberFormat(
        candidate.result,
        candidate.numberFormat,
      );
      if (formattedDate) return formattedDate;
    }
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

  const excelDate = excelWallClockDate(value);
  if (excelDate) return excelDate;

  const text = normalize(value);
  return text ? parseText(text) : null;
}

/** Parses the Ngày Bắt Đầu text format: d/mm/yyyy. */
export function excelDate(value: unknown): Date | null {
  return excelTemporalValue(value, parseDayFirstDate);
}

/** Parses Excel milestones that include a time: yyyy/mm/dd hh:mm. */
export function excelDateTime(
  value: unknown,
): Date | null {
  return excelTemporalValue(value, parseYearFirstDateTime);
}
