import { handlePaymentSyncRequest } from "@/features/outsource-payment/paymentTaskSync";

// Workflow trong Base gọi endpoint này khi có dòng 2.8 mới từ phiếu chi, để ghi
// Thuộc Task Nào / Thuộc Ca Quay Nào và Hạng mục chi phí từ phiếu dự trù được gắn.
// Body: { token, base_token, table_id (2.8), record_id (dòng 2.8) }.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = {
    appId: process.env.LARK_APP_ID ?? "",
    appSecret: process.env.LARK_APP_SECRET ?? "",
    // Dùng chung chuỗi bí mật với ô external options.
    requestToken: process.env.LARK_APPROVAL_OPTIONS_TOKEN ?? "",
  };
  if (!Object.values(config).every(Boolean)) {
    return Response.json({ code: 500, result: "error", msg: "Server chưa cấu hình biến môi trường Lark" });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: 400, result: "error", msg: "invalid json" });
  }

  return Response.json(await handlePaymentSyncRequest(body, config));
}
