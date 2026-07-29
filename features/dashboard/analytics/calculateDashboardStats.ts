import {
  endOfDay,
  inputDate,
} from "@/shared/date/dateUtils";
import {
  groupCount,
  outsourceName,
} from "../model/taskUtils";
import type {
  DashboardData,
  DateWindow,
  PieScope,
} from "../model/types";
import { calculateBacklogBreakdown } from "./calculateBacklog";
import { calculateCollections } from "./calculateCollections";
import { calculateCosts } from "./calculateCosts";
import { calculateLeaderboard } from "./calculateLeaderboard";
import { calculatePieMetrics } from "./calculatePieMetrics";
import { calculateSla } from "./calculateSla";
import { calculateStaffStats } from "./calculateStaffStats";
import { calculateTaskSelection } from "./classifyTasks";

export type DashboardStatsFilters = {
  dateWindow: DateWindow;
  collectionMonth: string;
  backlogDate: string;
};

export function calculateDashboardStats(
  data: DashboardData,
  {
    dateWindow,
    collectionMonth,
    backlogDate,
  }: DashboardStatsFilters,
) {
  const selection = calculateTaskSelection(data.tasks, dateWindow);
  const staff = calculateStaffStats(
    data,
    selection.classified,
    dateWindow,
  );
  const collections = calculateCollections(
    data.tasks,
    collectionMonth,
  );
  const backlogCutoff =
    inputDate(backlogDate, true) ?? endOfDay(new Date());
  const { backlogTasks, attentionTasks: backlogAttentionTasks } =
    calculateBacklogBreakdown(data.tasks, backlogCutoff);
  const reportingDate = dateWindow.to ?? endOfDay(new Date());
  const pieTaskSets: Record<PieScope, typeof data.tasks> = {
    started: selection.startedInWindow.map((item) => item.task),
    inspectionCarry: selection.inspectionCarryIntoWindow.map(
      (item) => item.task,
    ),
    completionCarry: selection.completionCarryIntoWindow.map(
      (item) => item.task,
    ),
    combined: selection.selectedTasks,
  };

  return {
    ...selection,
    reportingDate,
    ...staff,
    ...collections,
    costs: calculateCosts(data.tasks, data.costs, dateWindow),
    backlogTasks,
    backlogAttentionTasks,
    pieMetrics: calculatePieMetrics(pieTaskSets, reportingDate),
    sla: calculateSla(
      data,
      selection.selectedTasks,
      dateWindow,
      backlogCutoff,
      reportingDate,
    ),
    leaderboard: calculateLeaderboard(selection.classified),
    missingStartOnly: data.tasks.filter(
      (task) =>
        Boolean(task.title.trim()) &&
        !task.startDate &&
        Boolean(task.assignee),
    ).length,
    missingAssigneeOnly: data.tasks.filter(
      (task) =>
        Boolean(task.title.trim()) &&
        Boolean(task.startDate) &&
        !task.assignee,
    ).length,
    missingBoth: data.tasks.filter(
      (task) =>
        Boolean(task.title.trim()) &&
        !task.startDate &&
        !task.assignee,
    ).length,
    missingEither: data.tasks.filter(
      (task) =>
        !task.title.trim() || !task.startDate || !task.assignee,
    ).length,
    untitledTaskCount: data.tasks.filter(
      (task) => !task.title.trim(),
    ).length,
    status: groupCount(selection.selectedTasks, (task) => task.status),
    handoff: groupCount(
      selection.selectedTasks,
      (task) => task.handoffRating,
    ),
    overall: groupCount(
      selection.selectedTasks,
      (task) => task.overallRating,
    ),
    types: groupCount(selection.selectedTasks, (task) => task.type),
    stages: groupCount(selection.selectedTasks, (task) => task.stage),
    outsource: groupCount(
      selection.selectedTasks.filter((task) => Boolean(task.outsource)),
      outsourceName,
    ),
    backlog: groupCount(backlogTasks, (task) => task.status),
    backlogTotal: backlogTasks.length,
  };
}

export type DashboardStats = ReturnType<typeof calculateDashboardStats>;
