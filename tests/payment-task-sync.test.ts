import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryForItem,
  decodeSourceId,
  detailLineOf,
  handlePaymentSyncRequest,
  linkedBudgetCodes,
  linkedRecordIds,
  readBudget,
  readMediaFields,
} from "../features/outsource-payment/paymentTaskSync";

const PAYMENT_CODE = "367BB361-463C-4912-A36A-A0589D362CA1";
const BUDGET_CODE = "C60808C4-8D0A-40B0-B671-BD0C42C72B13";
const sourceId = (line: number) =>
  Buffer.from(`7662964318870277851:${PAYMENT_CODE}-${line}:0b81879bb2:1`).toString("base64");
const requestNo = (no: string) => ({ link: "https://applink.larksuite.com/x", text: no });

const emptyLink = (tableId: string) => [{ table_id: tableId, text_arr: [], type: "text" }];
const link = (tableId: string, ids: string[]) => [{ record_ids: ids, table_id: tableId, type: "text" }];

// Phiếu kiểu cũ (07/11/2026): phiếu chi gắn phiếu dự trù riêng.
const legacyBudgetForm = JSON.stringify([
  { type: "radioV2", name: "Loại Chi Phí", value: "Chi Phí Outsource" },
  {
    type: "checkboxV2",
    name: "Multiple select",
    value: ["Trung Test · TSK12232 · [TEST] 1 · 10.000đ", "Trung Test · TSK12233 · [TEST] 2 · 10.000đ"],
  },
]);
const legacyPaymentForm = JSON.stringify([
  { type: "connect", name: "Phiếu Dự Trù Chi Phí Media", value: [BUDGET_CODE] },
]);

type Row = { record_id: string; fields: Record<string, unknown> };

function paymentRow(id: string, syncIds: string[], extra: Record<string, unknown> = {}): Row {
  return {
    record_id: id,
    fields: {
      "Link Approval": link("tbl217", syncIds),
      "Thuộc Task Nào": emptyLink("tbl26"),
      "Thuộc Ca Quay Nào": emptyLink("tbl211"),
      "Thuộc SKU nào": emptyLink("tblSku"),
      "Bộ Sưu Tập": emptyLink("tblBst"),
      ...extra,
    },
  };
}

function syncRow(id: string, line: number, paymentIds: string[], extra: Record<string, unknown> = {}): Row {
  return {
    record_id: id,
    fields: {
      SourceID: sourceId(line),
      "Request No.": requestNo("202611110005"),
      "2.8 Đề xuất chi phí": link("tbl28", paymentIds),
      ...extra,
    },
  };
}

function fakeLark(state: { payments: Row[]; syncs: Row[] }) {
  const payments = new Map(state.payments.map((row) => [row.record_id, row]));
  const syncs = new Map(state.syncs.map((row) => [row.record_id, row]));
  const calls = { put: [] as { id: string; fields: Record<string, unknown> }[], deleted: [] as string[], approval: 0 };

  const fetchImpl = async (url: string, init?: RequestInit) => {
    const ok = (payload: unknown = {}) => new Response(JSON.stringify({ code: 0, ...(payload as object) }));
    const method = init?.method ?? "GET";
    const recordId = url.match(/\/records\/(\w+)$/)?.[1];

    if (url.includes("tenant_access_token")) return ok({ tenant_access_token: "t", expire: 7200 });
    if (url.includes("/approval/v4/instances/")) {
      calls.approval += 1;
      const form = url.includes(PAYMENT_CODE) ? legacyPaymentForm : legacyBudgetForm;
      return ok({ data: { status: "PENDING", form } });
    }
    if (url.includes("/tables/tbl28/records/") && recordId) {
      if (method === "GET") return ok({ data: { record: payments.get(recordId) } });
      if (method === "PUT") {
        calls.put.push({ id: recordId, fields: JSON.parse(String(init?.body)).fields });
        return ok({ data: {} });
      }
      if (method === "DELETE") {
        calls.deleted.push(recordId);
        payments.delete(recordId);
        return ok({ data: {} });
      }
    }
    if (url.includes("/tables/tbl217/records/search")) {
      // API tìm kiếm trả cột liên kết dạng { link_record_ids }, khác API đọc từng dòng.
      const items = [...syncs.values()].map((row) => ({
        record_id: row.record_id,
        fields: {
          ...row.fields,
          "2.8 Đề xuất chi phí": { link_record_ids: linkedRecordIds(row.fields["2.8 Đề xuất chi phí"]) },
        },
      }));
      return ok({ data: { has_more: false, items } });
    }
    if (url.includes("/tables/tbl217/records/") && recordId) {
      return ok({ data: { record: syncs.get(recordId) } });
    }
    if (url.includes("/tables/tbl26/records/search")) {
      return ok({
        data: {
          has_more: false,
          items: [
            { record_id: "recA", fields: { "Công việc": "TSK12232" } },
            { record_id: "recB", fields: { "Công việc": "TSK12233" } },
          ],
        },
      });
    }
    if (url.includes("/tables/tbl211/records/search")) {
      return ok({
        data: { has_more: false, items: [{ record_id: "recShoot", fields: { "Tên Ca Quay": [{ text: "07/11 - Ca test" }] } }] },
      });
    }
    throw new Error(`unexpected ${method} ${url}`);
  };
  return { fetchImpl, calls };
}

