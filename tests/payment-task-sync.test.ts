import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryForItem,
  decodeSourceId,
  handlePaymentSyncRequest,
  linkedBudgetCodes,
  linkedRecordIds,
  readBudget,
} from "../features/outsource-payment/paymentTaskSync";

const PAYMENT_CODE = "367BB361-463C-4912-A36A-A0589D362CA1";
const BUDGET_CODE = "C60808C4-8D0A-40B0-B671-BD0C42C72B13";
const SOURCE_ID = Buffer.from(`7662964318870277851:${PAYMENT_CODE}-1:0b81879bb2:1`).toString("base64");

// Cấu trúc lấy từ phiếu thử 202611070010 / PC20261107010 (07/11/2026).
const outsourceBudgetForm = JSON.stringify([
  { type: "date", name: "Date", value: "2026-11-06T17:00:00Z" },
  { type: "radioV2", name: "Loại Chi Phí", value: "Chi Phí Outsource" },
  {
    type: "mutableGroup",
    name: "Data from Base",
    value: [[
      { type: "radioV2", name: "Tên Nhân Sự", value: { value: "Trung Test", text: "Trung Test" } },
      { type: "amount", name: "Tiền Công/Task", value: 10000 },
    ]],
  },
  {
    type: "checkboxV2",
    name: "Multiple select",
    value: [
      "Trung Test · TSK12232 · [TEST] Edit video giả 1 · 10.000đ",
      "Trung Test · TSK12233 · [TEST] Edit video giả 2 · 10.000đ",
    ],
  },
]);

const shootBudgetForm = JSON.stringify([
  { type: "radioV2", name: "Loại Chi Phí", value: "Chi Phi Ca Quay" },
  {
    type: "mutableGroup",
    name: "Data from Base",
    value: [[
      { type: "radioV2", name: "Tên Ca Quay", value: { value: "04/11 - Lookbook BST Tháng 12", text: "04/11 - Lookbook BST Tháng 12" } },
      { type: "amount", name: "Chí Phí Mẫu 1", value: 500000 },
    ]],
  },
]);

const paymentForm = JSON.stringify([
  { type: "connect", name: "Phiếu Dự Trù Chi Phí Media", value: [BUDGET_CODE] },
  {
    type: "fieldList",
    name: "Details",
    value: [[
      { type: "radioV2", name: "Hạng mục chi", value: "Chi phí Phòng Media" },
      { type: "radioV2", name: "Thanh Toán Khoản Dự Trù", value: "Outsource" },
    ]],
  },
]);

const emptyLink = (tableId: string) => [{ table_id: tableId, text_arr: [], type: "text" }];

function fakeLark(options: { item: string; budgetForm: string; paymentFields?: Record<string, unknown> }) {
  const writes: { url: string; body: { fields: Record<string, unknown> } }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const json = (payload: unknown) => new Response(JSON.stringify({ code: 0, ...(payload as object) }));
    const method = init?.method ?? "GET";
    if (url.includes("tenant_access_token")) return json({ tenant_access_token: "t", expire: 7200 });
    if (url.includes(`/approval/v4/instances/${PAYMENT_CODE}`)) {
      return json({ data: { status: "PENDING", form: paymentForm } });
    }
    if (url.includes(`/approval/v4/instances/${BUDGET_CODE}`)) {
      return json({ data: { status: "APPROVED", form: options.budgetForm } });
    }
    if (method === "PUT") {
      writes.push({ url, body: JSON.parse(String(init?.body)) });
      return json({ data: {} });
    }
    if (url.includes("/tables/tbl28/records/rec28")) {
      return json({
        data: {
          record: {
            record_id: "rec28",
            fields: {
              "Link Approval": [{ record_ids: ["rec217"], table_id: "tbl217", type: "text" }],
              "Thuộc Task Nào": emptyLink("tbl26"),
              "Thuộc Ca Quay Nào": emptyLink("tbl211"),
              ...options.paymentFields,
            },
          },
        },
      });
    }
    if (url.includes("/tables/tbl217/records/rec217")) {
      return json({
        data: { record: { record_id: "rec217", fields: { SourceID: SOURCE_ID, "Details_Thanh Toán Khoản Dự Trù": options.item } } },
      });
    }
    if (url.includes("/tables/tbl26/records/search")) {
      return json({
        data: {
          has_more: false,
          items: [
            { record_id: "recA", fields: { "Công việc": "TSK12232" } },
            { record_id: "recB", fields: { "Công việc": "TSK12233" } },
            { record_id: "recC", fields: { "Công việc": "TSK99999" } },
          ],
        },
      });
    }
    if (url.includes("/tables/tbl211/records/search")) {
      return json({
        data: {
          has_more: false,
          items: [{ record_id: "recShoot", fields: { "Tên Ca Quay": [{ text: "04/11 - Lookbook BST Tháng 12" }] } }],
        },
      });
    }
    throw new Error(`unexpected ${method} ${url}`);
  };
  return { fetchImpl, writes };
}

