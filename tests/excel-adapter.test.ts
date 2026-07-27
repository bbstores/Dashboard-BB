import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { calculateDailyTaskChart } from "../features/dashboard/analytics/calculateDailyTaskChart";
import {
  excelDate,
  excelDateTime,
} from "../features/dashboard/data/excel/excelDate";
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
import { formatDateTime } from "../shared/formatting/format";

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
    [TASK_COLUMNS.startDate]: "11/5/2026",
    [TASK_COLUMNS.inspectionDate]: "2026/05/11 16:15",
    [TASK_COLUMNS.completedDate]: "2026/05/11 17:30",
  };
  taskSheet.addRow(
    TASK_REQUIRED_HEADERS.map((header) => taskValues[header] ?? ""),
  );

  const feedbackValues: Record<string, string> = {
    [FEEDBACK_COLUMNS.taskCode]: "TSK-001",
    [FEEDBACK_COLUMNS.at]: "2026/05/11 15:45",
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
  assert.equal(tasks[0].startDate?.getMonth(), 4);
  assert.equal(tasks[0].startDate?.getDate(), 11);
  assert.equal(tasks[0].inspectionDate?.getMonth(), 4);
  assert.equal(tasks[0].inspectionDate?.getDate(), 11);
  assert.equal(tasks[0].inspectionDate?.getHours(), 16);
  assert.equal(tasks[0].inspectionDate?.getMinutes(), 15);
  assert.equal(tasks[0].completedDate?.getMonth(), 4);
  assert.equal(tasks[0].completedDate?.getDate(), 11);
  assert.equal(tasks[0].completedDate?.getHours(), 17);
  assert.equal(tasks[0].completedDate?.getMinutes(), 30);
  assert.equal(feedback.length, 1);
  assert.equal(feedback[0].taskCode, "TSK-001");
  assert.equal(feedback[0].assignee, "An");
  assert.equal(feedback[0].at?.getMonth(), 4);
  assert.equal(feedback[0].at?.getDate(), 11);
  assert.equal(feedback[0].at?.getHours(), 15);
  assert.equal(feedback[0].at?.getMinutes(), 45);

  const july27 = new Date(2026, 6, 27);
  const daily = calculateDailyTaskChart(
    {
      fileName: "date-format-fixture.xlsx",
      tasks,
      feedback,
      norms: [],
    },
    "",
    {
      from: july27,
      to: july27,
      hasFilter: true,
    },
  );
  assert.equal(daily.rows[0].backlog, 0);
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

  const dateTime = excelDateTime("2026/05/11 16:25");
  assert.equal(dateTime?.getFullYear(), 2026);
  assert.equal(dateTime?.getMonth(), 4);
  assert.equal(dateTime?.getDate(), 11);
  assert.equal(dateTime?.getHours(), 16);
  assert.equal(dateTime?.getMinutes(), 25);
  assert.equal(formatDateTime(dateTime), "16:25 11/05/2026");

  const typedExcelDate = excelDateTime(
    new Date(Date.UTC(2026, 4, 11, 16, 25)),
  );
  assert.equal(formatDateTime(typedExcelDate), "16:25 11/05/2026");

  assert.equal(excelDateTime("11/05/2026 16:25"), null);
  assert.equal(excelDate("2026/05/11"), null);
  assert.equal(excelDateTime("2026/02/30 09:00"), null);
});

test("resolves swapped Excel date serials against the task start date", () => {
  const workbook = new ExcelJS.Workbook();
  const taskSheet = addSheet(
    workbook,
    DASHBOARD_SHEETS.tasks,
    TASK_REQUIRED_HEADERS,
  );

  const values: Record<string, ExcelJS.CellValue> = {
    [TASK_COLUMNS.code]: "TSK-DATE-ORDER",
    [TASK_COLUMNS.title]: "Date order regression",
    [TASK_COLUMNS.status]: "Done",
    [TASK_COLUMNS.startDate]: "11/5/2026",
  };
  const row = taskSheet.addRow(
    TASK_REQUIRED_HEADERS.map((header) => values[header] ?? ""),
  );
  for (const columnName of [
    TASK_COLUMNS.inspectionDate,
    TASK_COLUMNS.completedDate,
  ]) {
    const column = TASK_REQUIRED_HEADERS.indexOf(columnName) + 1;
    const cell = row.getCell(column);
    // The exporter stored 5 November even though the original y/m/d input
    // represented 11 May. The cell format alone does not expose the swap.
    cell.value = new Date(Date.UTC(2026, 10, 5, 0, 0));
    cell.numFmt = "yyyy/mm/dd hh:mm";
  }

  const tasks = parseTasks(taskSheet);
  assert.equal(formatDateTime(tasks[0].inspectionDate), "00:00 11/05/2026");
  assert.equal(formatDateTime(tasks[0].completedDate), "00:00 11/05/2026");

  const july27 = new Date(2026, 6, 27);
  const daily = calculateDailyTaskChart(
    {
      fileName: "date-order-regression.xlsx",
      tasks,
      feedback: [],
      norms: [],
    },
    "",
    { from: july27, to: july27, hasFilter: true },
  );
  assert.equal(daily.rows[0].backlog, 0);
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
  const arrayBuffer = new Uint8Array(
    bytes as unknown as ArrayLike<number>,
  ).buffer;
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
