import { normalizedKey } from "../../model/taskUtils";

export type HeaderIndex = Map<string, number>;

function cellValue(value: unknown): unknown {
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
  if (cell.richText) {
    return cell.richText.map((item) => item.text ?? "").join("");
  }
  if (cell.hyperlink) return cell.hyperlink;
  return String(value);
}

export function headersFor(
  sheet: import("exceljs").Worksheet,
): HeaderIndex {
  const headers = new Map<string, number>();
  sheet
    .getRow(1)
    .eachCell(
      { includeEmpty: false },
      (cell: import("exceljs").Cell, column: number) => {
        headers.set(normalizedKey(cellValue(cell.value)), column);
      },
    );
  return headers;
}

export function valueAt(
  row: import("exceljs").Row,
  headers: HeaderIndex,
  name: string,
) {
  const column = headers.get(normalizedKey(name));
  return column ? cellValue(row.getCell(column).value) : "";
}

export function missingHeaders(
  sheet: import("exceljs").Worksheet,
  requiredHeaders: readonly string[],
) {
  const headers = headersFor(sheet);
  return requiredHeaders.filter(
    (header) => !headers.has(normalizedKey(header)),
  );
}
