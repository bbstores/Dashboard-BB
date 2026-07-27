import { normalize, numberValue } from "../../model/taskUtils";
import type { WorkNorm } from "../../model/types";
import { NORM_COLUMNS } from "./workbookSchema";
import { headersFor, valueAt } from "./worksheetUtils";

export function parseNorms(
  sheet: import("exceljs").Worksheet,
): WorkNorm[] {
  const headers = headersFor(sheet);
  const norms: WorkNorm[] = [];
  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const formatType = normalize(
      valueAt(row, headers, NORM_COLUMNS.formatType),
    );
    if (!formatType) continue;
    norms.push({
      formatType,
      recordMinutes: numberValue(
        valueAt(row, headers, NORM_COLUMNS.recordMinutes),
      ),
      editMinutes: numberValue(
        valueAt(row, headers, NORM_COLUMNS.editMinutes),
      ),
      graphicMinutes: numberValue(
        valueAt(row, headers, NORM_COLUMNS.graphicMinutes),
      ),
      contentMinutes: numberValue(
        valueAt(row, headers, NORM_COLUMNS.contentMinutes),
      ),
    });
  }
  return norms;
}
