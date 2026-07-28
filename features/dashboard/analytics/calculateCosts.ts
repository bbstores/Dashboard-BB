import type {
  CostAllocation,
  CostData,
  DateWindow,
  Task,
} from "../model/types";
import {
  inWindow,
  normalizedKey,
} from "../model/taskUtils";

type CostClassification = CostAllocation["classification"];

function normalizedLinkMap(source: Record<string, string[]>) {
  return new Map(
    Object.entries(source).map(([key, tasks]) => [
      normalizedKey(key),
      tasks,
    ]),
  );
}

export function calculateCosts(
  tasks: Task[],
  costs: CostData | undefined,
  dateWindow: DateWindow,
) {
  const taskByCode = new Map(
    tasks.map((task) => [normalizedKey(task.code), task]),
  );
  const linkMaps = {
    "Bộ Sưu Tập": normalizedLinkMap(
      costs?.links.collections ?? {},
    ),
    "Ca Quay": normalizedLinkMap(costs?.links.shoots ?? {}),
    "Mã Sản Phẩm": normalizedLinkMap(
      costs?.links.products ?? {},
    ),
  };
  const allocations: CostAllocation[] = [];
  let eligibleTotal = 0;
  let unallocatedTotal = 0;
  let invalidProposalCount = 0;
  let validProposalCount = 0;

  for (const proposal of costs?.proposals ?? []) {
    if (
      !proposal.approvalLink ||
      normalizedKey(proposal.status) !== "đã thanh toán" ||
      proposal.unitAmount <= 0
    ) {
      continue;
    }
    validProposalCount += 1;
    const groups: Array<{
      classification: CostClassification;
      entities: string[];
    }> = [
      {
        classification: "Bộ Sưu Tập",
        entities: proposal.collections,
      },
      { classification: "Ca Quay", entities: proposal.shoots },
      {
        classification: "Mã Sản Phẩm",
        entities: proposal.products,
      },
      { classification: "Task", entities: proposal.tasks },
    ];
    const selectedGroups = groups.filter(
      (group) => group.entities.length,
    );
    const selectedEntityCount = selectedGroups.reduce(
      (sum, group) => sum + group.entities.length,
      0,
    );
    const proposalTotal =
      proposal.unitAmount * Math.max(1, selectedEntityCount);
    eligibleTotal += proposalTotal;

    if (selectedGroups.length !== 1) {
      invalidProposalCount += 1;
      unallocatedTotal += proposalTotal;
      continue;
    }

    const { classification, entities } = selectedGroups[0];
    for (const entity of entities) {
      const linkedCodes =
        classification === "Task"
          ? [entity]
          : linkMaps[classification].get(normalizedKey(entity)) ?? [];
      const uniqueCodes = Array.from(
        new Set(linkedCodes.map(normalizedKey).filter(Boolean)),
      );
      if (!uniqueCodes.length) {
        unallocatedTotal += proposal.unitAmount;
        continue;
      }
      const amountPerTask = proposal.unitAmount / uniqueCodes.length;
      let allocatedCount = 0;
      for (const code of uniqueCodes) {
        const task = taskByCode.get(code);
        if (!task) continue;
        allocatedCount += 1;
        allocations.push({
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          classification,
          entity,
          unitAmount: proposal.unitAmount,
          linkedTaskCount: uniqueCodes.length,
          allocatedAmount: amountPerTask,
          task,
        });
      }
      unallocatedTotal +=
        amountPerTask * (uniqueCodes.length - allocatedCount);
    }
  }

  const allocatedTotal = allocations.reduce(
    (sum, row) => sum + row.allocatedAmount,
    0,
  );
  const selectedAllocations = allocations.filter((row) =>
    inWindow(row.task.startDate, dateWindow),
  );
  const selectedAmount = selectedAllocations.reduce(
    (sum, row) => sum + row.allocatedAmount,
    0,
  );
  const reconciliationDelta =
    eligibleTotal - allocatedTotal - unallocatedTotal;

  return {
    selectedAmount,
    selectedAllocations,
    eligibleTotal,
    allocatedTotal,
    unallocatedTotal,
    reconciliationDelta,
    validProposalCount,
    invalidProposalCount,
    isReconciled: Math.abs(reconciliationDelta) < 0.5,
  };
}
