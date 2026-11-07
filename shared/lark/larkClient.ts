// Gọi Lark Open API phía server bằng tenant_access_token của một app tự tạo.

const LARK_API = "https://open.larksuite.com/open-apis";
// Ô external options chỉ được chờ 3 giây nên mặc định ngắn; workflow gọi thì truyền dài hơn.
const DEFAULT_TIMEOUT_MS = 2500;

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type LarkRecord = {
  record_id: string;
  fields: Record<string, unknown>;
};

type CachedToken = { key: string; value: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

async function callLark<T>(
  fetchImpl: FetchLike,
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
  accessToken?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetchImpl(`${LARK_API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = (await response.json()) as { code?: number; msg?: string };
  if (payload.code !== 0) {
    throw new Error(`Lark ${method} ${path.split("?")[0]} lỗi ${payload.code}: ${payload.msg}`);
  }
  return payload as T;
}

export async function getTenantAccessToken(
  appId: string,
  appSecret: string,
  fetchImpl: FetchLike = fetch,
  now: number = Date.now(),
  timeoutMs?: number,
): Promise<string> {
  if (cachedToken && cachedToken.key === appId && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }
  const payload = await callLark<{ tenant_access_token: string; expire: number }>(
    fetchImpl,
    "POST",
    "/auth/v3/tenant_access_token/internal",
    { app_id: appId, app_secret: appSecret },
    undefined,
    timeoutMs,
  );
  // Làm mới sớm 5 phút để không dùng token sắp hết hạn.
  cachedToken = {
    key: appId,
    value: payload.tenant_access_token,
    expiresAt: now + (payload.expire - 300) * 1000,
  };
  return payload.tenant_access_token;
}

export async function searchBaseRecords(options: {
  fetchImpl?: FetchLike;
  accessToken: string;
  baseToken: string;
  tableId: string;
  fieldNames: string[];
  filter?: unknown;
  timeoutMs?: number;
}): Promise<LarkRecord[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const records: LarkRecord[] = [];
  let pageToken: string | undefined;

  do {
    const query = new URLSearchParams({ page_size: "500" });
    if (pageToken) query.set("page_token", pageToken);
    const payload = await callLark<{
      data: { items?: LarkRecord[] | null; has_more: boolean; page_token?: string };
    }>(
      fetchImpl,
      "POST",
      `/bitable/v1/apps/${options.baseToken}/tables/${options.tableId}/records/search?${query}`,
      { field_names: options.fieldNames, filter: options.filter },
      options.accessToken,
      options.timeoutMs,
    );
    records.push(...(payload.data.items ?? []));
    pageToken = payload.data.has_more ? payload.data.page_token : undefined;
  } while (pageToken);

  return records;
}

export async function getBaseRecord(options: {
  fetchImpl?: FetchLike;
  accessToken: string;
  baseToken: string;
  tableId: string;
  recordId: string;
  timeoutMs?: number;
}): Promise<LarkRecord> {
  const payload = await callLark<{ data: { record: LarkRecord } }>(
    options.fetchImpl ?? fetch,
    "GET",
    `/bitable/v1/apps/${options.baseToken}/tables/${options.tableId}/records/${options.recordId}`,
    undefined,
    options.accessToken,
    options.timeoutMs,
  );
  return payload.data.record;
}

export async function updateBaseRecord(options: {
  fetchImpl?: FetchLike;
  accessToken: string;
  baseToken: string;
  tableId: string;
  recordId: string;
  fields: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<void> {
  await callLark(
    options.fetchImpl ?? fetch,
    "PUT",
    `/bitable/v1/apps/${options.baseToken}/tables/${options.tableId}/records/${options.recordId}`,
    { fields: options.fields },
    options.accessToken,
    options.timeoutMs,
  );
}

// Phiếu Approval: `form` là chuỗi JSON chứa danh sách ô và giá trị.
export async function getApprovalInstance(options: {
  fetchImpl?: FetchLike;
  accessToken: string;
  instanceCode: string;
  timeoutMs?: number;
}): Promise<{ status: string; serial_number?: string; form: string }> {
  const payload = await callLark<{
    data: { status: string; serial_number?: string; form: string };
  }>(
    options.fetchImpl ?? fetch,
    "GET",
    `/approval/v4/instances/${options.instanceCode}`,
    undefined,
    options.accessToken,
    options.timeoutMs,
  );
  return payload.data;
}
