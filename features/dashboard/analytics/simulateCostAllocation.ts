import type {
  CostAllocation,
  CostTaskSummary,
  Task,
} from "../model/types";
import { normalize, normalizedKey } from "../model/taskUtils";
import { summarizeCostAllocationsByTask } from "./calculateCosts";

export type CostSimulationRow = {
  entity: string;
  taskCode: string;
  taskTitle: string;
};

export type CostSimulationInput = {
  billId: string;
  billTitle: string;
  approvalLink: string;
  status: string;
  classification: CostAllocation["classification"];
  unitAmount: number;
  rows: CostSimulationRow[];
};

export type CostSimulationResult = {
  errors: string[];
  summaries: CostTaskSummary[];
  proposalTotal: number;
  allocatedTotal: number;
  unallocatedTotal: number;
  isReconciled: boolean;
};

export function simulateCostAllocations(
  inputs: CostSimulationInput[],
): CostSimulationResult {
  const results = inputs.map(simulateCostAllocation);
  const errors = results.flatMap((result, index) =>
    result.errors.map(
      (error) => `${inputs[index]?.billId || `Bill ${index + 1}`}: ${error}`,
    ),
  );
  const allocations: CostAllocation[] = results.flatMap((result) =>
    result.summaries.flatMap((summary) =>
      summary.bills.map((bill) => ({
        proposalId: bill.id,
        proposalTitle: bill.title,
        classification: "Task",
        entity: summary.task.code,
        unitAmount: bill.allocatedAmount,
        linkedTaskCount: 1,
        allocatedAmount: bill.allocatedAmount,
        task: summary.task,
      })),
    ),
  );
  const proposalTotal = results.reduce(
    (sum, result) => sum + result.proposalTotal,
    0,
  );
  const allocatedTotal = results.reduce(
    (sum, result) => sum + result.allocatedTotal,
    0,
  );
  const unallocatedTotal = results.reduce(
    (sum, result) => sum + result.unallocatedTotal,
    0,
  );

  return {
    errors,
    summaries: summarizeCostAllocationsByTask(allocations),
    proposalTotal,
    allocatedTotal,
    unallocatedTotal,
    isReconciled:
      results.every((result) => result.isReconciled) &&
      Math.abs(proposalTotal - allocatedTotal - unallocatedTotal) < 0.5,
  };
}

function simulatedTask(code: string, title: string): Task {
  return {
    code,
    title,
    stage: "",
    formatType: "",
    productCode: "",
    collection: "",
    expectedMinutes: 0,
    status: "",
    assignee: "",
    startDate: null,
    completedDate: null,
    inspectionDate: null,
    businessApprovalDate: null,
    handoffRating: "",
    overallRating: "",
    type: "",
    outsource: "",
  };
}

export function simulateCostAllocation(
  rawInput: CostSimulationInput,
): CostSimulationResult {
  const input = {
    ...rawInput,
    billId: normalize(rawInput.billId),
    billTitle: normalize(rawInput.billTitle),
    approvalLink: normalize(rawInput.approvalLink),
  };
  const errors: string[] = [];
  if (!input.billId) errors.push("Thiếu mã bill.");
  if (!input.billTitle) errors.push("Thiếu tên bill.");
  if (!input.approvalLink) errors.push("Thiếu Link Approval.");
  if (normalizedKey(input.status) !== "đã thanh toán") {
    errors.push("Phiếu chưa ở trạng thái Đã Thanh Toán.");
  }
  if (!Number.isFinite(input.unitAmount) || input.unitAmount <= 0) {
    errors.push("Thành Tiền / đơn vị phải lớn hơn 0.");
  }

  const entities = new Map<
    string,
    { name: string; tasks: Map<string, Task> }
  >();
  for (const row of input.rows) {
    const entityName = normalize(row.entity);
    if (!entityName) continue;
    const entityKey = normalizedKey(entityName);
    const entity = entities.get(entityKey) ?? {
      name: entityName,
      tasks: new Map<string, Task>(),
    };
    const taskCode = normalize(row.taskCode);
    if (taskCode) {
      const taskKey = normalizedKey(taskCode);
      entity.tasks.set(
        taskKey,
        simulatedTask(taskCode, normalize(row.taskTitle)),
      );
    }
    entities.set(entityKey, entity);
  }
  if (!entities.size) {
    errors.push("Cần ít nhất một đơn vị phân bổ.");
  }

  const proposalTotal = input.unitAmount * entities.size;
  if (errors.length) {
    return {
      errors,
      summaries: [],
      proposalTotal,
      allocatedTotal: 0,
      unallocatedTotal: proposalTotal,
      isReconciled: true,
    };
  }

  const allocations: CostAllocation[] = [];
  let unallocatedTotal = 0;
  for (const entity of entities.values()) {
    const tasks = [...entity.tasks.values()];
    if (!tasks.length) {
      unallocatedTotal += input.unitAmount;
      continue;
    }
    const amountPerTask = input.unitAmount / tasks.length;
    for (const task of tasks) {
      allocations.push({
        proposalId: input.billId,
        proposalTitle: input.billTitle,
        classification: input.classification,
        entity: entity.name,
        unitAmount: input.unitAmount,
        linkedTaskCount: tasks.length,
        allocatedAmount: amountPerTask,
        task,
      });
    }
  }
  const summaries = summarizeCostAllocationsByTask(allocations);
  const allocatedTotal = summaries.reduce(
    (sum, row) => sum + row.totalAmount,
    0,
  );
  const reconciliationDelta =
    proposalTotal - allocatedTotal - unallocatedTotal;

  return {
    errors,
    summaries,
    proposalTotal,
    allocatedTotal,
    unallocatedTotal,
    isReconciled: Math.abs(reconciliationDelta) < 0.5,
  };
}
