import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCosts,
  summarizeCostAllocationsByTask,
} from "../features/dashboard/analytics/calculateCosts";
import {
  simulateCostAllocation,
  simulateCostAllocations,
} from "../features/dashboard/analytics/simulateCostAllocation";
import type {
  CostData,
  DateWindow,
  Task,
} from "../features/dashboard/model/types";

function task(code: string, day: number): Task {
  return {
    code,
    title: code,
    stage: "Quay",
    formatType: "Video",
    productCode: "",
    collection: "",
    expectedMinutes: 10,
    status: "Done",
    assignee: "A",
    startDate: new Date(2026, 5, day, 9),
    completedDate: null,
    inspectionDate: null,
    businessApprovalDate: null,
    handoffRating: "",
    overallRating: "",
    type: "",
    outsource: "",
  };
}

const costs: CostData = {
  proposals: [
    {
      id: "BILL-1",
      approvalLink: "APPROVED-1",
      title: "Khách sạn",
      collections: [],
      shoots: ["CA-1", "CA-2"],
      products: [],
      tasks: [],
      totalAmount: 10_000_000,
      unitAmount: 5_000_000,
      status: "Đã Thanh Toán",
    },
    {
      id: "BILL-OLD",
      approvalLink: "",
      title: "Phiếu cũ",
      collections: [],
      shoots: [],
      products: [],
      tasks: ["T1"],
      totalAmount: 99_000_000,
      unitAmount: 99_000_000,
      status: "Đã Thanh Toán",
    },
  ],
  links: {
    collections: {},
    products: {},
    shoots: {
      "CA-1": ["T1", "T2"],
      "CA-2": ["T3"],
    },
  },
};

const window: DateWindow = {
  from: new Date(2026, 5, 5),
  to: new Date(2026, 5, 5, 23, 59, 59, 999),
  hasFilter: true,
};

test("allocates unit cost to linked tasks and filters by task start date", () => {
  const result = calculateCosts(
    [task("T1", 5), task("T2", 6), task("T3", 5)],
    costs,
    window,
  );

  assert.equal(result.eligibleTotal, 10_000_000);
  assert.equal(result.allocatedTotal, 10_000_000);
  assert.equal(result.unallocatedTotal, 0);
  assert.equal(result.selectedAmount, 7_500_000);
  assert.equal(result.selectedAllocations.length, 2);
  assert.equal(result.isReconciled, true);
});

test("keeps missing linked tasks as unallocated and reconciles", () => {
  const result = calculateCosts([task("T1", 5)], costs, {
    from: null,
    to: null,
    hasFilter: false,
  });

  assert.equal(result.eligibleTotal, 10_000_000);
  assert.equal(result.allocatedTotal, 2_500_000);
  assert.equal(result.unallocatedTotal, 7_500_000);
  assert.equal(result.isReconciled, true);
});

test("flags a bill when stored unit amount does not match its total", () => {
  const mismatched = structuredClone(costs);
  mismatched.proposals[0].totalAmount = 12_000_000;
  const result = calculateCosts(
    [task("T1", 5), task("T2", 5), task("T3", 5)],
    mismatched,
    { from: null, to: null, hasFilter: false },
  );

  assert.equal(result.unitMismatchCount, 1);
  assert.equal(result.unitMismatches[0].expectedUnitAmount, 6_000_000);
  assert.equal(result.unitMismatches[0].actualUnitAmount, 5_000_000);
  assert.equal(result.isReconciled, false);
});

test("accepts cumulative whole-currency rounding across many entities", () => {
  const taskCodes = Array.from({ length: 18 }, (_, index) => `T${index + 1}`);
  const roundedCosts: CostData = {
    proposals: [
      {
        id: "BILL-ROUNDING",
        approvalLink: "APPROVED",
        title: "18 video",
        collections: [],
        shoots: [],
        products: [],
        tasks: taskCodes,
        totalAmount: 1_680_000,
        unitAmount: 93_333,
        status: "Đã Thanh Toán",
      },
    ],
    links: { collections: {}, products: {}, shoots: {} },
  };
  const result = calculateCosts(
    taskCodes.map((code) => task(code, 5)),
    roundedCosts,
    { from: null, to: null, hasFilter: false },
  );

  assert.equal(result.reconciliationDelta, 6);
  assert.equal(result.unitMismatchCount, 0);
  assert.equal(result.isReconciled, true);
});

test("groups allocation evidence by task and bill", () => {
  const t1 = task("T1", 5);
  const summaries = summarizeCostAllocationsByTask([
    {
      proposalId: "BILL-1",
      proposalTitle: "Khách sạn",
      classification: "Ca Quay",
      entity: "CA-1",
      unitAmount: 1_000_000,
      linkedTaskCount: 2,
      allocatedAmount: 500_000,
      task: t1,
    },
    {
      proposalId: "BILL-1",
      proposalTitle: "Khách sạn",
      classification: "Ca Quay",
      entity: "CA-2",
      unitAmount: 600_000,
      linkedTaskCount: 3,
      allocatedAmount: 200_000,
      task: t1,
    },
    {
      proposalId: "BILL-2",
      proposalTitle: "Di chuyển",
      classification: "Task",
      entity: "T1",
      unitAmount: 300_000,
      linkedTaskCount: 1,
      allocatedAmount: 300_000,
      task: t1,
    },
  ]);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].task.code, "T1");
  assert.equal(summaries[0].bills.length, 2);
  assert.equal(summaries[0].bills[0].allocatedAmount, 700_000);
  assert.equal(summaries[0].totalAmount, 1_000_000);
});

