import type { DashboardData } from "../../model/types";
import { parseFeedback } from "./parseFeedback";
import { parseNorms } from "./parseNorms";
import { parseTasks } from "./parseTasks";
import { validateDashboardWorkbook } from "./validateWorkbook";

export async function readDashboardWorkbook(
  file: File,
): Promise<DashboardData> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const { taskSheet, feedbackSheet, normSheet } =
    validateDashboardWorkbook(workbook);
  const tasks = parseTasks(taskSheet);

  return {
    tasks,
    feedback: parseFeedback(feedbackSheet, tasks),
    norms: normSheet ? parseNorms(normSheet) : [],
    fileName: file.name,
  };
}
