// Ghi task / ca quay từ phiếu dự trù vào dòng 2.8 của phiếu chi tương ứng.
// Luồng: dòng 2.8 (Auto Tạo Bill tạo) → Link Approval → dòng 2.17 (đồng bộ phiếu chi)
// → SourceID chứa mã phiếu chi → ô liên kết "Phiếu Dự Trù Chi Phí Media" → phiếu dự trù.
// 1 phiếu dự trù có thể ứng với nhiều phiếu chi (mỗi phiếu chi 1 người thụ hưởng); ô
// "Thanh Toán Khoản Dự Trù" trên phiếu chi cho biết phiếu đó trả khoản nào.
// Chỉ điền ô đang trống, không ghi đè dữ liệu người dùng đã nhập.

import {
  getApprovalInstance,
  getBaseRecord,
  getTenantAccessToken,
  searchBaseRecords,
  updateBaseRecord,
  type FetchLike,
  type LarkRecord,
} from "@/shared/lark/larkClient";
import { cellText } from "@/features/outsource-payment/pendingTaskOptions";

export type PaymentSyncConfig = {
  appId: string;
  appSecret: string;
  requestToken: string;
};

type Widget = { id?: string; name?: string; type?: string; value?: unknown };

type ItemCategory = {
  kind: "outsource" | "shoot";
  category: "Outsource" | "Mẫu" | "Địa Điểm" | "Makeup";
};

type BudgetInfo = {
  kinds: Set<"outsource" | "shoot">;
  taskCodes: string[];
  shootNames: string[];
};

const FIELD = {
  linkApproval: "Link Approval",
  tasks: "Thuộc Task Nào",
  shoots: "Thuộc Ca Quay Nào",
  category: "Hạng mục chi phí",
  sourceId: "SourceID",
  item: "Details_Thanh Toán Khoản Dự Trù",
  taskCode: "Công việc",
  shootName: "Tên Ca Quay",
} as const;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// SourceID ở bảng đồng bộ = base64("<approval id>:<MÃ PHIẾU>-1:<hash>:1").
export function decodeSourceId(sourceId: string): string | null {
  if (!sourceId) return null;
  const decoded = Buffer.from(sourceId, "base64").toString("utf8");
  const match = decoded.match(
    /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i,
  );
  return match ? match[0].toUpperCase() : null;
}

// Ô liên kết bản ghi: [{ record_ids: [...], table_id }] (API v1) hoặc [{ id }].
export function linkedRecordIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (!item || typeof item !== "object") return [];
    const record = item as { record_ids?: unknown; id?: unknown };
    if (Array.isArray(record.record_ids)) return record.record_ids.map(String);
    return typeof record.id === "string" ? [record.id] : [];
  });
}

function linkedTableId(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    const tableId = (item as { table_id?: unknown } | null)?.table_id;
    if (typeof tableId === "string" && tableId) return tableId;
  }
  return null;
}

export function categoryForItem(item: string): ItemCategory | null {
  const key = normalize(item);
  if (key.startsWith("mau")) return { kind: "shoot", category: "Mẫu" };
  if (key.startsWith("dia diem")) return { kind: "shoot", category: "Địa Điểm" };
  if (key.startsWith("make")) return { kind: "shoot", category: "Makeup" };
  if (key.startsWith("outsource")) return { kind: "outsource", category: "Outsource" };
  return null; // "Khác" hoặc trống: không theo dự trù.
}

// Trải phẳng ô của form, kể cả ô trong nhóm (giá trị nhóm là mảng các dòng ô).
function flattenWidgets(form: string | Widget[]): Widget[] {
  const widgets = typeof form === "string" ? (JSON.parse(form) as Widget[]) : form;
  const out: Widget[] = [];
  const visit = (list: Widget[]) => {
    for (const widget of list) {
      out.push(widget);
      const value = widget.value;
      if (Array.isArray(value) && value.length > 0) {
        if (Array.isArray(value[0])) (value as Widget[][]).forEach(visit);
        else if (value[0] && typeof value[0] === "object" && "type" in value[0]) {
          visit(value as Widget[]);
        }
      }
    }
  };
  visit(widgets);
  return out;
}

