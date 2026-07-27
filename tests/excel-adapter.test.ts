import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { excelDate } from "../features/dashboard/data/excel/excelDate";
import { parseFeedback } from "../features/dashboard/data/excel/parseFeedback";
import { parseTasks } from "../features/dashboard/data/excel/parseTasks";
import { readDashboardWorkbook } from "../features/dashboard/data/excel/readWorkbook";
import {
  DASHBOARD_SHEETS,
  FEEDBACK_COLUMNS,
  FEEDBACK_REQUIRED_HEADERS,
  NORM_COLUMNS,
  NORM_REQUIRED_HEADERS,
  TASK_COLUMNS,
  TASK_REQUIRED_HEADERS,
} from "../features/dashboard/data/excel/workbookSchema";
import {
  validateDashboardWorkbook,
  WorkbookValidationError,
} from "../features/dashboard/data/excel/validateWorkbook";

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: readonly string[],
) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow([...headers]);
  return sheet;
}

test("validates required workbook sheets and headers", () => {
  const missingSheetWorkbook = new ExcelJS.Workbook();
  addSheet(
    missingSheetWorkbook,
    DASHBOARD_SHEETS.tasks,
    TASK_REQUIRED_HEADERS,
  );

  assert.throws(
    () => validateDashboardWorkbook(missingSheetWorkbook),
    (error: unknown) =>
      error instanceof WorkbookValidationError &&
      error.message.includes(DASHBOARD_SHEETS.feedback),
  );

  const missingHeaderWorkbook = new ExcelJS.Workbook();
  addSheet(
    missingHeaderWorkbook,
    DASHBOARD_SHEETS.tasks,
    TASK_REQUIRED_HEADERS.filter(
      (header) => header !== TASK_COLUMNS.assignee,
    ),
  );
  addSheet(
    missingHeaderWorkbook,
    DASHBOARD_SHEETS.feedback,
    FEEDBACK_REQUIRED_HEADERS,
  );

  assert.throws(
    () => validateDashboardWorkbook(missingHeaderWorkbook),
    (error: unknown) =>
      error instanceof WorkbookValidationError &&
      error.message.includes(DASHBOARD_SHEETS.tasks) &&
      error.message.includes(TASK_COLUMNS.assignee),
  );
});

test("keeps the norm sheet optional and validates it when present", () => {
  const withoutNormWorkbook = new ExcelJS.Workbook();
  addSheet(
    withoutNormWorkbook,
    DASHBOARD_SHEETS.tasks,
    TASK_REQUIRED_HEADERS,
  );
  addSheet(
    withoutNormWorkbook,
    DASHBOARD_SHEETS.feedback,
    FEEDBACK_REQUIRED_HEADERS,
  );
  assert.doesNotThrow(() => validateDashboardWorkbook(withoutNormWorkbook));

  const invalidNormWorkbook = new ExcelJS.Workbook();
  addSheet(
    invalidNormWorkbook,
    DASHBOARD_SHEETS.tasks,
    TASK_REQUIRED_HEADERS,
  );
  addSheet(
    invalidNormWorkbook,
    DASHBOARD_SHEETS.feedback,
    FEEDBACK_REQUIRED_HEADERS,
  );
  addSheet(
    invalidNormWorkbook,
    DASHBOARD_SHEETS.norms,
    NORM_REQUIRED_HEADERS.filter(
      (header) => header !== NORM_COLUMNS.contentMinutes,
    ),
  );

  assert.throws(
    () => validateDashboardWorkbook(invalidNormWorkbook),
    (error: unknown) =>
      error instanceof WorkbookValidationError &&
      error.message.includes(DASHBOARD_SHEETS.norms) &&
      error.message.includes(NORM_COLUMNS.contentMinutes),
  );
});

test("parses validated task and feedback sheets", () => {
  const workbook = new ExcelJS.Workbook();
  const taskSheet = addSheet(
    workbook,
    DASHBOARD_SHEETS.tasks,
    TASK_REQUIRED_HEADERS,
  );
  const feedbackSheet = addSheet(
    workbook,
    DASHBOARD_SHEETS.feedback,
    FEEDBACK_REQUIRED_HEADERS,
  );

  const taskValues: Record<string, string | number> = {
    [TASK_COLUMNS.code]: "TSK-001",
    [TASK_COLUMNS.title]: "Edit video",
    [TASK_COLUMNS.stage]: "Edit",
    [TASK_COLUMNS.formatType]: "Video ngắn",
    [TASK_COLUMNS.expectedMinutes]: 120,
    [TASK_COLUMNS.status]: "Done",
    [TASK_COLUMNS.assignee]: "An",
    [TASK_COLUMNS.startDate]: "15/07/2026",
    [TASK_COLUMNS.completedDate]: "16/07/2026",
  };
  taskSheet.addRow(
    TASK_REQUIRED_HEADERS.map((header) => taskValues[header] ?? ""),
  );

  const feedbackValues: Record<string, string> = {
    [FEEDBACK_COLUMNS.taskCode]: "TSK-001",
    [FEEDBACK_COLUMNS.at]: "16/07/2026",
    [FEEDBACK_COLUMNS.assignee]: "An",
  };
  feedbackSheet.addRow(
    FEEDBACK_REQUIRED_HEADERS.map((header) => feedbackValues[header] ?? ""),
  );

  const worksheets = validateDashboardWorkbook(workbook);
  const tasks = parseTasks(worksheets.taskSheet);
  const feedback = parseFeedback(worksheets.feedbackSheet);

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].code, "TSK-001");
  assert.equal(tasks[0].expectedMinutes, 120);
  assert.equal(tasks[0].startDate?.getFullYear(), 2026);
  assert.equal(feedback.length, 1);
  assert.equal(feedback[0].taskCode, "TSK-001");
  assert.equal(feedback[0].assignee, "An");
});

test("normalizes supported Excel date values", () => {
  const textDate = excelDate("15/07/2026");
  assert.equal(textDate?.getFullYear(), 2026);
  assert.equal(textDate?.getMonth(), 6);
  assert.equal(textDate?.getDate(), 15);

  const serialDate = excelDate(25569);
  assert.equal(serialDate?.getFullYear(), 1970);
  assert.equal(serialDate?.getMonth(), 0);
  assert.equal(serialDate?.getDate(), 1);
});

test("reads a valid workbook through the client adapter", async () => {
  const workbook = new ExcelJS.Workbook();
  const taskSheet = addSheet(
    workbook,
    DASHBOARD_SHEETS.tasks,
    TASK_REQUIRED_HEADERS,
  );
  addSheet(
    workbook,
    DASHBOARD_SHEETS.feedback,
    FEEDBACK_REQUIRED_HEADERS,
  );
  taskSheet.addRow(
    TASK_REQUIRED_HEADERS.map((header) =>
      header === TASK_COLUMNS.code ? "TSK-CLIENT-001" : "",
    ),
  );

  const bytes = await workbook.xlsx.writeBuffer();
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const file = {
    name: "dashboard-fixture.xlsx",
    arrayBuffer: async () => arrayBuffer,
  } as File;

  const data = await readDashboardWorkbook(file);
  assert.equal(data.fileName, "dashboard-fixture.xlsx");
  assert.equal(data.tasks[0].code, "TSK-CLIENT-001");
  assert.deepEqual(data.feedback, []);
  assert.deepEqual(data.norms, []);
});
