import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { readDashboardWorkbook } from "../features/dashboard/data/excel/readWorkbook";
import {
  DASHBOARD_SHEETS,
  FEEDBACK_COLUMNS,
  FEEDBACK_REQUIRED_HEADERS,
  NORM_COLUMNS,
  NORM_REQUIRED_HEADERS,
  PUBLICATION_COLUMNS,
  PUBLICATION_REQUIRED_HEADERS,
  TASK_COLUMNS,
  TASK_REQUIRED_HEADERS,
} from "../features/dashboard/data/excel/workbookSchema";

function rowFrom(
  headers: readonly string[],
  values: Record<string, ExcelJS.CellValue>,
) {
  return headers.map((header) => values[header] ?? "");
}

test("reads an anonymized workbook end-to-end", async () => {
  const workbook = new ExcelJS.Workbook();
  const tasks = workbook.addWorksheet(DASHBOARD_SHEETS.tasks);
  const feedback = workbook.addWorksheet(DASHBOARD_SHEETS.feedback);
  const publications = workbook.addWorksheet(
    DASHBOARD_SHEETS.publications,
  );
  const norms = workbook.addWorksheet(DASHBOARD_SHEETS.norms);

  tasks.addRow([...TASK_REQUIRED_HEADERS]);
  tasks.addRow(
    rowFrom(TASK_REQUIRED_HEADERS, {
      [TASK_COLUMNS.code]: "ANON-TASK-001",
      [TASK_COLUMNS.title]: "Anonymous campaign asset",
      [TASK_COLUMNS.stage]: "Edit",
      [TASK_COLUMNS.formatType]: "Anonymous video",
      [TASK_COLUMNS.productCode]: "SKU-ANON",
      [TASK_COLUMNS.collection]: "Anonymous 07.2026",
      [TASK_COLUMNS.expectedMinutes]: 90,
      [TASK_COLUMNS.status]: "Done",
      [TASK_COLUMNS.assignee]: "Nhân sự A",
      [TASK_COLUMNS.startDate]: "20/07/2026",
      [TASK_COLUMNS.inspectionDate]: "2026/07/20 16:00",
      [TASK_COLUMNS.completedDate]: "2026/07/21 10:00",
      [TASK_COLUMNS.type]: "Social",
    }),
  );
  tasks.addRow(
    rowFrom(TASK_REQUIRED_HEADERS, {
      [TASK_COLUMNS.title]: "Row without task code is ignored",
    }),
  );

  feedback.addRow([...FEEDBACK_REQUIRED_HEADERS]);
  feedback.addRow(
    rowFrom(FEEDBACK_REQUIRED_HEADERS, {
      [FEEDBACK_COLUMNS.taskCode]: "ANON-TASK-001",
      [FEEDBACK_COLUMNS.at]: "2026/07/20 15:00",
      [FEEDBACK_COLUMNS.assignee]: "Nhân sự A",
    }),
  );

  publications.addRow([...PUBLICATION_REQUIRED_HEADERS]);
  publications.addRow(
    rowFrom(PUBLICATION_REQUIRED_HEADERS, {
      [PUBLICATION_COLUMNS.id]: "ANON-POST-001",
      [PUBLICATION_COLUMNS.scheduledAt]: new Date(
        Date.UTC(2026, 6, 20, 13, 30),
      ),
      [PUBLICATION_COLUMNS.platform]: "Facebook",
      [PUBLICATION_COLUMNS.posted]: "1",
      [PUBLICATION_COLUMNS.postType]: "Reels",
      [PUBLICATION_COLUMNS.title]: "Anonymous launch post",
    }),
  );

  norms.addRow([...NORM_REQUIRED_HEADERS]);
  norms.addRow(
    rowFrom(NORM_REQUIRED_HEADERS, {
      [NORM_COLUMNS.formatType]: "Anonymous video",
      [NORM_COLUMNS.recordMinutes]: 0,
      [NORM_COLUMNS.editMinutes]: 90,
      [NORM_COLUMNS.graphicMinutes]: 0,
      [NORM_COLUMNS.contentMinutes]: 0,
    }),
  );

  const bytes = await workbook.xlsx.writeBuffer();
  const arrayBuffer = new Uint8Array(
    bytes as unknown as ArrayLike<number>,
  ).buffer;
  const file = {
    name: "anonymized-dashboard-fixture.xlsx",
    arrayBuffer: async () => arrayBuffer,
  } as File;

  const result = await readDashboardWorkbook(file);

  assert.equal(result.fileName, "anonymized-dashboard-fixture.xlsx");
  assert.equal(result.tasks.length, 1);
  assert.deepEqual(
    {
      code: result.tasks[0].code,
      title: result.tasks[0].title,
      assignee: result.tasks[0].assignee,
      expectedMinutes: result.tasks[0].expectedMinutes,
    },
    {
      code: "ANON-TASK-001",
      title: "Anonymous campaign asset",
      assignee: "Nhân sự A",
      expectedMinutes: 90,
    },
  );
  assert.equal(result.feedback[0].taskCode, "ANON-TASK-001");
  assert.equal(result.tasks[0].inspectionDate?.getFullYear(), 2026);
  assert.equal(result.tasks[0].inspectionDate?.getMonth(), 6);
  assert.equal(result.tasks[0].inspectionDate?.getDate(), 20);
  assert.equal(result.tasks[0].inspectionDate?.getHours(), 16);
  assert.equal(result.tasks[0].completedDate?.getDate(), 21);
  assert.equal(result.tasks[0].completedDate?.getHours(), 10);
  assert.equal(result.feedback[0].at?.getHours(), 15);
  assert.equal(result.norms[0].editMinutes, 90);
  assert.equal(result.publications.length, 1);
  assert.equal(result.publications[0].id, "ANON-POST-001");
  assert.equal(result.publications[0].platform, "Facebook");
  assert.equal(result.publications[0].posted, true);
  assert.equal(result.publications[0].postType, "Reels");
  assert.equal(result.publications[0].scheduledAt?.getDate(), 20);
  assert.equal(result.publications[0].scheduledAt?.getHours(), 13);
});