function widgetText(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as { text?: unknown; value?: unknown };
    return cellText(record.text ?? record.value);
  }
  return cellText(value);
}

// Mã các phiếu dự trù được gắn trong ô liên kết của phiếu chi.
export function linkedBudgetCodes(paymentForm: string | Widget[]): string[] {
  return flattenWidgets(paymentForm)
    .filter((widget) => widget.type === "connect" && normalize(widget.name ?? "").includes("du tru"))
    .flatMap((widget) => (Array.isArray(widget.value) ? widget.value.map(String) : []))
    .filter(Boolean);
}

export function readBudget(form: string | Widget[]): BudgetInfo {
  const widgets = flattenWidgets(form);
  const kinds = new Set<"outsource" | "shoot">();
  const taskCodes = new Set<string>();
  const shootNames = new Set<string>();

  for (const widget of widgets) {
    const name = normalize(widget.name ?? "");
    if (name === "loai chi phi") {
      const kind = normalize(widgetText(widget.value));
      if (kind.includes("outsource")) kinds.add("outsource");
      if (kind.includes("ca quay")) kinds.add("shoot");
    }
    if (widget.type === "checkboxV2" && Array.isArray(widget.value)) {
      for (const label of widget.value) {
        for (const code of widgetText(label).toUpperCase().match(/TSK\d+/g) ?? []) {
          taskCodes.add(code);
        }
      }
    }
    if (name === "ten ca quay") {
      const shoot = widgetText(widget.value).trim();
      if (shoot) shootNames.add(shoot);
    }
  }
  return { kinds, taskCodes: [...taskCodes], shootNames: [...shootNames] };
}

function mergeBudgets(budgets: BudgetInfo[]): BudgetInfo {
  return {
    kinds: new Set(budgets.flatMap((budget) => [...budget.kinds])),
    taskCodes: [...new Set(budgets.flatMap((budget) => budget.taskCodes))],
    shootNames: [...new Set(budgets.flatMap((budget) => budget.shootNames))],
  };
}

type SyncResult =
  | { code: 0; result: "updated"; msg: string; fields: Record<string, unknown>; missing: string[] }
  | { code: 0; result: "skipped"; msg: string }
  | { code: number; result: "error"; msg: string };

function skipped(msg: string): SyncResult {
  return { code: 0, result: "skipped", msg };
}

async function resolveRecords(
  records: LarkRecord[],
  field: string,
  wanted: string[],
  keyOf: (text: string) => string,
): Promise<{ ids: string[]; missing: string[] }> {
  const byKey = new Map(
    records.map((record) => [keyOf(cellText(record.fields[field])), record.record_id]),
  );
  const ids: string[] = [];
  const missing: string[] = [];
  for (const value of wanted) {
    const id = byKey.get(keyOf(value));
    if (id) ids.push(id);
    else missing.push(value);
  }
  return { ids, missing };
}

