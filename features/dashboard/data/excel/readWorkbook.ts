import type { DashboardData } from "../../model/types";
import { parseFeedback } from "./parseFeedback";
import { parseNorms } from "./parseNorms";
import { parsePublications } from "./parsePublications";
import { parseTasks } from "./parseTasks";
import { parseCosts } from "./parseCosts";
import { validateDashboardWorkbook } from "./validateWorkbook";

export async function readDashboardWorkbook(
  file: File,
): Promise<DashboardData> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const {
    taskSheet,
    feedbackSheet,
    publicationSheet,
    normSheet,
    costSheet,
    collectionSheet,
    productSheet,
    shootSheet,
  } =
    validateDashboardWorkbook(workbook);
  const tasks = parseTasks(taskSheet);

  return {
    tasks,
    feedback: parseFeedback(feedbackSheet),
    norms: normSheet ? parseNorms(normSheet) : [],
    publications: publicationSheet
      ? parsePublications(publicationSheet)
      : [],
    costs: parseCosts({
      costSheet,
      collectionSheet,
      productSheet,
      shootSheet,
    }),
    fileName: file.name,
  };
}
