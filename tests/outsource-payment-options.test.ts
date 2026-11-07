import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPendingTaskOptions,
  cellText,
  handleExternalOptionsRequest,
  linkageValues,
  paginateOptions,
  parseTaskCodes,
  searchOptions,
  selectEditors,
  toExternalOptionsResponse,
} from "../features/outsource-payment/pendingTaskOptions";

function config(suffix: string) {
  return {
    appId: `app_${suffix}`,
    appSecret: "secret",
    baseToken: `base_${suffix}`,
    staffTableId: "tblStaff",
    taskTableId: "tblTask",
    requestToken: "shared-token",
  };
}

type Call = { url: string; body: Record<string, unknown>; auth?: string };

function fakeLark(pages: {
  staff: unknown[];
  tasks: unknown[][];
}) {
  const calls: Call[] = [];
  let taskPage = 0;
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, body, auth: headers.Authorization });
    const json = (payload: unknown) => new Response(JSON.stringify(payload));

    if (url.includes("tenant_access_token")) {
      return json({ code: 0, tenant_access_token: "t-123", expire: 7200 });
    }
    if (url.includes("/tables/tblStaff/")) {
      return json({ code: 0, data: { items: pages.staff, has_more: false } });
    }
    const items = pages.tasks[taskPage];
    taskPage += 1;
    const hasMore = taskPage < pages.tasks.length;
    return json({
      code: 0,
      data: { items, has_more: hasMore, page_token: hasMore ? `p${taskPage}` : undefined },
    });
  };
  return { calls, fetchImpl };
}

test("reads Lark cell values in their different shapes", () => {
  assert.equal(cellText("TSK1"), "TSK1");
  assert.equal(cellText(70000), "70000");
  assert.equal(cellText([{ type: "text", text: "Trần " }, { type: "text", text: "Thảo Nghi" }]), "Trần Thảo Nghi");
  assert.equal(cellText({ type: 1, value: [{ type: "text", text: "TSK1,TSK2" }] }), "TSK1,TSK2");
  assert.equal(cellText(null), "");
});

test("parses task codes and drops noise and duplicates", () => {
  assert.deepEqual(parseTaskCodes("TSK10392, tsk10394,,TSK10392 abc"), ["TSK10392", "TSK10394"]);
  assert.deepEqual(parseTaskCodes(""), []);
});

test("builds one option per task, sorted by editor then code, merging shared tasks", () => {
  const options = buildPendingTaskOptions(
    [
      { name: "Uyên Nhi", wagePerTask: 70000, codes: ["TSK10520", "TSK10398"] },
      { name: "Trần Thảo Nghi", wagePerTask: 70000, codes: ["TSK10398", "TSK4195"] },
    ],
    new Map([["TSK4195", "Edit video BST T10"]]),
  );

  assert.deepEqual(
    options.map((option) => option.label),
    [
      "Trần Thảo Nghi · TSK4195 · Edit video BST T10 · 70.000đ",
      "Uyên Nhi + Trần Thảo Nghi · TSK10398 · 70.000đ",
      "Uyên Nhi · TSK10520 · 70.000đ",
    ],
  );
  assert.deepEqual(options.map((option) => option.id), ["TSK4195", "TSK10398", "TSK10520"]);
});

test("formats the response the way Lark external options expect", () => {
  const response = toExternalOptionsResponse([
    { id: "TSK1", value: "TSK1", label: "A · TSK1" },
  ]);
  assert.equal(response.code, 0);
  assert.deepEqual(response.data.result.options, [{ id: "TSK1", value: "TSK1" }]);
  assert.equal(response.data.result.i18nResources[0].isDefault, true);
  assert.deepEqual(response.data.result.i18nResources[0].texts, { TSK1: "A · TSK1" });
});

test("rejects requests without the shared token and does not call Lark", async () => {
  const lark = fakeLark({ staff: [], tasks: [[]] });
  const response = await handleExternalOptionsRequest({ token: "wrong" }, config("reject"), lark.fetchImpl);
  assert.equal(response.code, 401);
  assert.equal(lark.calls.length, 0);
});