const settings = { appId: "app_sync", appSecret: "s", requestToken: "secret" };
const call = (recordId: string) => ({ token: "secret", base_token: "base", table_id: "tbl28", record_id: recordId });

async function quiet<T>(run: () => Promise<T>): Promise<T> {
  const info = console.info;
  console.info = () => {};
  try {
    return await run();
  } finally {
    console.info = info;
  }
}

const outsourceFields = {
  "Loại Chi Phí Media": "Chi Phí OutSource",
  "Task Thanh Toán": ["Trung Test · TSK12232 · [TEST] 1 · 10.000đ", "Trung Test · TSK12233 · [TEST] 2 · 10.000đ"],
};

test("decodes the payment code and the Details line from SourceID", () => {
  assert.equal(decodeSourceId(sourceId(1)), PAYMENT_CODE);
  assert.equal(detailLineOf(sourceId(1)), 1);
  assert.equal(detailLineOf(sourceId(3)), 3);
  assert.equal(decodeSourceId(""), null);
});

test("reads linked record ids in both Lark shapes", () => {
  assert.deepEqual(linkedRecordIds(link("tbl", ["rec1", "rec2"])), ["rec1", "rec2"]);
  assert.deepEqual(linkedRecordIds([{ id: "rec3" }]), ["rec3"]);
  assert.deepEqual(linkedRecordIds({ link_record_ids: ["rec4"] }), ["rec4"]);
  assert.deepEqual(linkedRecordIds(emptyLink("tbl")), []);
});

test("maps the paid item to a 2.8 category", () => {
  assert.deepEqual(categoryForItem("Mẫu 2"), { kind: "shoot", category: "Mẫu" });
  assert.deepEqual(categoryForItem("Địa Điểm"), { kind: "shoot", category: "Địa Điểm" });
  assert.deepEqual(categoryForItem("Makeup"), { kind: "shoot", category: "Makeup" });
  assert.deepEqual(categoryForItem("Outsource"), { kind: "outsource", category: "Outsource" });
  assert.equal(categoryForItem("Khác"), null);
});

test("reads the Media fields synced from the merged payment form", () => {
  const outsource = readMediaFields(outsourceFields);
  assert.equal(outsource.status, "ok");
  assert.ok(outsource.status === "ok");
  assert.deepEqual(outsource.taskCodes, ["TSK12232", "TSK12233"]);

  const shoot = readMediaFields({ "Loại Chi Phí Media": "Chi Phí Ca Quay", "Khoản Ca Quay": "Địa Điểm", "Tên Ca Quay": "07/11 - Ca test" });
  assert.ok(shoot.status === "ok");
  assert.equal(shoot.category.category, "Địa Điểm");
  assert.deepEqual(shoot.shootNames, ["07/11 - Ca test"]);

  // Ô khoản cũ vẫn đọc được; Loại Ca Quay mà chọn Outsource thì bỏ qua.
  assert.equal(readMediaFields({ "Loại Chi Phí Media": "Chi Phí Ca Quay", "Thanh Toán Khoản Dự Trù": "Mẫu 1" }).status, "ok");
  assert.equal(readMediaFields({ "Loại Chi Phí Media": "Chi Phí Ca Quay", "Thanh Toán Khoản Dự Trù": "Outsource" }).status, "skip");
  assert.equal(readMediaFields({ "Loại Chi Phí Media": "Khác" }).status, "skip");
  assert.equal(readMediaFields({ "Details_Thanh Toán Khoản Dự Trù": "Outsource" }).status, "legacy");
});

test("reads the form as published on 11/11/2026 (Nhóm Phiếu + Thanh Toán Khoản Ca Quay)", () => {
  const shoot = readMediaFields({
    "Nhóm Phiếu": "Phiếu Media",
    "Loại Chi Phí Media": "Chi Phí Ca Quay",
    "Thanh Toán Khoản Ca Quay": "Mẫu 2",
    "Tên Ca Quay": "07/11 - Ca test",
  });
  assert.ok(shoot.status === "ok");
  assert.equal(shoot.category.category, "Mẫu");

  // Đổi về Phiếu Thường giữa chừng: giá trị Media còn sót cũng không được dùng.
  const normal = readMediaFields({
    "Nhóm Phiếu": "Phiếu Thường",
    "Loại Chi Phí Media": "Chi Phí OutSource",
    "Task Thanh Toán": ["Trung Test · TSK12232 · x · 10.000đ"],
  });
  assert.equal(normal.status, "skip");
});

test("reads budgets of the old two-form flow", () => {
  assert.deepEqual(linkedBudgetCodes(legacyPaymentForm), [BUDGET_CODE]);
  assert.deepEqual(readBudget(legacyBudgetForm).taskCodes, ["TSK12232", "TSK12233"]);
});