const settings = { appId: "app_sync", appSecret: "s", requestToken: "secret" };
const request = { token: "secret", base_token: "base", table_id: "tbl28", record_id: "rec28" };

function quiet<T>(run: () => Promise<T>): Promise<T> {
  const info = console.info;
  console.info = () => {};
  return run().finally(() => {
    console.info = info;
  });
}

test("decodes the payment instance code from the synced SourceID", () => {
  assert.equal(decodeSourceId(SOURCE_ID), PAYMENT_CODE);
  assert.equal(decodeSourceId(""), null);
});

test("reads linked record ids in both Lark shapes", () => {
  assert.deepEqual(linkedRecordIds([{ record_ids: ["rec1", "rec2"], table_id: "tbl" }]), ["rec1", "rec2"]);
  assert.deepEqual(linkedRecordIds([{ id: "rec3" }]), ["rec3"]);
  assert.deepEqual(linkedRecordIds(emptyLink("tbl")), []);
});

test("maps the paid budget item to a 2.8 category", () => {
  assert.deepEqual(categoryForItem("Mẫu 2"), { kind: "shoot", category: "Mẫu" });
  assert.deepEqual(categoryForItem("Địa Điểm"), { kind: "shoot", category: "Địa Điểm" });
  assert.deepEqual(categoryForItem("Makeup"), { kind: "shoot", category: "Makeup" });
  assert.deepEqual(categoryForItem("Outsource"), { kind: "outsource", category: "Outsource" });
  assert.equal(categoryForItem("Khác"), null);
});

test("reads linked budgets from the payment form and tasks or shoots from the budget form", () => {
  assert.deepEqual(linkedBudgetCodes(paymentForm), [BUDGET_CODE]);
  const outsource = readBudget(outsourceBudgetForm);
  assert.deepEqual([...outsource.kinds], ["outsource"]);
  assert.deepEqual(outsource.taskCodes, ["TSK12232", "TSK12233"]);
  const shoot = readBudget(shootBudgetForm);
  assert.deepEqual([...shoot.kinds], ["shoot"]);
  assert.deepEqual(shoot.shootNames, ["04/11 - Lookbook BST Tháng 12"]);
});

test("writes the selected tasks and the Outsource category into the 2.8 row", async () => {
  const lark = fakeLark({ item: "Outsource", budgetForm: outsourceBudgetForm });
  const result = await quiet(() => handlePaymentSyncRequest(request, settings, lark.fetchImpl));
  assert.equal(result.result, "updated");
  assert.equal(lark.writes.length, 1);
  assert.match(lark.writes[0].url, /\/tables\/tbl28\/records\/rec28$/);
  assert.deepEqual(lark.writes[0].body.fields, {
    "Thuộc Task Nào": ["recA", "recB"],
    "Hạng mục chi phí": "Outsource",
  });
});

test("writes the shoot and the paid item for a shoot budget", async () => {
  const lark = fakeLark({ item: "Mẫu 1", budgetForm: shootBudgetForm });
  const result = await quiet(() => handlePaymentSyncRequest(request, settings, lark.fetchImpl));
  assert.equal(result.result, "updated");
  assert.deepEqual(lark.writes[0].body.fields, {
    "Thuộc Ca Quay Nào": ["recShoot"],
    "Hạng mục chi phí": "Mẫu",
  });
});

test("skips without writing when the item is Khác or does not match the budget type", async () => {
  const other = fakeLark({ item: "Khác", budgetForm: outsourceBudgetForm });
  assert.equal((await handlePaymentSyncRequest(request, settings, other.fetchImpl)).result, "skipped");
  const mismatch = fakeLark({ item: "Mẫu 1", budgetForm: outsourceBudgetForm });
  assert.equal((await handlePaymentSyncRequest(request, settings, mismatch.fetchImpl)).result, "skipped");
  assert.equal(other.writes.length + mismatch.writes.length, 0);
});

test("never overwrites tasks or category that are already filled", async () => {
  const lark = fakeLark({
    item: "Outsource",
    budgetForm: outsourceBudgetForm,
    paymentFields: {
      "Thuộc Task Nào": [{ record_ids: ["recManual"], table_id: "tbl26" }],
      "Hạng mục chi phí": "Outsource",
    },
  });
  const result = await handlePaymentSyncRequest(request, settings, lark.fetchImpl);
  assert.equal(result.result, "skipped");
  assert.equal(lark.writes.length, 0);
});

test("rejects calls without the shared token", async () => {
  const lark = fakeLark({ item: "Outsource", budgetForm: outsourceBudgetForm });
  const result = await handlePaymentSyncRequest({ ...request, token: "x" }, settings, lark.fetchImpl);
  assert.equal(result.code, 401);
  assert.equal(lark.writes.length, 0);
});