test("loads editors and task names from Base, following pagination", async () => {
  const lark = fakeLark({
    staff: [
      {
        record_id: "rec1",
        fields: {
          "Tên Nhân Sự": [{ type: "text", text: "Uyên Nhi" }],
          "Tiền Công/Task": 70000,
          "TSK Chờ Thanh Toán": { type: 1, value: [{ type: "text", text: "TSK10398,TSK10520" }] },
        },
      },
    ],
    tasks: [
      [{ record_id: "a", fields: { "Công việc": "TSK10398", "Tên Task": [{ text: "Graphic BST" }] } }],
      [{ record_id: "b", fields: { "Công việc": "TSK10520", "Tên Task": [{ text: "Edit video" }] } }],
    ],
  });

  const response = await handleExternalOptionsRequest(
    { token: "shared-token", user_id: "u1" },
    config("load"),
    lark.fetchImpl,
  );

  assert.equal(response.code, 0);
  assert.ok("data" in response);
  assert.deepEqual(Object.values(response.data.result.i18nResources[0].texts), [
    "Uyên Nhi · TSK10398 · Graphic BST · 70.000đ",
    "Uyên Nhi · TSK10520 · Edit video · 70.000đ",
  ]);

  const searches = lark.calls.filter((call) => call.url.includes("/records/search"));
  assert.equal(searches.length, 3);
  assert.ok(searches.every((call) => call.auth === "Bearer t-123"));
  assert.ok(searches.some((call) => call.url.includes("page_token=p1")));
});

test("serves cached options for a minute, then reloads", async () => {
  const lark = fakeLark({ staff: [], tasks: [[], [], []] });
  const settings = config("cache");
  const start = 1_000_000;

  await handleExternalOptionsRequest({ token: "shared-token" }, settings, lark.fetchImpl, start);
  const afterFirst = lark.calls.length;
  await handleExternalOptionsRequest({ token: "shared-token" }, settings, lark.fetchImpl, start + 30_000);
  assert.equal(lark.calls.length, afterFirst);
  await handleExternalOptionsRequest({ token: "shared-token" }, settings, lark.fetchImpl, start + 61_000);
  assert.ok(lark.calls.length > afterFirst);
});

test("returns a Lark error code when Base cannot be read", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const failing = async () => new Response(JSON.stringify({ code: 99991672, msg: "no scope" }));
    const response = await handleExternalOptionsRequest({ token: "shared-token" }, config("fail"), failing);
    assert.equal(response.code, 500);
  } finally {
    console.error = original;
  }
});

test("collects linkage values from plain, nested and JSON-encoded params", () => {
  assert.deepEqual(linkageValues({ ten: "Trần Thảo Nghi" }), ["Trần Thảo Nghi"]);
  assert.deepEqual(linkageValues({ tk: '["ou_abc"]', x: [{ name: "Uyên Nhi" }] }), [
    "ou_abc",
    "Uyên Nhi",
  ]);
  assert.deepEqual(linkageValues(undefined), []);
  assert.deepEqual(linkageValues({ ten: "" }), []);
});

test("matches editors by name without accents or by Lark account", () => {
  const editors = [
    { name: "Trần Thảo Nghi", accounts: ["ou_nghi", "Thảo nghi Trần"], wagePerTask: 70000, codes: ["TSK1"] },
    { name: "Uyên Nhi", accounts: ["ou_nhi"], wagePerTask: 70000, codes: ["TSK2"] },
  ];
  assert.deepEqual(selectEditors(editors, ["tran thao nghi"])?.map((e) => e.name), ["Trần Thảo Nghi"]);
  assert.deepEqual(selectEditors(editors, ["ou_nhi"])?.map((e) => e.name), ["Uyên Nhi"]);
  assert.deepEqual(selectEditors(editors, ["Thảo nghi Trần"])?.map((e) => e.name), ["Trần Thảo Nghi"]);
  assert.equal(selectEditors(editors, ["Người Lạ"]), null);
  assert.equal(selectEditors(editors, []), null);
});

