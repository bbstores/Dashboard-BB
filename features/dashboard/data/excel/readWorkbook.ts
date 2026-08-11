import type { DashboardData } from "../../model/types";
import { parseFeedback } from "./parseFeedback";
import { parseNorms } from "./parseNorms";
import { parsePublications } from "./parsePublications";
import { parsePostingNorms } from "./parsePostingNorms";
import { parseTasks } from "./parseTasks";
import { parseCosts } from "./parseCosts";
import { parseShootSessions } from "./parseShootSessions";
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
    postingNormSheet,
    normSheet,
    costSheet,
    collectionSheet,
    productSheet,
    shootSheet,
    shootSessionSheet,
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
    postingNorms: postingNormSheet
      ? parsePostingNorms(postingNormSheet)
      : [],
    shootSessions: shootSessionSheet
      ? parseShootSessions(shootSessionSheet)
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
