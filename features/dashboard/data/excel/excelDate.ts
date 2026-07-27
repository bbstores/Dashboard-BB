import { normalize } from "../../model/taskUtils";

export function excelDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Excel serial dates do not carry a timezone. ExcelJS exposes them as UTC
    // Date objects, so preserve their UTC wall-clock fields as local time.
    return new Date(
      value.getUTCFullYear(),
      value.getUTCMonth(),
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
    if (candidate.result != null) return excelDate(candidate.result);
    if (candidate.text) return excelDate(candidate.text);
    if (candidate.richText) {
      return excelDate(
        candidate.richText.map((item) => item.text ?? "").join(""),
      );
    }
  }

  const text = normalize(value);
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const ymd = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