test("new form, outsource: writes tasks from 2.17 without calling Approval", async () => {
  const lark = fakeLark({ payments: [paymentRow("rec28", ["s1"])], syncs: [syncRow("s1", 1, ["rec28"], outsourceFields)] });
  const result = await quiet(() => handlePaymentSyncRequest(call("rec28"), settings, lark.fetchImpl));
  assert.equal(result.result, "updated");
  assert.equal(lark.calls.approval, 0);
  assert.deepEqual(lark.calls.put, [
    { id: "rec28", fields: { "Thuộc Task Nào": ["recA", "recB"], "Hạng mục chi phí": "Outsource" } },
  ]);
});

test("new form, shoot: writes the shoot and the paid item", async () => {
  const fields = { "Loại Chi Phí Media": "Chi Phí Ca Quay", "Khoản Ca Quay": "Địa Điểm", "Tên Ca Quay": "07/11 - Ca test" };
  const lark = fakeLark({ payments: [paymentRow("rec28", ["s1"])], syncs: [syncRow("s1", 1, ["rec28"], fields)] });
  await quiet(() => handlePaymentSyncRequest(call("rec28"), settings, lark.fetchImpl));
  assert.deepEqual(lark.calls.put[0].fields, { "Thuộc Ca Quay Nào": ["recShoot"], "Hạng mục chi phí": "Địa Điểm" });
});

test("a row from Details line 2 is merged into the line 1 row and deleted", async () => {
  const lark = fakeLark({
    payments: [paymentRow("recL1", ["s1"]), paymentRow("recL2", ["s2"])],
    syncs: [syncRow("s1", 1, ["recL1"], outsourceFields), syncRow("s2", 2, ["recL2"], outsourceFields)],
  });
  const result = await quiet(() => handlePaymentSyncRequest(call("recL2"), settings, lark.fetchImpl));
  assert.equal(result.result, "merged");
  assert.deepEqual(lark.calls.deleted, ["recL2"]);
  assert.deepEqual(lark.calls.put, [{ id: "recL1", fields: { "Link Approval": ["s1", "s2"] } }]);
});

test("the line 1 row absorbs untouched duplicates, keeps edited ones, then fills itself", async () => {
  const lark = fakeLark({
    payments: [
      paymentRow("recL1", ["s1"]),
      paymentRow("recL2", ["s2"]),
      paymentRow("recL3", ["s3"], { "Hạng mục chi phí": "Khác" }),
    ],
    syncs: [
      syncRow("s1", 1, ["recL1"], outsourceFields),
      syncRow("s2", 2, ["recL2"], outsourceFields),
      syncRow("s3", 3, ["recL3"], outsourceFields),
    ],
  });
  const result = await quiet(() => handlePaymentSyncRequest(call("recL1"), settings, lark.fetchImpl));
  assert.equal(result.result, "updated");
  assert.deepEqual(lark.calls.deleted, ["recL2"]);
  assert.deepEqual(lark.calls.put[0], { id: "recL1", fields: { "Link Approval": ["s1", "s2", "s3"] } });
  assert.deepEqual(lark.calls.put[1].fields["Thuộc Task Nào"], ["recA", "recB"]);
});

test("old form: still follows the linked budget approval", async () => {
  const lark = fakeLark({
    payments: [paymentRow("rec28", ["s1"])],
    syncs: [syncRow("s1", 1, ["rec28"], { "Details_Thanh Toán Khoản Dự Trù": "Outsource" })],
  });
  const result = await quiet(() => handlePaymentSyncRequest(call("rec28"), settings, lark.fetchImpl));
  assert.equal(result.result, "updated");
  assert.equal(lark.calls.approval, 2);
  assert.deepEqual(lark.calls.put[0].fields["Thuộc Task Nào"], ["recA", "recB"]);
});

test("skips Khác, mismatched items and rows that are already filled", async () => {
  const other = fakeLark({
    payments: [paymentRow("rec28", ["s1"])],
    syncs: [syncRow("s1", 1, ["rec28"], { "Loại Chi Phí Media": "Khác" })],
  });
  assert.equal((await handlePaymentSyncRequest(call("rec28"), settings, other.fetchImpl)).result, "skipped");

  const filled = fakeLark({
    payments: [
      paymentRow("rec28", ["s1"], {
        "Thuộc Task Nào": link("tbl26", ["recManual"]),
        "Hạng mục chi phí": "Outsource",
      }),
    ],
    syncs: [syncRow("s1", 1, ["rec28"], outsourceFields)],
  });
  assert.equal((await handlePaymentSyncRequest(call("rec28"), settings, filled.fetchImpl)).result, "skipped");
  assert.equal(other.calls.put.length + filled.calls.put.length, 0);
});

test("rejects calls without the shared token", async () => {
  const lark = fakeLark({ payments: [], syncs: [] });
  const result = await handlePaymentSyncRequest({ ...call("rec28"), token: "x" }, settings, lark.fetchImpl);
  assert.equal(result.code, 401);
});
