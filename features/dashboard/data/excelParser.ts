// ─── Excel Parsing Utilities ────────────────────────────────────────────────

import { normalize, normalizedKey, numberValue } from "../model/taskUtils";
import type { Task, Feedback, WorkNorm } from "../model/types";

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
      return excelDate(candidate.richText.map((item) => item.text ?? "").join(""));
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

export function cellValue(value: unknown): unknown {
  if (value == null) return "";
  if (value instanceof Date || typeof value !== "object") return value;
  const cell = value as {
    result?: unknown;
    text?: string;
    hyperlink?: string;
    richText?: Array<{ text?: string }>;
  };
  if (cell.result != null) return cell.result;
  if (cell.text != null) return cell.text;
  if (cell.richText) return cell.richText.map((item) => item.text ?? "").join("");
  if (cell.hyperlink) return cell.hyperlink;
  return String(value);
}

export function headersFor(sheet: import("exceljs").Worksheet) {
  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell: import("exceljs").Cell, column: number) => {
    headers.set(normalizedKey(cellValue(cell.value)), column);
  });
  return headers;
}

export function valueAt(
  row: import("exceljs").Row,
  headers: Map<string, number>,
  name: string,
) {
  const column = headers.get(normalizedKey(name));
  return column ? cellValue(row.getCell(column).value) : "";
}

export function parseTasks(
  sheet: import("exceljs").Worksheet,
): Task[] {
  const taskHeaders = headersFor(sheet);
  const tasks: Task[] = [];
  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const code = normalize(valueAt(row, taskHeaders, "Công việc"));
    if (!code) continue;
    tasks.push({
      code,
      title: normalize(valueAt(row, taskHeaders, "Tên Task")),
      stage: normalize(valueAt(row, taskHeaders, "Công đoạn")),
      formatType: normalize(valueAt(row, taskHeaders, "Format Type")),
      productCode: normalize(valueAt(row, taskHeaders, "Mã sản phẩm")),
      collection: normalize(valueAt(row, taskHeaders, "Bộ Sưu Tập")),
      expectedMinutes: numberValue(
        valueAt(row, taskHeaders, "Số phút dự kiến"),
      ),
      status: normalize(valueAt(row, taskHeaders, "Trạng thái")),
      assignee: normalize(valueAt(row, taskHeaders, "Assignee")),
      startDate: excelDate(valueAt(row, taskHeaders, "Ngày Bắt Đầu")),
      completedDate: excelDate(
        valueAt(row, taskHeaders, "Ngày Hoàn Thành"),
      ),
      inspectionDate: excelDate(
        valueAt(row, taskHeaders, "Ngày Kiểm Duyệt"),
      ),
      businessApprovalDate: excelDate(
        valueAt(row, taskHeaders, "Ngày Kinh Doanh Duyệt"),
      ),
      handoffRating: normalize(
        valueAt(row, taskHeaders, "Đánh Giá Bàn Giao"),
      ),
      overallRating: normalize(
        valueAt(row, taskHeaders, "Đánh Giá Tổng"),
      ),
      type: normalize(valueAt(row, taskHeaders, "Type")),
      outsource: normalize(valueAt(row, taskHeaders, "Outsource")),
    });
  }
  return tasks;
}

export function parseFeedback(
  sheet: import("exceljs").Worksheet,
): Feedback[] {
  const feedbackHeaders = headersFor(sheet);
  const feedback: Feedback[] = [];
  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const taskCode = normalize(valueAt(row, feedbackHeaders, "Task"));
    if (!taskCode) continue;
    feedback.push({
      taskCode,
      at: excelDate(valueAt(row, feedbackHeaders, "Thời Điểm")),
      assignee: normalize(
        valueAt(row, feedbackHeaders, "Người Làm Task"),
      ),
    });
  }
  return feedback;
}

export function parseNorms(
  sheet: import("exceljs").Worksheet,
): WorkNorm[] {
  const normHeaders = headersFor(sheet);
  const norms: WorkNorm[] = [];
  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const formatType = normalize(
      valueAt(row, normHeaders, "Tên Định Dạng"),
    );
    if (!formatType) continue;
    norms.push({
      formatType,
      recordMinutes: numberValue(
        valueAt(row, normHeaders, "Thời gian Record (Phút)"),
      ),
      editMinutes: numberValue(
        valueAt(row, normHeaders, "Thời gian Edit (Phút)"),
      ),
      graphicMinutes: numberValue(
        valueAt(row, normHeaders, "Thời gian Graphic"),
      ),
      contentMinutes: numberValue(
        valueAt(row, normHeaders, "Thời gian Viết Content"),
      ),
    });
  }
  return norms;
}
