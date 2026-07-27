import { classifyTask } from "../model/taskUtils";
import type { DateWindow, Task } from "../model/types";
import type { TaskSelection } from "./types";

export function calculateTaskSelection(
  tasks: Task[],
  dateWindow: DateWindow,
): TaskSelection {
  const classified = tasks.map((task) => ({
    task,
    ...classifyTask(task, dateWindow),
  }));

  return {
    classified,
    selectedTasks: classified
      .filter((item) => item.included)
      .map((item) => item.task),
    startedInWindow: classified.filter((item) => item.started),
    inspectionCarryIntoWindow: classified.filter(
      (item) => item.inspectionCarry,
    ),
    completionCarryIntoWindow: classified.filter(
      (item) => item.completionCarry,
    ),
  };
}
