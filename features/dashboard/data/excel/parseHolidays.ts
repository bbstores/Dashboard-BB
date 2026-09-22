import { dateKey } from "@/shared/date/dateUtils";
import { excelDate } from "./excelDate";
import { HOLIDAY_COLUMNS } from "./workbookSchema";
import { headersFor, temporalValueAt } from "./worksheetUtils";

/** Đọc sheet `Table` cột `Ngày Nghỉ` thành danh sách khoá ngày yyyy-mm-dd. */
export function parseHolidays(
  sheet: import("exceljs").Worksheet,
): string[] {
  const headers = headersFor(sheet);
  const keys: string[] = [];
  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const value = excelDate(
      temporalValueAt(sheet.getRow(index), headers, HOLIDAY_COLUMNS.date),
    );
    if (value) keys.push(dateKey(value));
  }
  return Array.from(new Set(keys));
}
