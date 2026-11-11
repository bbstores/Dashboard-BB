// Ghi task / ca quay vào dòng 2.8 của phiếu chi Media, và gộp dòng 2.8 trùng.
//
// Từ 11/11/2026 phiếu dự trù được gộp thẳng vào Phiếu Đề Xuất Chi: khi phiếu là chi phí
// Media, form có ô Loại Chi Phí Media (Ca Quay / OutSource / Khác), khoản ca quay, ca quay
// (2.11) hoặc task outsource (2.6). Các ô này đồng bộ sang 2.17 nên đọc thẳng từ 2.17.
// Phiếu kiểu cũ (gắn "Phiếu Dự Trù Chi Phí Media") vẫn đọc qua API Approval.
//
// Mỗi dòng Details của phiếu chi đồng bộ thành một dòng 2.17, và Auto Tạo Bill tạo một dòng
// 2.8 cho từng dòng 2.17 (cùng mang Tổng tiền). Để mỗi phiếu chi chỉ còn 1 dòng 2.8, dòng
// của Details thứ nhất được giữ lại, các dòng sau được gộp link vào rồi xoá. Chỉ xoá dòng
// chưa có dữ liệu nhập tay. Chỉ điền ô đang trống, không ghi đè.

import {
  deleteBaseRecord,
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

type Kind = "outsource" | "shoot";

type ItemCategory = {
  kind: Kind;
  category: "Outsource" | "Mẫu" | "Địa Điểm" | "Makeup";
};

type BudgetInfo = {
  kinds: Set<Kind>;
  taskCodes: string[];
  shootNames: string[];
};

// Workflow trong Base chờ được lâu hơn ô chọn trên phiếu, nên cho mỗi lần gọi Lark tối đa 8 giây.
const SYNC_TIMEOUT_MS = 8000;

const FIELD = {
  // 2.8
  linkApproval: "Link Approval",
  tasks: "Thuộc Task Nào",
  shoots: "Thuộc Ca Quay Nào",
  skus: "Thuộc SKU nào",
  collections: "Bộ Sưu Tập",
  category: "Hạng mục chi phí",
  // 2.17
  sourceId: "SourceID",
  requestNo: "Request No.",
  paymentBackLink: "2.8 Đề xuất chi phí",
  paymentGroup: "Nhóm Phiếu",
  mediaKind: "Loại Chi Phí Media",
  // Tên ô khoản qua các phiên bản form, ưu tiên bản mới nhất.
  itemFields: [
    "Thanh Toán Khoản Ca Quay",
    "Khoản Ca Quay",
    "Thanh Toán Khoản Dự Trù",
    "Details_Thanh Toán Khoản Dự Trù",
  ],
  paidTasks: "Task Thanh Toán",
  // 2.6, 2.11
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

function decodeSource(sourceId: string): string {
  return sourceId ? Buffer.from(sourceId, "base64").toString("utf8") : "";
}

// SourceID ở 2.17 = base64("<approval id>:<MÃ PHIẾU>-<dòng Details>:<hash>:1").
export function decodeSourceId(sourceId: string): string | null {
  const match = decodeSource(sourceId).match(
    /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i,
  );
  return match ? match[0].toUpperCase() : null;
}

// Số thứ tự dòng Details (1, 2, 3…) mà dòng 2.17 này đại diện.
export function detailLineOf(sourceId: string): number {
  const match = decodeSource(sourceId).match(/[0-9A-F]{12}-(\d+):/i);
  return match ? Number(match[1]) : 1;
}

function requestNoOf(value: unknown): string {
  return cellText(value).match(/\d{12}/)?.[0] ?? "";
}

// Ô liên kết bản ghi có 3 dạng: đọc từng dòng (v1) trả [{ record_ids: [...], table_id }],
// tìm kiếm (v1 search) trả { link_record_ids: [...] }, CLI trả [{ id }].
export function linkedRecordIds(value: unknown): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const ids = (value as { link_record_ids?: unknown }).link_record_ids;
    return Array.isArray(ids) ? ids.map(String) : [];
  }
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
  return null; // "Khác" hoặc trống: không theo ca quay / task.
}

function taskCodesIn(value: unknown): string[] {
  const texts = Array.isArray(value) ? value.map(widgetText) : [widgetText(value)];
  return [...new Set(texts.flatMap((text) => text.toUpperCase().match(/TSK\d+/g) ?? []))];
}

// ---- Phiếu kiểu cũ: đọc phiếu dự trù được gắn qua API Approval ----

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

