import {
  groupCount,
  isGraphicPublication,
  isVideoPublication,
  outsourceName,
} from "../model/taskUtils";
import {
  evaluateHandoff,
  evaluateOverall,
} from "../model/slaUtils";
import type { PieScope, Task } from "../model/types";
import type { PieMetricSet, PieMetrics } from "./types";

function calculateMetricSet(
  tasks: Task[],
  reportingDate: Date,
): PieMetricSet {
  return {
    tasks,
    status: groupCount(tasks, (task) => task.status),
    handoff: groupCount(
      tasks,
      (task) => evaluateHandoff(task, reportingDate).label,
    ),
    overall: groupCount(
      tasks,
      (task) => evaluateOverall(task, reportingDate).label,
    ),
    stages: groupCount(tasks, (task) => task.stage),
    outsource: groupCount(
      tasks.filter((task) => Boolean(task.outsource)),
      outsourceName,
    ),
    videoFormats: groupCount(
      tasks.filter(isVideoPublication),
      (task) => task.formatType,
    ),
    videoTypes: groupCount(
      tasks.filter(isVideoPublication),
      (task) => task.type,
    ),
    graphicFormats: groupCount(
      tasks.filter(isGraphicPublication),
      (task) => task.formatType,
    ),
    graphicTypes: groupCount(
      tasks.filter(isGraphicPublication),
      (task) => task.type,
    ),
  };
}

export function calculatePieMetrics(
  taskSets: Record<PieScope, Task[]>,
  reportingDate: Date,
): PieMetrics {
  return Object.fromEntries(
    Object.entries(taskSets).map(([scope, tasks]) => [
      scope,
      {
        all: calculateMetricSet(tasks, reportingDate),
        withoutOutsource: calculateMetricSet(
          tasks.filter((task) => !task.outsource),
          reportingDate,
        ),
      },
    ]),
  ) as PieMetrics;
}
