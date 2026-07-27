import { normalize } from "../../model/taskUtils";
import type { PublicationPost } from "../../model/types";
import { excelDate } from "./excelDate";
import { PUBLICATION_COLUMNS } from "./workbookSchema";
import {
  headersFor,
  temporalValueAt,
  valueAt,
} from "./worksheetUtils";

export function parsePublications(
  sheet: import("exceljs").Worksheet,
): PublicationPost[] {
  const headers = headersFor(sheet);
  const publications: PublicationPost[] = [];

  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const id = normalize(
      valueAt(row, headers, PUBLICATION_COLUMNS.id),
    );
    if (!id) continue;

    publications.push({
      id,
      scheduledAt: excelDate(
        temporalValueAt(
          row,
          headers,
          PUBLICATION_COLUMNS.scheduledAt,
        ),
      ),
      platform: normalize(
        valueAt(row, headers, PUBLICATION_COLUMNS.platform),
      ),
      posted:
        normalize(
          valueAt(row, headers, PUBLICATION_COLUMNS.posted),
        ) === "1",
      postType: normalize(
        valueAt(row, headers, PUBLICATION_COLUMNS.postType),
      ),
      title: normalize(
        valueAt(row, headers, PUBLICATION_COLUMNS.title),
      ),
    });
  }

  return publications;
}