export function linkedBudgetCodes(paymentForm: string | Widget[]): string[] {
  return flattenWidgets(paymentForm)
    .filter((widget) => widget.type === "connect" && normalize(widget.name ?? "").includes("du tru"))
    .flatMap((widget) => (Array.isArray(widget.value) ? widget.value.map(String) : []))
    .filter(Boolean);
}

export function readBudget(form: string | Widget[]): BudgetInfo {
  const kinds = new Set<Kind>();
  const taskCodes = new Set<string>();
  const shootNames = new Set<string>();

  for (const widget of flattenWidgets(form)) {
    const name = normalize(widget.name ?? "");
    if (name.startsWith("loai chi phi")) {
      const kind = normalize(widgetText(widget.value));
      if (kind.includes("outsource")) kinds.add("outsource");
      if (kind.includes("ca quay")) kinds.add("shoot");
    }
    if (widget.type === "checkboxV2" && Array.isArray(widget.value)) {
      taskCodesIn(widget.value).forEach((code) => taskCodes.add(code));
    }
    if (name === "ten ca quay") {
      const shoot = widgetText(widget.value).trim();
      if (shoot) shootNames.add(shoot);
    }
  }
  return { kinds, taskCodes: [...taskCodes], shootNames: [...shootNames] };
}

// ---- Phiếu kiểu mới: đọc thẳng các cột Media ở 2.17 ----

type MediaPlan =
  | { status: "ok"; category: ItemCategory; taskCodes: string[]; shootNames: string[] }
  | { status: "skip"; reason: string }
  | { status: "legacy"; category: ItemCategory };

export function readMediaFields(fields: Record<string, unknown>): MediaPlan {
  // Ô Nhóm Phiếu có từ 11/11/2026. Phiếu Thường thì bỏ qua, kể cả khi còn sót giá trị
  // Loại Chi Phí Media do người lập đổi nhóm giữa chừng.
  const group = normalize(cellText(fields[FIELD.paymentGroup]));
  if (group && !group.includes("media")) {
    return { status: "skip", reason: `nhóm phiếu "${cellText(fields[FIELD.paymentGroup])}" không phải Media` };
  }

  const item = FIELD.itemFields.map((name) => cellText(fields[name])).find(Boolean) ?? "";
  const mediaKind = normalize(cellText(fields[FIELD.mediaKind]));

  if (!mediaKind) {
    // Phiếu tạo trước khi gộp phiếu dự trù vào phiếu chi.
    const category = categoryForItem(item);
    return category
      ? { status: "legacy", category }
      : { status: "skip", reason: `khoản "${item || "trống"}" không theo ca quay / task` };
  }
  if (mediaKind.includes("outsource")) {
    return {
      status: "ok",
      category: { kind: "outsource", category: "Outsource" },
      taskCodes: taskCodesIn(fields[FIELD.paidTasks]),
      shootNames: [],
    };
  }
  if (mediaKind.includes("ca quay")) {
    const category = categoryForItem(item);
    if (!category || category.kind !== "shoot") {
      return { status: "skip", reason: `phiếu ca quay chưa chọn khoản (đang là "${item || "trống"}")` };
    }
    const shoot = cellText(fields[FIELD.shootName]).trim();
    return { status: "ok", category, taskCodes: [], shootNames: shoot ? [shoot] : [] };
  }
  return { status: "skip", reason: `loại chi phí Media "${cellText(fields[FIELD.mediaKind])}" không gắn ca quay / task` };
}

// ---- Kết quả ----

type SyncResult =
  | { code: 0; result: "updated"; msg: string; fields: Record<string, unknown>; missing: string[]; merged: string[] }
  | { code: 0; result: "merged"; msg: string; into: string }
  | { code: 0; result: "skipped"; msg: string; merged?: string[] }
  | { code: number; result: "error"; msg: string };

function skipped(msg: string, merged: string[] = []): SyncResult {
  return merged.length ? { code: 0, result: "skipped", msg, merged } : { code: 0, result: "skipped", msg };
}

