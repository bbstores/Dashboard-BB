import {
  DASHBOARD_SHEETS,
  FEEDBACK_REQUIRED_HEADERS,
  NORM_REQUIRED_HEADERS,
  PUBLICATION_REQUIRED_HEADERS,
  TASK_REQUIRED_HEADERS,
} from "./workbookSchema";
import { missingHeaders } from "./worksheetUtils";

export type DashboardWorksheets = {
  taskSheet: import("exceljs").Worksheet;
  feedbackSheet: import("exceljs").Worksheet;
  publicationSheet?: import("exceljs").Worksheet;
  normSheet?: import("exceljs").Worksheet;
};

export class WorkbookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkbookValidationError";
  }
}

function requireSheet(
  workbook: import("exceljs").Workbook,
  name: string,
) {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) {
    throw new WorkbookValidationError(
      `Không tìm thấy sheet bắt buộc '${name}'.`,
    );
  }
  return sheet;
}

function validateRequiredHeaders(
  sheet: import("exceljs").Worksheet,
  requiredHeaders: readonly string[],
) {
  const missing = missingHeaders(sheet, requiredHeaders);
  if (missing.length) {
    throw new WorkbookValidationError(
      `Sheet '${sheet.name}' thiếu cột bắt buộc: ${missing.join(", ")}.`,
    );
  }
}

export function validateDashboardWorkbook(
  workbook: import("exceljs").Workbook,
): DashboardWorksheets {
  const taskSheet = requireSheet(workbook, DASHBOARD_SHEETS.tasks);
  const feedbackSheet = requireSheet(workbook, DASHBOARD_SHEETS.feedback);
  const publicationSheet = workbook.getWorksheet(
    DASHBOARD_SHEETS.publications,
  );
  const normSheet = workbook.getWorksheet(DASHBOARD_SHEETS.norms);

  validateRequiredHeaders(taskSheet, TASK_REQUIRED_HEADERS);
  validateRequiredHeaders(feedbackSheet, FEEDBACK_REQUIRED_HEADERS);
  if (publicationSheet) {
    validateRequiredHeaders(
      publicationSheet,
      PUBLICATION_REQUIRED_HEADERS,
    );
  }
  if (normSheet) {
    validateRequiredHeaders(normSheet, NORM_REQUIRED_HEADERS);
  }

  return {
    taskSheet,
    feedbackSheet,
    publicationSheet,
    normSheet,
  };
}
