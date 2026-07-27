import { normalize, numberValue } from "../../model/taskUtils";
import type { Task } from "../../model/types";
import { excelDate, excelDateTime } from "./excelDate";
import { TASK_COLUMNS } from "./workbookSchema";
import { headersFor, valueAt } from "./worksheetUtils";

export function parseTasks(sheet: import("exceljs").Worksheet): Task[] {
  const headers = headersFor(sheet);
  const tasks: Task[] = [];
  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const code = normalize(valueAt(row, headers, TASK_COLUMNS.code));
    if (!code) continue;
    tasks.push({
      code,
      title: normalize(valueAt(row, headers, TASK_COLUMNS.title)),
      stage: normalize(valueAt(row, headers, TASK_COLUMNS.stage)),
      formatType: normalize(valueAt(row, headers, TASK_COLUMNS.formatType)),
      productCode: normalize(valueAt(row, headers, TASK_COLUMNS.productCode)),
      collection: normalize(valueAt(row, headers, TASK_COLUMNS.collection)),
      expectedMinutes: numberValue(
        valueAt(row, headers, TASK_COLUMNS.expectedMinutes),
      ),
      status: normalize(valueAt(row, headers, TASK_COLUMNS.status)),
      assignee: normalize(valueAt(row, headers, TASK_COLUMNS.assignee)),
      startDate: excelDate(valueAt(row, headers, TASK_COLUMNS.startDate)),
      completedDate: excelDateTime(
        valueAt(row, headers, TASK_COLUMNS.completedDate),
      ),
      inspectionDate: excelDateTime(
        valueAt(row, headers, TASK_COLUMNS.inspectionDate),
      ),
      businessApprovalDate: excelDateTime(
        valueAt(row, headers, TASK_COLUMNS.businessApprovalDate),
      ),
      handoffRating: normalize(
        valueAt(row, headers, TASK_COLUMNS.handoffRating),
      ),
      overallRating: normalize(
        valueAt(row, headers, TASK_COLUMNS.overallRating),
      ),
      type: normalize(valueAt(row, headers, TASK_COLUMNS.type)),
      outsource: normalize(valueAt(row, headers, TASK_COLUMNS.outsource)),
    });
  }
  return tasks;
}