test("simulates one unit amount per entity and divides it evenly by task", () => {
  const result = simulateCostAllocation({
    billId: "BILL-DEMO",
    billTitle: "Chi phí ca quay",
    approvalLink: "https://approval.example/BILL-DEMO",
    status: "Đã Thanh Toán",
    classification: "Ca Quay",
    totalAmount: 2_000_000,
    unitAmount: 1_000_000,
    rows: [
      { entity: "CA-01", taskCode: "T1", taskTitle: "Task 1" },
      { entity: "CA-01", taskCode: "T2", taskTitle: "Task 2" },
      { entity: "CA-02", taskCode: "T2", taskTitle: "Task 2" },
      { entity: "CA-02", taskCode: "T3", taskTitle: "Task 3" },
    ],
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.proposalTotal, 2_000_000);
  assert.equal(result.allocatedTotal, 2_000_000);
  assert.equal(result.unallocatedTotal, 0);
  assert.equal(result.isReconciled, true);
  assert.deepEqual(
    result.summaries.map((summary) => [
      summary.task.code,
      summary.totalAmount,
    ]),
    [
      ["T2", 1_000_000],
      ["T1", 500_000],
      ["T3", 500_000],
    ],
  );
});

test("derives unit amount from the user-entered bill total", () => {
  const result = simulateCostAllocation({
    billId: "HOTEL-ABC",
    billTitle: "Khách sạn ABC hai ngày quay",
    approvalLink: "https://approval.example/hotel",
    status: "Đã Thanh Toán",
    classification: "Ca Quay",
    totalAmount: 10_000_000,
    unitAmount: 5_000_000,
    rows: [
      { entity: "Ngày quay 1", taskCode: "T1", taskTitle: "Task 1" },
      { entity: "Ngày quay 1", taskCode: "T2", taskTitle: "Task 2" },
      { entity: "Ngày quay 2", taskCode: "T3", taskTitle: "Task 3" },
    ],
  });

  assert.equal(result.proposalTotal, 10_000_000);
  assert.deepEqual(result.warnings, []);
  assert.equal(
    result.summaries.find((row) => row.task.code === "T1")?.totalAmount,
    2_500_000,
  );
  assert.equal(
    result.summaries.find((row) => row.task.code === "T3")?.totalAmount,
    5_000_000,
  );
});

test("simulator keeps the entered unit amount and warns when it differs", () => {
  const result = simulateCostAllocation({
    billId: "HOTEL-ABC",
    billTitle: "Khách sạn ABC",
    approvalLink: "https://approval.example/hotel",
    status: "Đã Thanh Toán",
    classification: "Ca Quay",
    totalAmount: 10_000_000,
    unitAmount: 4_000_000,
    rows: [
      { entity: "Ngày quay 1", taskCode: "T1", taskTitle: "Task 1" },
      { entity: "Ngày quay 2", taskCode: "T2", taskTitle: "Task 2" },
    ],
  });

  assert.equal(result.warnings.length, 1);
  assert.equal(result.allocatedTotal, 8_000_000);
  assert.equal(result.isReconciled, false);
});

test("simulator reports entities without linked tasks as unallocated", () => {
  const result = simulateCostAllocation({
    billId: "BILL-DEMO",
    billTitle: "Chi phí ca quay",
    approvalLink: "https://approval.example/BILL-DEMO",
    status: "Đã Thanh Toán",
    classification: "Ca Quay",
    totalAmount: 750_000,
    unitAmount: 750_000,
    rows: [{ entity: "CA-01", taskCode: "", taskTitle: "" }],
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.proposalTotal, 750_000);
  assert.equal(result.allocatedTotal, 0);
  assert.equal(result.unallocatedTotal, 750_000);
  assert.equal(result.isReconciled, true);
  assert.equal(result.summaries.length, 0);
});

test("combines several simulated bills on the same task", () => {
  const shared = {
    approvalLink: "https://approval.example",
    status: "Đã Thanh Toán",
    totalAmount: 1_000_000,
    unitAmount: 1_000_000,
  };
  const result = simulateCostAllocations([
    {
      ...shared,
      billId: "BILL-BST",
      billTitle: "BST",
      classification: "Bộ Sưu Tập",
      rows: [{ entity: "BST-01", taskCode: "T1", taskTitle: "Task 1" }],
    },
    {
      ...shared,
      billId: "BILL-CA",
      billTitle: "Ca quay",
      classification: "Ca Quay",
      rows: [{ entity: "CA-01", taskCode: "T1", taskTitle: "Task 1" }],
    },
  ]);

  assert.equal(result.summaries.length, 1);
  assert.equal(result.summaries[0].bills.length, 2);
  assert.equal(result.summaries[0].totalAmount, 2_000_000);
  assert.equal(result.isReconciled, true);
});
