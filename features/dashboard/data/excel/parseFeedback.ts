import { normalize } from "../../model/taskUtils";
import type { Feedback } from "../../model/types";
import { excelDateTime } from "./excelDate";
import { FEEDBACK_COLUMNS } from "./workbookSchema";
import {
  headersFor,
  temporalValueAt,
  valueAt,
} from "./worksheetUtils";

export function parseFeedback(
  sheet: import("exceljs").Worksheet,
): Feedback[] {
  const headers = headersFor(sheet);
  const feedback: Feedback[] = [];
  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const taskCode = normalize(
      valueAt(row, headers, FEEDBACK_COLUMNS.taskCode),
    );
    if (!taskCode) continue;
    feedback.push({
      taskCode,
      at: excelDateTime(
        temporalValueAt(row, headers, FEEDBACK_COLUMNS.at),
      ),
      assignee: normalize(
        valueAt(row, headers, FEEDBACK_COLUMNS.assignee),
      ),
    });
  }
  return feedback;
}
