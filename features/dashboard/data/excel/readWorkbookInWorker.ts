import { registerHolidays } from "@/shared/date/constants";
import type { DashboardData } from "../../model/types";
import { readDashboardWorkbook } from "./readWorkbook";
import type { WorkbookWorkerResponse } from "./workbook.worker";

/**
 * Đọc workbook trong Web Worker để giao diện không bị đơ khi parse file lớn.
 * Nếu không tạo được worker thì quay về đọc trên luồng chính.
 */
export async function readDashboardWorkbookInWorker(
  file: File,
): Promise<DashboardData> {
  if (typeof Worker === "undefined") return readDashboardWorkbook(file);

  let worker: Worker;
  try {
    worker = new Worker(new URL("./workbook.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    return readDashboardWorkbook(file);
  }

  try {
    const response = await new Promise<WorkbookWorkerResponse | null>(
      (resolve) => {
        worker.addEventListener("message", (event) => resolve(event.data));
        // Lỗi đọc file đã được worker bắt và gửi về; "error" ở đây nghĩa là
        // worker không chạy được.
        worker.addEventListener("error", () => resolve(null));
        worker.postMessage(file);
      },
    );
    if (!response) return readDashboardWorkbook(file);
    if (!response.ok) {
      throw new Error(response.message || "Không thể đọc file Excel này.");
    }
    // Ngày nghỉ phải được nạp trước khi tính bất kỳ hạn SLA nào.
    registerHolidays(response.result.holidayKeys);
    return response.result.data;
  } finally {
    worker.terminate();
  }
}
