// Danh sách task outsource chờ thanh toán, trả cho ô "external options" của phiếu Approval.
// Nguồn: cột "TSK Chờ Thanh Toán" ở 2.16 Nhân Sự Ngoài (đã loại Pending/Cancel, Archived
// và task đã có trong dòng 2.8 Outsource + Đã Thanh Toán). Tên task lấy từ 2.6 Tasklist.
// Task đang nằm trong phiếu dự trù chưa duyệt vẫn hiện (user chốt 07/11/2026).

import {
  getTenantAccessToken,
  searchBaseRecords,
  type FetchLike,
} from "@/shared/lark/larkClient";

export type PendingTaskOptionsConfig = {
  appId: string;
  appSecret: string;
  baseToken: string;
  staffTableId: string;
  taskTableId: string;
  requestToken: string;
};

type EditorRow = { name: string; wagePerTask: number | null; codes: string[] };

type ExternalOption = { id: string; value: string; label: string };

const CACHE_MS = 60_000;
const TASK_NAME_MAX = 60;
let cachedOptions: { key: string; options: ExternalOption[]; expiresAt: number } | null =
  null;

// Ô Lark trả về nhiều dạng: chuỗi, số, mảng đoạn văn bản [{text}], công thức {value: [...]}.
export function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(cellText).join("");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("text" in record) return cellText(record.text);
    if ("value" in record) return cellText(record.value);
    if ("name" in record) return cellText(record.name);
  }
  return "";
}

function cellNumber(value: unknown): number | null {
  const parsed = Number(cellText(value).replace(/[^\d.-]/g, ""));
  return cellText(value).trim() === "" || Number.isNaN(parsed) ? null : parsed;
}

export function parseTaskCodes(text: string): string[] {
  const codes = text
    .split(/[,\s]+/)
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^TSK\d+$/.test(code));
  return [...new Set(codes)];
}

function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

function shorten(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > TASK_NAME_MAX ? `${clean.slice(0, TASK_NAME_MAX - 1)}…` : clean;
}

export function buildPendingTaskOptions(
  editors: EditorRow[],
  taskNames: Map<string, string>,
): ExternalOption[] {
  const byCode = new Map<string, { names: string[]; wage: number | null }>();
  for (const editor of editors) {
    for (const code of editor.codes) {
      const existing = byCode.get(code);
      if (existing) {
        // Một task gán hai editor: gộp tên, giữ một lựa chọn để id không trùng.
        existing.names.push(editor.name);
      } else {
        byCode.set(code, { names: [editor.name], wage: editor.wagePerTask });
      }
    }
  }

  return [...byCode.entries()]
    .map(([code, entry]) => {
      const parts = [entry.names.join(" + "), code];
      const taskName = taskNames.get(code);
      if (taskName) parts.push(shorten(taskName));
      if (entry.wage != null) parts.push(formatVnd(entry.wage));
      return { id: code, value: code, label: parts.join(" · "), editor: entry.names[0] };
    })
    .sort(
      (a, b) =>
        a.editor.localeCompare(b.editor, "vi") ||
        Number(a.id.slice(3)) - Number(b.id.slice(3)),
    )
    .map(({ id, value, label }) => ({ id, value, label }));
}

export function toExternalOptionsResponse(options: ExternalOption[]) {
  const texts = Object.fromEntries(options.map((option) => [option.value, option.label]));
  return {
    code: 0,
    msg: "success",
    data: {
      result: {
        options: options.map(({ id, value }) => ({ id, value })),
        i18nResources: [
          { locale: "en_us", isDefault: true, texts },
          { locale: "zh_cn", isDefault: false, texts },
        ],
      },
    },
  };
}

async function loadPendingTaskOptions(
  config: PendingTaskOptionsConfig,
  fetchImpl: FetchLike,
): Promise<ExternalOption[]> {
  const accessToken = await getTenantAccessToken(config.appId, config.appSecret, fetchImpl);

  const [staffRecords, taskRecords] = await Promise.all([
    searchBaseRecords({
      fetchImpl,
      accessToken,
      baseToken: config.baseToken,
      tableId: config.staffTableId,
      fieldNames: ["Tên Nhân Sự", "Chức Vụ", "Tiền Công/Task", "TSK Chờ Thanh Toán"],
      filter: {
        conjunction: "and",
        conditions: [{ field_name: "Chức Vụ", operator: "is", value: ["Editor"] }],
      },
    }),
    // Task trong "TSK Chờ Thanh Toán" đều có cột Outsource, nên chỉ cần đọc nhóm này.
    searchBaseRecords({
      fetchImpl,
      accessToken,
      baseToken: config.baseToken,
      tableId: config.taskTableId,
      fieldNames: ["Công việc", "Tên Task"],
      filter: {
        conjunction: "and",
        conditions: [{ field_name: "Outsource", operator: "isNotEmpty", value: [] }],
      },
    }),
  ]);

  const editors: EditorRow[] = staffRecords.map((record) => ({
    name: cellText(record.fields["Tên Nhân Sự"]).trim() || "(chưa có tên)",
    wagePerTask: cellNumber(record.fields["Tiền Công/Task"]),
    codes: parseTaskCodes(cellText(record.fields["TSK Chờ Thanh Toán"])),
  }));
  const taskNames = new Map(
    taskRecords.map((record) => [
      cellText(record.fields["Công việc"]).trim().toUpperCase(),
      cellText(record.fields["Tên Task"]),
    ]),
  );

  return buildPendingTaskOptions(editors, taskNames);
}

// Xử lý một yêu cầu từ Lark Approval. Luôn trả HTTP 200: Lark chỉ đọc trường `code`.
export async function handleExternalOptionsRequest(
  body: unknown,
  config: PendingTaskOptionsConfig,
  fetchImpl: FetchLike = fetch,
  now: number = Date.now(),
) {
  const token = cellText((body as { token?: unknown } | null)?.token);
  if (!config.requestToken || token !== config.requestToken) {
    return { code: 401, msg: "invalid token" };
  }

  const cacheKey = `${config.baseToken}:${config.staffTableId}`;
  if (cachedOptions && cachedOptions.key === cacheKey && cachedOptions.expiresAt > now) {
    return toExternalOptionsResponse(cachedOptions.options);
  }

  try {
    const options = await loadPendingTaskOptions(config, fetchImpl);
    cachedOptions = { key: cacheKey, options, expiresAt: now + CACHE_MS };
    return toExternalOptionsResponse(options);
  } catch (error) {
    console.error("[approval-options]", error);
    return { code: 500, msg: "Không đọc được danh sách task từ Lark Base" };
  }
}
