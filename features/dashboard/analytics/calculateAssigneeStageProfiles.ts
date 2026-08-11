import { assigneeNames, normalize } from "../model/taskUtils";
import type { Task } from "../model/types";
import type {
  AssigneeStageDatum,
  AssigneeStageProfile,
  ClassifiedTask,
} from "./types";

type MutableStageDatum = Omit<AssigneeStageDatum, "label">;

export function calculateAssigneeStageProfiles(
  classified: ClassifiedTask[],
): AssigneeStageProfile[] {
  const profiles = new Map<string, Map<string, MutableStageDatum>>();

  for (const item of classified) {
    if (!item.started && !item.inspectionCarry) continue;

    const stage = normalize(item.task.stage) || "Chưa xác định";
    for (const assignee of assigneeNames(item.task.assignee)) {
      const stages = profiles.get(assignee) ?? new Map();
      const current = stages.get(stage) ?? {
        value: 0,
        minutes: 0,
        tasks: [] as Task[],
      };
      current.value += 1;
      current.minutes += item.task.expectedMinutes;
      current.tasks.push(item.task);
      stages.set(stage, current);
      profiles.set(assignee, stages);
    }
  }

  return Array.from(profiles.entries())
    .map(([assignee, stages]) => {
      const stageRows = Array.from(stages.entries())
        .map(([label, values]) => ({ label, ...values }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "vi"));
      return {
        assignee,
        totalTasks: stageRows.reduce((sum, stage) => sum + stage.value, 0),
        stages: stageRows,
      };
    })
    .sort(
      (a, b) =>
        b.totalTasks - a.totalTasks || a.assignee.localeCompare(b.assignee, "vi"),
    );
}
