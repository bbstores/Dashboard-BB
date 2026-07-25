import { useMemo } from "react";
import { EXCLUDED_BACKLOG_STATUSES } from "../constants";
import {
  endOfDay,
  inputDate,
  businessMinutesBetween,
  calendarDaysBetween,
  percentile,
  operationalMinute,
} from "../dateUtils";
import {
  evaluateHandoff,
  evaluateOverall,
  handoffLateMinutes,
  lateMinuteBucket,
} from "../slaUtils";
import {
  normalizedKey,
  assigneeNames,
  isVideoPublication,
  isGraphicPublication,
  normMinutesFor,
  cycleBucket,
  agingBucket,
  groupCount,
  collectionMonths,
  collectionNames,
  isCollectionDone,
  outsourceName,
  inWindow,
  classifyTask,
} from "../taskUtils";
import type { DashboardData, DateWindow, PieScope, StaffTimeOfDayRow, Task } from "../types";

export function useDashboardStats(
  data: DashboardData | null,
  dateWindow: DateWindow,
  collectionMonth: string,
  backlogDate: string,
) {
  return useMemo(() => {
    if (!data) return null;
    const classified = data.tasks.map((task) => ({
      task,
      ...classifyTask(task, dateWindow),
    }));
    const selectedTasks = classified
      .filter((item) => item.included)
      .map((item) => item.task);
    const startedInWindow = classified.filter((item) => item.started);
    const inspectionCarryIntoWindow = classified.filter(
      (item) => item.inspectionCarry,
    );
    const completionCarryIntoWindow = classified.filter(
      (item) => item.completionCarry,
    );

    const leaderboard = new Map<
      string,
      { value: number; started: number; carried: number; waiting: number }
    >();
    for (const item of classified.filter(
      (row) => row.started || row.inspectionCarry,
    )) {
      for (const name of assigneeNames(item.task.assignee)) {
        const current = leaderboard.get(name) ?? {
          value: 0,
          started: 0,
          carried: 0,
          waiting: 0,
        };
        current.value += item.task.expectedMinutes;
        const status = normalizedKey(item.task.status);
        const isWaiting =
          status === "to do" ||
          status === "todo" ||
          status === "pending / cancel" ||
          status === "pending/cancel";
        if (isWaiting) current.waiting += item.task.expectedMinutes;
        else if (item.inspectionCarry) {
          current.carried += item.task.expectedMinutes;
        }
        else current.started += item.task.expectedMinutes;
        leaderboard.set(name, current);
      }
    }

    const taskByCode = new Map(data.tasks.map((task) => [task.code, task]));
    const feedbackCount = new Map<string, number>();
    const selectedFeedback = data.feedback.filter((item) =>
      inWindow(item.at, dateWindow),
    );
    for (const item of selectedFeedback) {
      const rawNames = item.assignee || taskByCode.get(item.taskCode)?.assignee;
      if (!rawNames) continue;
      for (const name of assigneeNames(rawNames)) {
        feedbackCount.set(name, (feedbackCount.get(name) ?? 0) + 1);
      }
    }

    const people = new Set<string>();
    classified.forEach((item) => {
      if (item.included && item.task.assignee) {
        assigneeNames(item.task.assignee).forEach((name) => people.add(name));
      }
    });
    feedbackCount.forEach((_, name) => people.add(name));

    const staffRows = Array.from(people)
      .map((name) => {
        const rows = classified.filter(
          (item) =>
            assigneeNames(item.task.assignee).includes(name) && item.included,
        );
        const startedRows = rows.filter((item) => item.started);
        const inspectionCarryRows = rows.filter((item) => item.inspectionCarry);
        const completionCarryRows = rows.filter((item) => item.completionCarry);
        return {
          name,
          total: rows.length,
          totalTasks: rows.map(r => r.task),
          started: startedRows.length,
          startedTasks: startedRows.map(r => r.task),
          inspectionCarry: inspectionCarryRows.length,
          inspectionCarryTasks: inspectionCarryRows.map(r => r.task),
          completionCarry: completionCarryRows.length,
          completionCarryTasks: completionCarryRows.map(r => r.task),
          feedback: feedbackCount.get(name) ?? 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const months = Array.from(
      new Set(data.tasks.flatMap(collectionMonths)),
    ).sort((a, b) => {
      const [am, ay] = a.split(".").map(Number);
      const [bm, by] = b.split(".").map(Number);
      return by - ay || bm - am;
    });

    const collectionTasks = collectionMonth
      ? data.tasks.filter((task) =>
          collectionMonths(task).includes(collectionMonth),
        )
      : [];
    const collectionDone = collectionTasks.filter(isCollectionDone);
    const childCollectionMap = new Map<string, Task[]>();
    for (const task of collectionTasks) {
      for (const name of collectionNames(task, collectionMonth)) {
        const rows = childCollectionMap.get(name) ?? [];
        rows.push(task);
        childCollectionMap.set(name, rows);
      }
    }
    const childCollections = Array.from(childCollectionMap.entries())
      .map(([name, tasks]) => {
        const doneTasks = tasks.filter(isCollectionDone);
        return {
          name,
          tasks,
          doneTasks,
          taskTotal: tasks.length,
          taskDone: doneTasks.length,
          minuteTotal: tasks.reduce(
            (sum, task) => sum + task.expectedMinutes,
            0,
          ),
          minuteDone: doneTasks.reduce(
            (sum, task) => sum + task.expectedMinutes,
            0,
          ),
        };
      })
      .sort((a, b) => b.taskTotal - a.taskTotal);

    const backlogCutoff = inputDate(backlogDate, true) ?? endOfDay(new Date());
    const backlog = data.tasks.filter((task) => {
      if (!task.startDate || task.startDate > backlogCutoff) return false;
      return !EXCLUDED_BACKLOG_STATUSES.has(normalizedKey(task.status));
    });
    const reportingDate = dateWindow.to ?? endOfDay(new Date());
    const pieTaskSets: Record<PieScope, Task[]> = {
      started: startedInWindow.map((item) => item.task),
      inspectionCarry: inspectionCarryIntoWindow.map((item) => item.task),
      completionCarry: completionCarryIntoWindow.map((item) => item.task),
      combined: selectedTasks,
    };
    const metricsFor = (tasks: Task[]) => ({
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
    });
    const pieMetrics = Object.fromEntries(
      Object.entries(pieTaskSets).map(([scope, tasks]) => [
        scope,
        {
          all: metricsFor(tasks),
          withoutOutsource: metricsFor(
            tasks.filter((task) => !task.outsource),
          ),
        },
      ]),
    ) as Record<
      PieScope,
      {
        all: ReturnType<typeof metricsFor>;
        withoutOutsource: ReturnType<typeof metricsFor>;
      }
    >;

    const completedCohort = data.tasks.filter(
      (task) => task.completedDate && inWindow(task.completedDate, dateWindow),
    );
    const cycleRows = completedCohort
      .map((task) => ({
        task,
        days: calendarDaysBetween(task.startDate, task.completedDate),
      }))
      .filter(
        (row): row is { task: Task; days: number } => row.days !== null,
      );
    const openAgingRows = data.tasks
      .filter(
        (task) =>
          task.startDate &&
          task.startDate <= backlogCutoff &&
          !EXCLUDED_BACKLOG_STATUSES.has(normalizedKey(task.status)),
      )
      .map((task) => ({
        task,
        days: calendarDaysBetween(task.startDate, backlogCutoff),
      }))
      .filter(
        (row): row is { task: Task; days: number } =>
          row.days !== null && row.days >= 0,
      );
    const checkingToDoneRows = completedCohort
      .map((task) => ({
        task,
        minutes: businessMinutesBetween(
          task.inspectionDate,
          task.completedDate,
        ),
      }))
      .filter(
        (row): row is { task: Task; minutes: number } =>
          row.minutes !== null,
      );
    const timeOfDayPeople = new Set<string>();
    data.tasks.forEach((task) => {
      if (
        (task.inspectionDate && inWindow(task.inspectionDate, dateWindow)) ||
        (task.completedDate && inWindow(task.completedDate, dateWindow))
      ) {
        assigneeNames(task.assignee).forEach((name) => timeOfDayPeople.add(name));
      }
    });
    const staffTimeOfDayRows: StaffTimeOfDayRow[] = Array.from(timeOfDayPeople)
      .map((name) => {
        const inspectionTasks = data.tasks.filter(
          (task) =>
            task.inspectionDate &&
            inWindow(task.inspectionDate, dateWindow) &&
            assigneeNames(task.assignee).includes(name),
        );
        const completionTasks = data.tasks.filter(
          (task) =>
            task.completedDate &&
            inWindow(task.completedDate, dateWindow) &&
            assigneeNames(task.assignee).includes(name),
        );
        return {
          name,
          inspectionTimes: inspectionTasks.map((task) =>
            operationalMinute(task.inspectionDate!),
          ),
          completionTimes: completionTasks.map((task) =>
            operationalMinute(task.completedDate!),
          ),
          inspectionTasks,
          completionTasks,
        };
      })
      .sort(
        (a, b) =>
          b.inspectionTasks.length +
            b.completionTasks.length -
          (a.inspectionTasks.length + a.completionTasks.length),
      );
    const normMap = new Map(
      data.norms.map((norm) => [normalizedKey(norm.formatType), norm]),
    );
    const normStages = new Set([
      "quay",
      "chụp",
      "edit",
      "graphic design",
      "viết content",
    ]);
    const normRows = selectedTasks
      .filter((task) => normStages.has(normalizedKey(task.stage)))
      .map((task) => {
        const normMinutes = normMinutesFor(task, normMap);
        const label =
          normMinutes === null
            ? "Không map được định mức"
            : Math.abs(task.expectedMinutes - normMinutes) < 0.01
              ? "Phút dự kiến bằng chuẩn"
              : task.expectedMinutes > normMinutes
                ? "Phút dự kiến cao hơn chuẩn"
                : "Phút dự kiến thấp hơn chuẩn";
        return { task, normMinutes, label };
      });
    const mappedNormRows = normRows.filter(
      (
        row,
      ): row is {
        task: Task;
        normMinutes: number;
        label: string;
      } => row.normMinutes !== null,
    );
    const handoffEvaluations = selectedTasks.map((task) => ({
      task,
      evaluation: evaluateHandoff(task, reportingDate),
    }));
    const handedForKpi = handoffEvaluations.filter((row) =>
      ["onTime", "late"].includes(row.evaluation.code),
    );
    const onTimeHandoffs = handedForKpi.filter(
      (row) => row.evaluation.code === "onTime",
    );
    const overdueHandoffs = handoffEvaluations.filter(
      (row) => row.evaluation.code === "overdue",
    );
    const lateHandoffs = handedForKpi
      .filter((row) => row.evaluation.code === "late")
      .map((row) => ({
        task: row.task,
        minutes: handoffLateMinutes(row.task),
      }));
    return {
      selectedTasks,
      reportingDate,
      startedInWindow,
      inspectionCarryIntoWindow,
      completionCarryIntoWindow,
      classified,
      selectedFeedback,
      taskByCode,
      collectionTasks,
      collectionDone,
      childCollections,
      backlogTasks: backlog,
      pieMetrics,
      sla: {
        handoffEvaluations,
        handedForKpi,
        onTimeHandoffs,
        overdueHandoffs,
        lateHandoffs,
        handoffOnTimeRate: handedForKpi.length
          ? (onTimeHandoffs.length / handedForKpi.length) * 100
          : 0,
        handoffLateP50: percentile(
          lateHandoffs.map((row) => row.minutes),
          0.5,
        ),
        handoffLateDistribution: groupCount(
          lateHandoffs,
          (row) => lateMinuteBucket(row.minutes),
        ),
        completedCohort,
        cycleRows,
        cycleDistribution: groupCount(cycleRows, (row) =>
          cycleBucket(row.days),
        ),
        cycleP50: percentile(
          cycleRows.map((row) => row.days),
          0.5,
        ),
        cycleP90: percentile(
          cycleRows.map((row) => row.days),
          0.9,
        ),
        openAgingRows,
        agingDistribution: groupCount(openAgingRows, (row) =>
          agingBucket(row.days),
        ),
        checkingToDoneRows,
        staffTimeOfDayRows,
        checkingToDoneP50: percentile(
          checkingToDoneRows.map((row) => row.minutes),
          0.5,
        ),
        checkingToDoneP90: percentile(
          checkingToDoneRows.map((row) => row.minutes),
          0.9,
        ),
        normRows,
        normDistribution: groupCount(normRows, (row) => row.label),
        normCoverage: normRows.length
          ? (mappedNormRows.length / normRows.length) * 100
          : 0,
        normMapped: mappedNormRows.length,
        normEligible: normRows.length,
        normExpectedMinutes: mappedNormRows.reduce(
          (sum, row) => sum + row.task.expectedMinutes,
          0,
        ),
        normStandardMinutes: mappedNormRows.reduce(
          (sum, row) => sum + row.normMinutes,
          0,
        ),
      },
      leaderboard: Array.from(leaderboard.entries())
        .map(([label, values]) => ({ label, ...values }))
        .sort((a, b) => b.value - a.value),
      staffRows,
      months,
      missingStartOnly: data.tasks.filter(
        (task) => !task.startDate && Boolean(task.assignee),
      ).length,
      missingAssigneeOnly: data.tasks.filter(
        (task) => Boolean(task.startDate) && !task.assignee,
      ).length,
      missingBoth: data.tasks.filter(
        (task) => !task.startDate && !task.assignee,
      ).length,
      missingEither: data.tasks.filter(
        (task) => !task.startDate || !task.assignee,
      ).length,
      collection: {
        taskDone: collectionDone.length,
        taskTotal: collectionTasks.length,
        minuteDone: collectionDone.reduce(
          (sum, task) => sum + task.expectedMinutes,
          0,
        ),
        minuteTotal: collectionTasks.reduce(
          (sum, task) => sum + task.expectedMinutes,
          0,
        ),
      },
      status: groupCount(selectedTasks, (task) => task.status),
      handoff: groupCount(selectedTasks, (task) => task.handoffRating),
      overall: groupCount(selectedTasks, (task) => task.overallRating),
      types: groupCount(selectedTasks, (task) => task.type),
      stages: groupCount(selectedTasks, (task) => task.stage),
      outsource: groupCount(
        selectedTasks.filter((task) => Boolean(task.outsource)),
        outsourceName,
      ),
      backlog: groupCount(backlog, (task) => task.status),
      backlogTotal: backlog.length,
    };
  }, [data, dateWindow, collectionMonth, backlogDate]);
}
