import {
  handleExternalOptionsRequest,
  type PendingTaskOptionsConfig,
} from "@/features/outsource-payment/pendingTaskOptions";

// Lark Approval gọi endpoint này (POST, chờ tối đa 3 giây) để lấy lựa chọn cho ô
// "Use external options" của phiếu dự trù chi phí Media.
export const dynamic = "force-dynamic";

function readConfig(): PendingTaskOptionsConfig | null {
  const config = {
    appId: process.env.LARK_APP_ID ?? "",
    appSecret: process.env.LARK_APP_SECRET ?? "",
    baseToken: process.env.LARK_BASE_TOKEN ?? "",
    staffTableId: process.env.LARK_STAFF_TABLE_ID ?? "",
    taskTableId: process.env.LARK_TASK_TABLE_ID ?? "",
    requestToken: process.env.LARK_APPROVAL_OPTIONS_TOKEN ?? "",
  };
  return Object.values(config).every(Boolean) ? config : null;
}

export async function POST(request: Request) {
  const config = readConfig();
  if (!config) {
    return Response.json({ code: 500, msg: "Server chưa cấu hình biến môi trường Lark" });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: 400, msg: "invalid json" });
  }

  return Response.json(await handleExternalOptionsRequest(body, config));
}
