import {
  parseDashboardWorkbook,
  type ParsedDashboardWorkbook,
} from "./readWorkbook";

export type WorkbookWorkerResponse =
  | { ok: true; result: ParsedDashboardWorkbook }
  | { ok: false; message: string };

const scope = self as unknown as Worker;

scope.addEventListener("message", async (event: MessageEvent<File>) => {
  const file = event.data;
  let response: WorkbookWorkerResponse;
  try {
    response = {
      ok: true,
      result: await parseDashboardWorkbook(await file.arrayBuffer(), file.name),
    };
  } catch (reason) {
    response = {
      ok: false,
      message: reason instanceof Error ? reason.message : "",
    };
  }
  scope.postMessage(response);
});
