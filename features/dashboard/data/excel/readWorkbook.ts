import type { DashboardData } from "../../model/types";
import { parseFeedback } from "./parseFeedback";
import { parseHolidays } from "./parseHolidays";
import { parseNorms } from "./parseNorms";
import { parsePublications } from "./parsePublications";
import { parsePostingNorms } from "./parsePostingNorms";
import { parseTasks } from "./parseTasks";
import { parseCosts } from "./parseCosts";
import { parseShootSessions } from "./parseShootSessions";
import { validateDashboardWorkbook } from "./validateWorkbook";
import { registerHolidays } from "@/shared/date/constants";

export type ParsedDashboardWorkbook = {
  data: DashboardData;
  holidayKeys: string[];
};

/**
 * Đọc workbook mà không đụng trạng thái toàn cục, nên chạy được trong Web
 * Worker; nơi nhận kết quả tự nạp `holidayKeys` bằng `registerHolidays`.
 */
export async function parseDashboardWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ParsedDashboardWorkbook> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

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
    holidaySheet,
  } =
    validateDashboardWorkbook(workbook);

  const holidayKeys = holidaySheet ? parseHolidays(holidaySheet) : [];
  const tasks = parseTasks(taskSheet);

  const data: DashboardData = {
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
    fileName,
  };
  return { data, holidayKeys };
}

export async function readDashboardWorkbook(
  file: File,
): Promise<DashboardData> {
  const { data, holidayKeys } = await parseDashboardWorkbook(
    await file.arrayBuffer(),
    file.name,
  );
  // Ngày nghỉ phải được nạp trước khi tính bất kỳ hạn SLA nào.
  registerHolidays(holidayKeys);
  return data;
}