export async function handlePaymentSyncRequest(
  body: unknown,
  config: PaymentSyncConfig,
  fetchImpl: FetchLike = fetch,
): Promise<SyncResult> {
  const request = (body ?? {}) as { token?: unknown; base_token?: unknown; table_id?: unknown; record_id?: unknown };
  if (!config.requestToken || cellText(request.token) !== config.requestToken) {
    return { code: 401, result: "error", msg: "invalid token" };
  }
  const baseToken = cellText(request.base_token);
  const paymentTableId = cellText(request.table_id);
  const recordId = cellText(request.record_id);
  if (!baseToken || !/^tbl/.test(paymentTableId) || !/^rec/.test(recordId)) {
    return { code: 400, result: "error", msg: "thiếu base_token, table_id hoặc record_id" };
  }

  try {
    const accessToken = await getTenantAccessToken(config.appId, config.appSecret, fetchImpl);
    const base = { fetchImpl, accessToken, baseToken };

    const payment = await getBaseRecord({ ...base, tableId: paymentTableId, recordId });
    const pf = payment.fields;

    const syncTableId = linkedTableId(pf[FIELD.linkApproval]);
    const [syncRecordId] = linkedRecordIds(pf[FIELD.linkApproval]);
    if (!syncTableId || !syncRecordId) return skipped("dòng 2.8 chưa có Link Approval");

    const sync = await getBaseRecord({ ...base, tableId: syncTableId, recordId: syncRecordId });
    const item = cellText(sync.fields[FIELD.item]);
    const category = categoryForItem(item);
    if (!category) return skipped(`khoản "${item || "trống"}" không theo dự trù`);

    const paymentCode = decodeSourceId(cellText(sync.fields[FIELD.sourceId]));
    if (!paymentCode) return { code: 500, result: "error", msg: "không đọc được mã phiếu chi từ SourceID" };

    const paymentInstance = await getApprovalInstance({ fetchImpl, accessToken, instanceCode: paymentCode });
    const budgetCodes = linkedBudgetCodes(paymentInstance.form);
    if (budgetCodes.length === 0) return skipped("phiếu chi chưa gắn phiếu dự trù");

    const budget = mergeBudgets(
      await Promise.all(
        budgetCodes.map(async (code) =>
          readBudget((await getApprovalInstance({ fetchImpl, accessToken, instanceCode: code })).form),
        ),
      ),
    );
    if (!budget.kinds.has(category.kind)) {
      return skipped(`khoản "${item}" không khớp loại chi phí của phiếu dự trù`);
    }

    const update: Record<string, unknown> = {};
    let missing: string[] = [];

    if (category.kind === "outsource") {
      if (budget.taskCodes.length === 0) return skipped("phiếu dự trù không có task");
      const taskTableId = linkedTableId(pf[FIELD.tasks]);
      if (!taskTableId) return { code: 500, result: "error", msg: "không xác định được bảng task" };
      if (linkedRecordIds(pf[FIELD.tasks]).length === 0) {
        const tasks = await searchBaseRecords({
          ...base,
          tableId: taskTableId,
          fieldNames: [FIELD.taskCode],
          filter: {
            conjunction: "and",
            conditions: [{ field_name: "Outsource", operator: "isNotEmpty", value: [] }],
          },
        });
        const resolved = await resolveRecords(tasks, FIELD.taskCode, budget.taskCodes, (t) =>
          t.trim().toUpperCase(),
        );
        missing = resolved.missing;
        if (resolved.ids.length > 0) update[FIELD.tasks] = resolved.ids;
      }
    } else {
      if (budget.shootNames.length === 0) return skipped("phiếu dự trù không có ca quay");
      const shootTableId = linkedTableId(pf[FIELD.shoots]);
      if (!shootTableId) return { code: 500, result: "error", msg: "không xác định được bảng ca quay" };
      if (linkedRecordIds(pf[FIELD.shoots]).length === 0) {
        const shoots = await searchBaseRecords({
          ...base,
          tableId: shootTableId,
          fieldNames: [FIELD.shootName],
        });
        const resolved = await resolveRecords(shoots, FIELD.shootName, budget.shootNames, normalize);
        missing = resolved.missing;
        if (resolved.ids.length > 0) update[FIELD.shoots] = resolved.ids;
      }
    }

    if (!cellText(pf[FIELD.category])) update[FIELD.category] = category.category;

    if (Object.keys(update).length === 0) return skipped("dòng 2.8 đã có dữ liệu, không ghi đè");

    await updateBaseRecord({ ...base, tableId: paymentTableId, recordId, fields: update });
    console.info("[payment-sync]", recordId, JSON.stringify(update), missing.length ? `thiếu: ${missing.join(", ")}` : "");
    return {
      code: 0,
      result: "updated",
      msg: missing.length ? `đã ghi, không tìm thấy: ${missing.join(", ")}` : "đã ghi",
      fields: update,
      missing,
    };
  } catch (error) {
    console.error("[payment-sync]", recordId, error);
    return { code: 500, result: "error", msg: error instanceof Error ? error.message : "lỗi không xác định" };
  }
}
