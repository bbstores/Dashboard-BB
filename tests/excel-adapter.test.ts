import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { calculateDailyTaskChart } from "../features/dashboard/analytics/calculateDailyTaskChart";
import {
  excelDate,
  excelDateTime,
} from "../features/dashboard/data/excel/excelDate";
import { parseFeedback } from "../features/dashboard/data/excel/parseFeedback";
import { parseShootSessions } from "../features/dashboard/data/excel/parseShootSessions";
import { parseTasks } from "../features/dashboard/data/excel/parseTasks";
import { readDashboardWorkbook } from "../features/dashboard/data/excel/readWorkbook";
import {
  DASHBOARD_SHEETS,
  FEEDBACK_COLUMNS,
  FEEDBACK_REQUIRED_HEADERS,
  NORM_COLUMNS,
  NORM_REQUIRED_HEADERS,
  PUBLICATION_COLUMNS,
  PUBLICATION_REQUIRED_HEADERS,
  SHOOT_SESSION_COLUMNS,
  SHOOT_SESSION_REQUIRED_HEADERS,
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

test("keeps the publication sheet optional and validates it when present", () => {
  const workbook = new ExcelJS.Workbook();
  addSheet(
    workbook,
    DASHBOARD_SHEETS.tasks,
    TASK_REQUIRED_HEADERS,
  );
  addSheet(
    workbook,
    DASHBOARD_SHEETS.feedback,
    FEEDBACK_REQUIRED_HEADERS,
  );
  addSheet(
    workbook,
    DASHBOARD_SHEETS.publications,
    PUBLICATION_REQUIRED_HEADERS.filter(
      (header) => header !== PUBLICATION_COLUMNS.platform,
    ),
  );

  assert.throws(
    () => validateDashboardWorkbook(workbook),
    (error: unknown) =>
      error instanceof WorkbookValidationError &&
      error.message.includes(DASHBOARD_SHEETS.publications) &&
      error.message.includes(PUBLICATION_COLUMNS.platform),
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
    [TASK_COLUMNS.platform]: "Không Đăng Social",
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
  assert.equal(tasks[0].platform, "Không Đăng Social");
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
      publications: [],
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

test("parses shooting sessions into four-hour units", () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = addSheet(
    workbook,
    DASHBOARD_SHEETS.shoots,
    [
      ...SHOOT_SESSION_REQUIRED_HEADERS,
      SHOOT_SESSION_COLUMNS.staff,
      SHOOT_SESSION_COLUMNS.staffCount,
    ],
  );
  const values: Record<string, string | number | Date> = {
    [SHOOT_SESSION_COLUMNS.id]: "CA-001",
    [SHOOT_SESSION_COLUMNS.productCodes]: "SP01 | SP02 | SP01",
    [SHOOT_SESSION_COLUMNS.productCount]: 2,
    [SHOOT_SESSION_COLUMNS.taskCount]: 5,
    [SHOOT_SESSION_COLUMNS.type]: "Bộ Sưu Tập",
    [SHOOT_SESSION_COLUMNS.duration]: "Một ngày",
    [SHOOT_SESSION_COLUMNS.timeWindow]: "8h30–17h30",
    [SHOOT_SESSION_COLUMNS.date]: new Date(Date.UTC(2026, 6, 20)),
    [SHOOT_SESSION_COLUMNS.model]: "Mẫu A",
    [SHOOT_SESSION_COLUMNS.staff]: "An | Bình | Chi",
    [SHOOT_SESSION_COLUMNS.staffCount]: 3,
    [SHOOT_SESSION_COLUMNS.status]: "Đóng",
    [SHOOT_SESSION_COLUMNS.taskCodes]: "TSK001,TSK002",
  };
  sheet.addRow(
    [
      ...SHOOT_SESSION_REQUIRED_HEADERS,
      SHOOT_SESSION_COLUMNS.staff,
      SHOOT_SESSION_COLUMNS.staffCount,
    ].map(
      (header) => values[header] ?? "",
    ),
  );

  const [session] = parseShootSessions(sheet);
  assert.equal(session.id, "CA-001");
  assert.equal(session.sessionUnits, 2);
  assert.equal(session.taskCount, 5);
  assert.equal(session.productCount, 2);
  assert.deepEqual(session.productCodes, ["SP01", "SP02", "SP01"]);
  assert.deepEqual(session.taskCodes, ["TSK001", "TSK002"]);
  assert.equal(session.staffCount, 3);
  assert.deepEqual(session.staffNames, ["An", "Bình", "Chi"]);
  assert.equal(session.date?.getDate(), 20);
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

  const formattedTimedExcelDate = excelDateTime({
    result: new Date(Date.UTC(2026, 5, 11, 17, 36)),
    numberFormat: "yyyy/mm/dd hh:mm",
  });
  assert.equal(
    formatDateTime(formattedTimedExcelDate),
    "17:36 11/06/2026",
  );

  const formattedMidnightExcelDate = excelDateTime({
    result: new Date(Date.UTC(2026, 10, 6, 0, 0)),
    numberFormat: "yyyy/mm/dd hh:mm",
  }, new Date(2026, 5, 11));
  assert.equal(
    formatDateTime(formattedMidnightExcelDate),
    "00:00 11/06/2026",
  );

  assert.equal(excelDateTime("11/05/2026 16:25"), null);
  assert.equal(excelDate("2026/05/11"), null);
  assert.equal(excelDateTime("2026/02/30 09:00"), null);
});

test("restores yyyy/mm/dd even when it exposes invalid task chronology", () => {
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
    [TASK_COLUMNS.startDate]: "16/5/2026",
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
      publications: [],
      tasks,
      feedback: [],
      norms: [],
    },
    "",
    { from: july27, to: july27, hasFilter: true },
  );
  assert.equal(daily.rows[0].backlog, 0);
});

test("keeps TSK3163 midnight dates in July and parses task receive time", () => {
  const workbook = new ExcelJS.Workbook();
  const headers = [
    ...TASK_REQUIRED_HEADERS,
    TASK_COLUMNS.receivedStartDate,
  ];
  const taskSheet = addSheet(
    workbook,
    DASHBOARD_SHEETS.tasks,
    headers,
  );
  const values: Record<string, ExcelJS.CellValue> = {
    [TASK_COLUMNS.code]: "TSK3163",
    [TASK_COLUMNS.status]: "Done",
    [TASK_COLUMNS.startDate]: "11/07/2026",
  };
  const row = taskSheet.addRow(
    headers.map((header) => values[header] ?? ""),
  );
  for (const columnName of [
    TASK_COLUMNS.inspectionDate,
    TASK_COLUMNS.receivedStartDate,
  ]) {
    const column = headers.indexOf(columnName) + 1;
    const cell = row.getCell(column);
    cell.value = new Date(Date.UTC(2026, 6, 11, 0, 0));
    cell.numFmt = "yyyy/mm/dd hh:mm";
  }
  const completionCell = row.getCell(
    headers.indexOf(TASK_COLUMNS.completedDate) + 1,
  );
  completionCell.value = new Date(
    Date.UTC(2026, 6, 20, 17, 42),
  );
  completionCell.numFmt = "yyyy/mm/dd hh:mm";

  const [task] = parseTasks(taskSheet);
  assert.equal(
    formatDateTime(task.inspectionDate),
    "00:00 11/07/2026",
  );
  assert.equal(
    formatDateTime(task.receivedStartDate ?? null),
    "00:00 11/07/2026",
  );
  assert.equal(
    formatDateTime(task.completedDate),
    "17:42 20/07/2026",
  );
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
