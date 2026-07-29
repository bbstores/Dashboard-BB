import type {
  CostData,
  CostProposal,
} from "../../model/types";
import {
  normalize,
  numberValue,
} from "../../model/taskUtils";
import {
  COST_COLUMNS,
  COST_LINK_COLUMNS,
} from "./workbookSchema";
import {
  headersFor,
  valueAt,
} from "./worksheetUtils";

function listValue(value: unknown) {
  return Array.from(
    new Set(
      normalize(value)
        .split(/[,;|\n]+/)
        .map(normalize)
        .filter(Boolean),
    ),
  );
}

function parseLinkSheet(
  sheet: import("exceljs").Worksheet | undefined,
  idColumn: string,
) {
  const result: Record<string, string[]> = {};
  if (!sheet) return result;
  const headers = headersFor(sheet);
  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const id = normalize(valueAt(row, headers, idColumn));
    if (!id) continue;
    result[id] = listValue(
      valueAt(row, headers, COST_LINK_COLUMNS.tasks),
    );
  }
  return result;
}

export function parseCosts({
  costSheet,
  collectionSheet,
  productSheet,
  shootSheet,
}: {
  costSheet?: import("exceljs").Worksheet;
  collectionSheet?: import("exceljs").Worksheet;
  productSheet?: import("exceljs").Worksheet;
  shootSheet?: import("exceljs").Worksheet;
}): CostData {
  const proposals: CostProposal[] = [];
  if (costSheet) {
    const headers = headersFor(costSheet);
    for (let index = 2; index <= costSheet.actualRowCount; index += 1) {
      const row = costSheet.getRow(index);
      const id = normalize(valueAt(row, headers, COST_COLUMNS.id));
      if (!id) continue;
      proposals.push({
        id,
        approvalLink: normalize(
          valueAt(row, headers, COST_COLUMNS.approvalLink),
        ),
        title: normalize(valueAt(row, headers, COST_COLUMNS.title)),
        collections: listValue(
          valueAt(row, headers, COST_COLUMNS.collections),
        ),
        shoots: listValue(
          valueAt(row, headers, COST_COLUMNS.shoots),
        ),
        products: listValue(
          valueAt(row, headers, COST_COLUMNS.products),
        ),
        tasks: listValue(valueAt(row, headers, COST_COLUMNS.tasks)),
        totalAmount: numberValue(
          valueAt(row, headers, COST_COLUMNS.totalAmount),
        ),
        unitAmount: numberValue(
          valueAt(row, headers, COST_COLUMNS.unitAmount),
        ),
        status: normalize(valueAt(row, headers, COST_COLUMNS.status)),
      });
    }
  }

  return {
    proposals,
    links: {
      collections: parseLinkSheet(
        collectionSheet,
        COST_LINK_COLUMNS.collectionId,
      ),
      shoots: parseLinkSheet(shootSheet, COST_LINK_COLUMNS.shootId),
      products: parseLinkSheet(
        productSheet,
        COST_LINK_COLUMNS.productId,
      ),
    },
  };
}