test("returns only the selected editor's tasks when the form sends linkage params", async () => {
  const lark = fakeLark({
    staff: [
      {
        record_id: "r1",
        fields: {
          "Tên Nhân Sự": [{ text: "Trần Thảo Nghi" }],
          "Tài Khoản Lark": [{ id: "ou_nghi", name: "Thảo nghi Trần" }],
          "Tiền Công/Task": 70000,
          "TSK Chờ Thanh Toán": { type: 1, value: [{ text: "TSK1,TSK2" }] },
        },
      },
      {
        record_id: "r2",
        fields: {
          "Tên Nhân Sự": [{ text: "Uyên Nhi" }],
          "Tiền Công/Task": 70000,
          "TSK Chờ Thanh Toán": { type: 1, value: [{ text: "TSK3" }] },
        },
      },
    ],
    tasks: [[]],
  });
  const original = console.info;
  console.info = () => {};
  try {
    const settings = config("linkage");
    const filtered = await handleExternalOptionsRequest(
      { token: "shared-token", linkage_params: { ten_nhan_su: "Trần Thảo Nghi" } },
      settings,
      lark.fetchImpl,
    );
    assert.ok("data" in filtered);
    assert.deepEqual(filtered.data.result.options.map((o) => o.id), ["TSK1", "TSK2"]);

    const unknown = await handleExternalOptionsRequest(
      { token: "shared-token", linkage_params: { ten_nhan_su: "opt_xyz" } },
      settings,
      lark.fetchImpl,
    );
    assert.ok("data" in unknown);
    assert.deepEqual(unknown.data.result.options.map((o) => o.id), ["TSK1", "TSK2", "TSK3"]);
  } finally {
    console.info = original;
  }
});

const sampleOptions = [
  { id: "TSK1", value: "TSK1", label: "Trần Thảo Nghi · TSK1 · Edit Video Tripod · 70.000đ" },
  { id: "TSK2", value: "TSK2", label: "Uyên Nhi · TSK2 · Edit Video Voice · 70.000đ" },
  { id: "TSK3", value: "TSK3", label: "Uyên Nhi · TSK3 · Edit Video Tripod · 70.000đ" },
];

test("searches option labels without accents and requires every word", () => {
  assert.deepEqual(searchOptions(sampleOptions, "uyen").map((o) => o.id), ["TSK2", "TSK3"]);
  assert.deepEqual(searchOptions(sampleOptions, "Uyên tripod").map((o) => o.id), ["TSK3"]);
  assert.deepEqual(searchOptions(sampleOptions, "tsk1").map((o) => o.id), ["TSK1"]);
  assert.equal(searchOptions(sampleOptions, "  ").length, 3);
});

test("paginates with an offset token and only returns nextPageToken when more remain", () => {
  const first = paginateOptions(sampleOptions, "", 2);
  assert.deepEqual(first.options.map((o) => o.id), ["TSK1", "TSK2"]);
  assert.deepEqual(first.page, { hasMore: true, nextPageToken: "2" });
  const second = paginateOptions(sampleOptions, "2", 2);
  assert.deepEqual(second.options.map((o) => o.id), ["TSK3"]);
  assert.deepEqual(second.page, { hasMore: false });
});

test("V2 requests get search results with paging fields, V1 requests get everything", async () => {
  const lark = fakeLark({
    staff: [
      {
        record_id: "r1",
        fields: {
          "Tên Nhân Sự": [{ text: "Trần Thảo Nghi" }],
          "Tiền Công/Task": 70000,
          "TSK Chờ Thanh Toán": { type: 1, value: [{ text: "TSK1" }] },
        },
      },
      {
        record_id: "r2",
        fields: {
          "Tên Nhân Sự": [{ text: "Uyên Nhi" }],
          "Tiền Công/Task": 70000,
          "TSK Chờ Thanh Toán": { type: 1, value: [{ text: "TSK2,TSK3" }] },
        },
      },
    ],
    tasks: [[]],
  });
  const settings = config("v2");
  const v2 = await handleExternalOptionsRequest(
    { token: "shared-token", query: "uyen nhi", page_token: "", locale: "en_us" },
    settings,
    lark.fetchImpl,
  );
  assert.ok("data" in v2);
  assert.deepEqual(v2.data.result.options.map((o) => o.id), ["TSK2", "TSK3"]);
  assert.equal(v2.data.result.hasMore, false);

  const v1 = await handleExternalOptionsRequest({ token: "shared-token" }, settings, lark.fetchImpl);
  assert.ok("data" in v1);
  assert.equal(v1.data.result.options.length, 3);
  assert.equal("hasMore" in v1.data.result, false);
});
