import { normalize, numberValue } from "../../model/taskUtils";
import type { PostingNorm } from "../../model/types";
import { POSTING_NORM_COLUMNS } from "./workbookSchema";
import { headersFor, valueAt } from "./worksheetUtils";

export function parsePostingNorms(
  sheet: import("exceljs").Worksheet,
): PostingNorm[] {
  const headers = headersFor(sheet);
  const rows: PostingNorm[] = [];

  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const platform = normalize(
      valueAt(row, headers, POSTING_NORM_COLUMNS.platform),
    );
    if (!platform) continue;
    const rawTarget = normalize(
      valueAt(row, headers, POSTING_NORM_COLUMNS.target),
    );
    rows.push({
      platform,
      target: rawTarget ? numberValue(rawTarget) : null,
      unit: normalize(
        valueAt(row, headers, POSTING_NORM_COLUMNS.unit),
      ),
      note: normalize(
        valueAt(row, headers, POSTING_NORM_COLUMNS.note),
      ),
    });
  }

  return rows;
}
