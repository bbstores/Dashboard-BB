import { normalize, numberValue } from "../../model/taskUtils";
import type { ShootSession } from "../../model/types";
import { excelDate } from "./excelDate";
import { SHOOT_SESSION_COLUMNS } from "./workbookSchema";
import {
  headersFor,
  temporalValueAt,
  valueAt,
} from "./worksheetUtils";

function splitValues(value: unknown) {
  return normalize(value)
    .split(/\s*[|,;\n]\s*/)
    .map(normalize)
    .filter(Boolean);
}

function valueAtAny(
  row: import("exceljs").Row,
  headers: ReturnType<typeof headersFor>,
  names: string[],
) {
  for (const name of names) {
    const value = valueAt(row, headers, name);
    if (normalize(value)) return value;
  }
  return "";
}

function sessionUnits(duration: string) {
  const value = duration.toLocaleLowerCase("vi");
  if (value.includes("một ngày") || value.includes("1 ngày")) return 2;
  if (value.includes("một buổi") || value.includes("1 buổi")) return 1;
  return 0;
}

export function parseShootSessions(
  sheet: import("exceljs").Worksheet,
): ShootSession[] {
  const headers = headersFor(sheet);
  const rows: ShootSession[] = [];

  for (let index = 2; index <= sheet.actualRowCount; index += 1) {
    const row = sheet.getRow(index);
    const id = normalize(
      valueAt(row, headers, SHOOT_SESSION_COLUMNS.id),
    );
    if (!id) continue;
    const duration = normalize(
      valueAt(row, headers, SHOOT_SESSION_COLUMNS.duration),
    );
    const productCodes = splitValues(
      valueAt(row, headers, SHOOT_SESSION_COLUMNS.productCodes),
    );
    const taskCodes = splitValues(
      valueAt(row, headers, SHOOT_SESSION_COLUMNS.taskCodes),
    );
    const declaredProductCount = numberValue(
      valueAt(row, headers, SHOOT_SESSION_COLUMNS.productCount),
    );
    const declaredTaskCount = numberValue(
      valueAt(row, headers, SHOOT_SESSION_COLUMNS.taskCount),
    );
    const staffNames = Array.from(
      new Set(
        splitValues(
          valueAtAny(row, headers, [
            SHOOT_SESSION_COLUMNS.staff,
            "Nhân sự tham gia",
            "Thành viên tham gia",
            "Team Quay",
          ]),
        ),
      ),
    );
    const declaredStaffCount = numberValue(
      valueAtAny(row, headers, [
        SHOOT_SESSION_COLUMNS.staffCount,
        "Số Lượng Nhân Sự",
        "Số nhân sự",
      ]),
    );

    rows.push({
      id,
      date: excelDate(
        temporalValueAt(row, headers, SHOOT_SESSION_COLUMNS.date),
      ),
      duration,
      sessionUnits: sessionUnits(duration),
      taskCount: declaredTaskCount || taskCodes.length,
      productCount: declaredProductCount || productCodes.length,
      productCodes,
      taskCodes,
      type: normalize(
        valueAt(row, headers, SHOOT_SESSION_COLUMNS.type),
      ),
      timeWindow: normalize(
        valueAt(row, headers, SHOOT_SESSION_COLUMNS.timeWindow),
      ),
      model: normalize(
        valueAt(row, headers, SHOOT_SESSION_COLUMNS.model),
      ),
      staffNames,
      staffCount: declaredStaffCount || staffNames.length,
      status: normalize(
        valueAt(row, headers, SHOOT_SESSION_COLUMNS.status),
      ),
    });
  }

  return rows;
}