function resolveRecords(
  records: LarkRecord[],
  field: string,
  wanted: string[],
  keyOf: (text: string) => string,
): { ids: string[]; missing: string[] } {
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

// Dòng 2.8 do Auto Tạo Bill tạo, chưa ai nhập thêm: được phép gộp rồi xoá.
function isUntouched(fields: Record<string, unknown>): boolean {
  return (
    !cellText(fields[FIELD.category]) &&
    [FIELD.tasks, FIELD.shoots, FIELD.skus, FIELD.collections].every(
      (name) => linkedRecordIds(fields[name]).length === 0,
    )
  );
}

type Base = { fetchImpl: FetchLike; accessToken: string; baseToken: string; timeoutMs: number };

// Gộp các dòng 2.8 của cùng một phiếu chi về dòng của Details thứ nhất.
// Trả về id dòng giữ lại (có thể khác dòng đang xử lý) và các dòng đã xoá.
async function mergeDuplicateRows(
  base: Base,
  paymentTableId: string,
  current: LarkRecord,
  syncTableId: string,
  sync: LarkRecord,
): Promise<{ keepId: string; deleted: string[] }> {
  const requestNo = requestNoOf(sync.fields[FIELD.requestNo]);
  if (!requestNo) return { keepId: current.record_id, deleted: [] };

  const siblings = (
    await searchBaseRecords({
      ...base,
      tableId: syncTableId,
      fieldNames: [FIELD.requestNo, FIELD.sourceId, FIELD.paymentBackLink],
      filter: {
        conjunction: "and",
        conditions: [{ field_name: FIELD.requestNo, operator: "contains", value: [requestNo] }],
      },
    })
  ).filter((row) => requestNoOf(row.fields[FIELD.requestNo]) === requestNo);

  // Dòng 2.8 → dòng Details nhỏ nhất mà nó đang gắn.
  const lineOfPayment = new Map<string, number>();
  for (const row of siblings) {
    const line = detailLineOf(cellText(row.fields[FIELD.sourceId]));
    for (const paymentId of linkedRecordIds(row.fields[FIELD.paymentBackLink])) {
      lineOfPayment.set(paymentId, Math.min(line, lineOfPayment.get(paymentId) ?? Infinity));
    }
  }
  if (!lineOfPayment.has(current.record_id)) {
    lineOfPayment.set(current.record_id, detailLineOf(cellText(sync.fields[FIELD.sourceId])));
  }
  if (lineOfPayment.size <= 1) return { keepId: current.record_id, deleted: [] };

  const [keepId] = [...lineOfPayment.entries()].sort(
    (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
  )[0];
  const keep =
    keepId === current.record_id
      ? current
      : await getBaseRecord({ ...base, tableId: paymentTableId, recordId: keepId });

  const links = new Set(linkedRecordIds(keep.fields[FIELD.linkApproval]));
  const deleted: string[] = [];
  for (const paymentId of lineOfPayment.keys()) {
    if (paymentId === keepId) continue;
    const row =
      paymentId === current.record_id
        ? current
        : await getBaseRecord({ ...base, tableId: paymentTableId, recordId: paymentId });
    if (!isUntouched(row.fields)) continue; // có dữ liệu nhập tay: để nguyên
    linkedRecordIds(row.fields[FIELD.linkApproval]).forEach((id) => links.add(id));
    deleted.push(paymentId);
  }
  if (deleted.length === 0) return { keepId, deleted };

  // Gắn đủ các dòng 2.17 vào dòng giữ lại trước, rồi mới xoá dòng thừa.
  for (const row of siblings) links.add(row.record_id);
  await updateBaseRecord({
    ...base,
    tableId: paymentTableId,
    recordId: keepId,
    fields: { [FIELD.linkApproval]: [...links] },
  });
  for (const paymentId of deleted) {
    await deleteBaseRecord({ ...base, tableId: paymentTableId, recordId: paymentId });
  }
  console.info("[payment-sync] gộp", requestNo, "giữ", keepId, "xoá", deleted.join(","));
  return { keepId, deleted };
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
    const accessToken = await getTenantAccessToken(
      config.appId,
      config.appSecret,
      fetchImpl,
      Date.now(),
      SYNC_TIMEOUT_MS,
    );
    const base: Base = { fetchImpl, accessToken, baseToken, timeoutMs: SYNC_TIMEOUT_MS };

    const current = await getBaseRecord({ ...base, tableId: paymentTableId, recordId });
    const syncTableId = linkedTableId(current.fields[FIELD.linkApproval]);
    const [syncRecordId] = linkedRecordIds(current.fields[FIELD.linkApproval]);
    if (!syncTableId || !syncRecordId) return skipped("dòng 2.8 chưa có Link Approval");

    const sync = await getBaseRecord({ ...base, tableId: syncTableId, recordId: syncRecordId });

    // 1. Mỗi phiếu chi chỉ giữ 1 dòng 2.8.
    const { keepId, deleted } = await mergeDuplicateRows(base, paymentTableId, current, syncTableId, sync);
    if (keepId !== recordId) {
      return deleted.includes(recordId)
        ? { code: 0, result: "merged", msg: `đã gộp vào dòng ${keepId}`, into: keepId }
        : skipped(`dòng trùng có dữ liệu nhập tay, giữ nguyên; dòng chính là ${keepId}`);
    }
    const payment =
      deleted.length > 0 ? await getBaseRecord({ ...base, tableId: paymentTableId, recordId }) : current;
    const pf = payment.fields;

    // 2. Xác định khoản và danh sách task / ca quay.
    const plan = readMediaFields(sync.fields);
    if (plan.status === "skip") return skipped(plan.reason, deleted);
    const category = plan.category;

    const targetField = category.kind === "outsource" ? FIELD.tasks : FIELD.shoots;
    if (linkedRecordIds(pf[targetField]).length > 0 && cellText(pf[FIELD.category])) {
      return skipped("dòng 2.8 đã có dữ liệu, không ghi đè", deleted);
    }

    let taskCodes = plan.status === "ok" ? plan.taskCodes : [];
    let shootNames = plan.status === "ok" ? plan.shootNames : [];

    if (plan.status === "legacy") {
      const paymentCode = decodeSourceId(cellText(sync.fields[FIELD.sourceId]));
      if (!paymentCode) return { code: 500, result: "error", msg: "không đọc được mã phiếu chi từ SourceID" };
      const paymentInstance = await getApprovalInstance({
        fetchImpl,
        accessToken,
        instanceCode: paymentCode,
        timeoutMs: SYNC_TIMEOUT_MS,
      });
      const budgetCodes = linkedBudgetCodes(paymentInstance.form);
      if (budgetCodes.length === 0) return skipped("phiếu chi chưa gắn phiếu dự trù", deleted);
      const budgets = await Promise.all(
        budgetCodes.map(async (code) =>
          readBudget(
            (await getApprovalInstance({ fetchImpl, accessToken, instanceCode: code, timeoutMs: SYNC_TIMEOUT_MS }))
              .form,
          ),
        ),
      );
      if (!budgets.some((budget) => budget.kinds.has(category.kind))) {
        return skipped(`khoản "${category.category}" không khớp loại chi phí của phiếu dự trù`, deleted);
      }
      taskCodes = [...new Set(budgets.flatMap((budget) => budget.taskCodes))];
      shootNames = [...new Set(budgets.flatMap((budget) => budget.shootNames))];
    }

    // 3. Ghi vào dòng 2.8.
    const update: Record<string, unknown> = {};
    let missing: string[] = [];

    if (category.kind === "outsource") {
      if (taskCodes.length === 0) return skipped("phiếu chi không có task", deleted);
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
        const resolved = resolveRecords(tasks, FIELD.taskCode, taskCodes, (t) => t.trim().toUpperCase());
        missing = resolved.missing;
        if (resolved.ids.length > 0) update[FIELD.tasks] = resolved.ids;
      }
    } else {
      if (shootNames.length === 0) return skipped("phiếu chi không có ca quay", deleted);
      const shootTableId = linkedTableId(pf[FIELD.shoots]);
      if (!shootTableId) return { code: 500, result: "error", msg: "không xác định được bảng ca quay" };
      if (linkedRecordIds(pf[FIELD.shoots]).length === 0) {
        const shoots = await searchBaseRecords({ ...base, tableId: shootTableId, fieldNames: [FIELD.shootName] });
        const resolved = resolveRecords(shoots, FIELD.shootName, shootNames, normalize);
        missing = resolved.missing;
        if (resolved.ids.length > 0) update[FIELD.shoots] = resolved.ids;
      }
    }

    if (!cellText(pf[FIELD.category])) update[FIELD.category] = category.category;
    if (Object.keys(update).length === 0) return skipped("dòng 2.8 đã có dữ liệu, không ghi đè", deleted);

    await updateBaseRecord({ ...base, tableId: paymentTableId, recordId, fields: update });
    console.info("[payment-sync]", recordId, JSON.stringify(update), missing.length ? `thiếu: ${missing.join(", ")}` : "");
    return {
      code: 0,
      result: "updated",
      msg: missing.length ? `đã ghi, không tìm thấy: ${missing.join(", ")}` : "đã ghi",
      fields: update,
      missing,
      merged: deleted,
    };
  } catch (error) {
    console.error("[payment-sync]", recordId, error);
    return { code: 500, result: "error", msg: error instanceof Error ? error.message : "lỗi không xác định" };
  }
}
