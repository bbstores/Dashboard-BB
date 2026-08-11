import {
  dateKey,
  endOfDay,
  percentile,
  startOfDay,
} from "@/shared/date/dateUtils";
import { VIETNAM_HOLIDAYS_2026 } from "@/shared/date/constants";
import type {
  DashboardData,
  MediaCapacitySnapshot,
  ShootSession,
  Task,
  WorkNorm,
} from "../model/types";
import {
  assigneeNames,
  isFinalPublicationTask,
  normalizedKey,
  normMinutesFor,
} from "../model/taskUtils";

export type MediaCapacityWeek = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  workingDays: number;
  shootTasks: Task[];
  linkedShootTasks: Task[];
  unlinkedShootTasks: Task[];
  shootSessions: ShootSession[];
  sessionUnits: number;
  scheduledTaskCount: number;
  uniqueProductCount: number;
  staffSessionUnits: number;
  outputTasks: Task[];
  shootMinutes: number;
  outputMinutes: number;
  shootMapped: number;
  outputMapped: number;
  videoTasks: Task[];
  graphicTasks: Task[];
  onTimeTasks: Task[];
  lateTasks: Task[];
  unassessedTasks: Task[];
  feedbackRows: Array<
    DashboardData["feedback"][number] & { task?: Task }
  >;
};

export type MediaTrendGranularity = "day" | "week" | "month";

export type MediaTrendEvent = {
  metric: "shoot" | "output";
  date: Date;
  minutes: number;
  task: Task;
};

export type MediaTrendBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  isComplete: boolean;
  shootTasks: Task[];
  outputTasks: Task[];
  shootMinutes: number;
  outputMinutes: number;
  totalMinutes: number;
  rollingAverageMinutes: number | null;
};

export type MediaTrendSeries = {
  rows: MediaTrendBucket[];
  shootReference: CapacityReference;
  outputReference: CapacityReference;
  totalReference: CapacityReference;
  granularity: MediaTrendGranularity;
};

export type CapacityReference = {
  p25Minutes: number;
  p50Minutes: number;
  p75Minutes: number;
  percentage: number;
  bandStatus: "below" | "within" | "above" | "unavailable";
};

export type QuantityReference = {
  p25: number;
  p50: number;
  p75: number;
  percentage: number;
  bandStatus: "below" | "within" | "above" | "unavailable";
};

export type ShootTypeBaseline = {
  type: string;
  sessions: ShootSession[];
  sessionUnits: number;
  taskPerSessionP50: number;
  productPerSessionP50: number;
  staffPerSessionP50: number;
  taskPerStaffSessionP50: number;
  productPerStaffSessionP50: number;
  staffDataSessionUnits: number;
};

export type ShootTypeBaselinePlanRow = ShootTypeBaseline & {
  confidence: "insufficient" | "reference" | "stable";
  mixPercentage: number;
  expectedWeeklySessions: number;
  planningTaskPerSession: number;
  planningProductPerSession: number;
  usesOverallFallback: boolean;
};

export type ShootTypeBaselinePlan = {
  rows: ShootTypeBaselinePlanRow[];
  sessions: ShootSession[];
  weekCount: number;
  usesPartialRange: boolean;
  overallTaskPerSessionP50: number;
  overallProductPerSessionP50: number;
  overallStaffPerSessionP50: number;
  overallTaskPerStaffSessionP50: number;
  overallProductPerStaffSessionP50: number;
  staffCoveragePercentage: number;
  weeklySessionP50: number;
  weeklyTaskBaseline: number;
  weeklyProductBaseline: number;
  observedWeeklyTaskP50: number;
  observedWeeklyProductP50: number;
  modelToObservedPercentage: number;
  fallbackTypeCount: number;
};

const BASELINE_WEEK_COUNT = 8;
const OFFICIAL_BASELINE_WEEK_COUNT = 12;
const MIN_OFFICIAL_BASELINE_WEEKS = 8;
const TREND_WEEK_COUNT = 12;

export function shootSessionStaffCount(session: ShootSession) {
  if (session.staffCount && session.staffCount > 0) {
    return session.staffCount;
  }
  return new Set(session.staffNames ?? []).size;
}

function startOfWeek(value: Date) {
  const result = startOfDay(value);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function endOfWeek(value: Date) {
  const result = startOfWeek(value);
  result.setDate(result.getDate() + 6);
  return endOfDay(result);
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function weekLabel(start: Date, end: Date) {
  const short = (value: Date) =>
    `${String(value.getDate()).padStart(2, "0")}/${String(
      value.getMonth() + 1,
    ).padStart(2, "0")}`;
  return `${short(start)}–${short(end)}`;
}

function dayLabel(value: Date) {
  return `${String(value.getDate()).padStart(2, "0")}/${String(
    value.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function monthLabel(value: Date) {
  return `${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return endOfDay(
    new Date(value.getFullYear(), value.getMonth() + 1, 0),
  );
}

function trendReference(
  rows: MediaTrendBucket[],
  metric: "shootMinutes" | "outputMinutes" | "totalMinutes",
): CapacityReference {
  const values = rows
    .filter((row) => row.isComplete)
    .map((row) => row[metric]);
  if (!values.length) {
    return {
      p25Minutes: 0,
      p50Minutes: 0,
      p75Minutes: 0,
      percentage: 0,
      bandStatus: "unavailable",
    };
  }
  return {
    p25Minutes: percentile(values, 0.25),
    p50Minutes: percentile(values, 0.5),
    p75Minutes: percentile(values, 0.75),
    percentage: 0,
    bandStatus: "within",
  };
}

export function calculateMediaTrendSeries(
  events: MediaTrendEvent[],
  from: Date | null,
  to: Date | null,
  granularity: MediaTrendGranularity,
  today = new Date(),
): MediaTrendSeries {
  if (!from || !to || from > to) {
    return {
      rows: [],
      shootReference: trendReference([], "shootMinutes"),
      outputReference: trendReference([], "outputMinutes"),
      totalReference: trendReference([], "totalMinutes"),
      granularity,
    };
  }
  const rangeStart = startOfDay(from);
  const rangeEnd = endOfDay(to);
  const todayStart = startOfDay(today);
  const bucketRanges: Array<{
    naturalStart: Date;
    naturalEnd: Date;
  }> = [];

  if (granularity === "day") {
    for (
      let cursor = rangeStart;
      cursor <= rangeEnd;
      cursor = addDays(cursor, 1)
    ) {
      bucketRanges.push({
        naturalStart: startOfDay(cursor),
        naturalEnd: endOfDay(cursor),
      });
    }
  } else if (granularity === "week") {
    for (
      let cursor = startOfWeek(rangeStart);
      cursor <= rangeEnd;
      cursor = addDays(cursor, 7)
    ) {
      bucketRanges.push({
        naturalStart: cursor,
        naturalEnd: endOfWeek(cursor),
      });
    }
  } else {
    for (
      let cursor = startOfMonth(rangeStart);
      cursor <= rangeEnd;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    ) {
      bucketRanges.push({
        naturalStart: cursor,
        naturalEnd: endOfMonth(cursor),
      });
    }
  }

  const rows = bucketRanges.flatMap(
    ({ naturalStart, naturalEnd }): MediaTrendBucket[] => {
      const start =
        naturalStart < rangeStart ? rangeStart : naturalStart;
      const end = naturalEnd > rangeEnd ? rangeEnd : naturalEnd;
      const bucketEvents = events.filter(
        (event) => event.date >= start && event.date <= end,
      );
      if (
        granularity === "day" &&
        start.getDay() === 0 &&
        bucketEvents.length === 0
      ) {
        return [];
      }
      const shootEvents = bucketEvents.filter(
        (event) => event.metric === "shoot",
      );
      const outputEvents = bucketEvents.filter(
        (event) => event.metric === "output",
      );
      const shootMinutes = shootEvents.reduce(
        (total, event) => total + event.minutes,
        0,
      );
      const outputMinutes = outputEvents.reduce(
        (total, event) => total + event.minutes,
        0,
      );
      const label =
        granularity === "day"
          ? dayLabel(start)
          : granularity === "week"
            ? weekLabel(naturalStart, naturalEnd)
            : monthLabel(naturalStart);
      return [
        {
          key: `${granularity}-${dateKey(naturalStart)}`,
          label,
          start,
          end,
          isComplete:
            start.getTime() === naturalStart.getTime() &&
            end.getTime() === naturalEnd.getTime() &&
            naturalEnd < todayStart,
          shootTasks: shootEvents.map((event) => event.task),
          outputTasks: outputEvents.map((event) => event.task),
          shootMinutes,
          outputMinutes,
          totalMinutes: shootMinutes + outputMinutes,
          rollingAverageMinutes: null,
        },
      ];
    },
  );
  const completeTotals: number[] = [];
  const rowsWithRollingAverage = rows.map((row) => {
    if (!row.isComplete) return row;
    completeTotals.push(row.totalMinutes);
    if (completeTotals.length < 4) return row;
    const rollingWindow = completeTotals.slice(-4);
    return {
      ...row,
      rollingAverageMinutes:
        rollingWindow.reduce((sum, value) => sum + value, 0) /
        rollingWindow.length,
    };
  });
  return {
    rows: rowsWithRollingAverage,
    shootReference: trendReference(
      rowsWithRollingAverage,
      "shootMinutes",
    ),
    outputReference: trendReference(
      rowsWithRollingAverage,
      "outputMinutes",
    ),
    totalReference: trendReference(
      rowsWithRollingAverage,
      "totalMinutes",
    ),
    granularity,
  };
}

function isWorkingDay(value: Date) {
  return (
    value.getDay() !== 0 &&
    !VIETNAM_HOLIDAYS_2026.has(dateKey(value))
  );
}

function workingDaysBetween(start: Date, end: Date) {
  let count = 0;
  for (
    let cursor = startOfDay(start);
    cursor <= end;
    cursor = addDays(cursor, 1)
  ) {
    if (isWorkingDay(cursor)) count += 1;
  }
  return count;
}

function isExcluded(task: Task) {
  const status = normalizedKey(task.status).replace(/\s*\/\s*/g, "/");
  return (
    !task.title.trim() ||
    Boolean(normalizedKey(task.outsource)) ||
    status === "pending/cancel"
  );
}

function isShootTask(task: Task) {
  const stage = normalizedKey(task.stage);
  return stage === "quay" || stage === "chụp";
}

function eventInWeek(
  value: Date | null,
  start: Date,
  end: Date,
  cutoff: Date,
) {
  return Boolean(
    value && value >= start && value <= end && value <= cutoff,
  );
}

function isOnTime(task: Task) {
  return normalizedKey(task.handoffRating).includes(
    "bàn giao đúng hạn",
  );
}

function isLate(task: Task) {
  const rating = normalizedKey(task.handoffRating);
  return rating.includes("trễ hạn") || rating.includes("quá hạn");
}

function sumMappedMinutes(
  tasks: Task[],
  normMap: Map<string, WorkNorm>,
  standardMinutes: Map<Task, number>,
) {
  let minutes = 0;
  let mapped = 0;
  for (const task of tasks) {
    const normMinutes = normMinutesFor(task, normMap);
    if (normMinutes === null) continue;
    standardMinutes.set(task, normMinutes);
    minutes += normMinutes;
    mapped += 1;
  }
  return { minutes, mapped };
}

function calculateWeek(
  data: DashboardData,
  shootSourceTasks: Task[],
  outputSourceTasks: Task[],
  start: Date,
  cutoff: Date,
  normMap: Map<string, WorkNorm>,
  standardMinutes: Map<Task, number>,
  periodEnd?: Date,
): MediaCapacityWeek {
  const end = periodEnd ?? endOfWeek(start);
  const shootTasks = shootSourceTasks.filter(
    (task) =>
      eventInWeek(task.startDate, start, end, cutoff),
  );
  const linkedShootTasks = shootTasks.filter((task) =>
    Boolean(normalizedKey(task.shootSession)),
  );
  const linkedShootSet = new Set(linkedShootTasks);
  const unlinkedShootTasks = shootTasks.filter(
    (task) => !linkedShootSet.has(task),
  );
  const shootSessions = (data.shootSessions ?? []).filter((session) =>
    eventInWeek(session.date, start, end, cutoff),
  );
  const sessionUnits = shootSessions.reduce(
    (total, session) => total + session.sessionUnits,
    0,
  );
  const scheduledTaskCount = shootSessions.reduce(
    (total, session) => total + session.taskCount,
    0,
  );
  const uniqueProductCount = new Set(
    shootSessions.flatMap((session) => session.productCodes),
  ).size;
  const staffSessionUnits = shootSessions.reduce(
    (total, session) =>
      total + shootSessionStaffCount(session) * session.sessionUnits,
    0,
  );
  const outputTasks = outputSourceTasks.filter(
    (task) =>
      eventInWeek(task.inspectionDate, start, end, cutoff),
  );
  const shoot = sumMappedMinutes(
    shootTasks,
    normMap,
    standardMinutes,
  );
  const output = sumMappedMinutes(
    outputTasks,
    normMap,
    standardMinutes,
  );
  const videoTasks = outputTasks.filter((task) =>
    normalizedKey(task.formatType).includes("video"),
  );
  const videoSet = new Set(videoTasks);
  const graphicTasks = outputTasks.filter((task) => !videoSet.has(task));
  const onTimeTasks = outputTasks.filter(isOnTime);
  const lateTasks = outputTasks.filter(isLate);
  const assessedSet = new Set([...onTimeTasks, ...lateTasks]);
  const unassessedTasks = outputTasks.filter(
    (task) => !assessedSet.has(task),
  );
  const outputByCode = new Map(
    outputTasks.map((task) => [normalizedKey(task.code), task]),
  );
  const feedbackRows = data.feedback
    .filter(
      (row) =>
        row.at &&
        row.at >= start &&
        row.at <= end &&
        row.at <= cutoff &&
        outputByCode.has(normalizedKey(row.taskCode)),
    )
    .map((row) => ({
      ...row,
      task: outputByCode.get(normalizedKey(row.taskCode)),
    }));

  return {
    key: dateKey(start),
    label: weekLabel(start, end),
    start,
    end,
    workingDays: workingDaysBetween(start, end),
    shootTasks,
    linkedShootTasks,
    unlinkedShootTasks,
    shootSessions,
    sessionUnits,
    scheduledTaskCount,
    uniqueProductCount,
    staffSessionUnits,
    outputTasks,
    shootMinutes: shoot.minutes,
    outputMinutes: output.minutes,
    shootMapped: shoot.mapped,
    outputMapped: output.mapped,
    videoTasks,
    graphicTasks,
    onTimeTasks,
    lateTasks,
    unassessedTasks,
    feedbackRows,
  };
}

function quantityReference(
  values: number[],
  actual: number,
): QuantityReference {
  if (!values.length) {
    return {
      p25: 0,
      p50: 0,
      p75: 0,
      percentage: 0,
      bandStatus: "unavailable",
    };
  }
  const p25 = percentile(values, 0.25);
  const p50 = percentile(values, 0.5);
  const p75 = percentile(values, 0.75);
  return {
    p25,
    p50,
    p75,
    percentage: p50 ? (actual / p50) * 100 : 0,
    bandStatus:
      actual < p25 ? "below" : actual > p75 ? "above" : "within",
  };
}

function referenceForValue(
  reference: QuantityReference,
  actual: number,
): QuantityReference {
  if (reference.bandStatus === "unavailable") return reference;
  return {
    ...reference,
    percentage: reference.p50 ? (actual / reference.p50) * 100 : 0,
    bandStatus:
      actual < reference.p25
        ? "below"
        : actual > reference.p75
          ? "above"
          : "within",
  };
}

function normalizedQuantityReference(
  rows: MediaCapacityWeek[],
  focusDays: number,
  actual: number,
  metric:
    | "sessionUnits"
    | "staffSessionUnits"
    | "shootTaskCount"
    | "scheduledTaskCount"
    | "uniqueProductCount"
    | "outputTaskCount"
    | "videoTaskCount"
    | "graphicTaskCount",
) {
  if (rows.length < MIN_OFFICIAL_BASELINE_WEEKS) {
    return quantityReference([], actual);
  }
  const values = rows
    .filter((row) => row.workingDays > 0)
    .map((row) => {
      const value =
        metric === "shootTaskCount"
          ? row.shootTasks.length
          : metric === "outputTaskCount"
          ? row.outputTasks.length
          : metric === "videoTaskCount"
            ? row.videoTasks.length
            : metric === "graphicTaskCount"
              ? row.graphicTasks.length
              : row[metric];
      return (value / row.workingDays) * focusDays;
    });
  return quantityReference(values, actual);
}

function periodTaskReference(
  rows: MediaCapacityWeek[],
  focusDays: number,
  actual: number,
  metric: "shoot" | "output",
) {
  const values = rows
    .filter((row) => {
      const count =
        metric === "shoot"
          ? row.shootTasks.length
          : row.outputTasks.length;
      return row.workingDays > 0 && count > 0;
    })
    .map((row) => {
      const count =
        metric === "shoot"
          ? row.shootTasks.length
          : row.outputTasks.length;
      return (count / row.workingDays) * focusDays;
    });
  return quantityReference(values, actual);
}

function shootTypeLabel(value: string) {
  const types = value
    .split(",")
    .map(normalizedKey)
    .filter(Boolean);
  if (types.length > 1) return "Hỗn hợp";
  const type = types[0] ?? "";
  if (type.includes("bộ sưu tập")) return "Bộ Sưu Tập";
  if (type.includes("order lại")) return "Order Lại";
  if (type.includes("marketing plan")) return "Marketing Plan";
  return value.trim() || "Khác";
}

function weightedSessionPercentile(
  sessions: ShootSession[],
  valueForSession: (session: ShootSession) => number,
  ratio: number,
) {
  const rows = sessions
    .filter((session) => session.sessionUnits > 0)
    .map((session) => ({
      value: valueForSession(session),
      weight: session.sessionUnits,
    }))
    .filter(
      (row) =>
        Number.isFinite(row.value) &&
        Number.isFinite(row.weight) &&
        row.weight > 0,
    )
    .sort((left, right) => left.value - right.value);
  if (!rows.length) return 0;
  const totalWeight = rows.reduce(
    (total, row) => total + row.weight,
    0,
  );
  const threshold = Math.max(0, Math.min(1, ratio)) * totalWeight;
  let cumulativeWeight = 0;
  for (const row of rows) {
    cumulativeWeight += row.weight;
    if (cumulativeWeight >= threshold) return row.value;
  }
  return rows.at(-1)?.value ?? 0;
}

export function calculateShootTypeBaselines(
  sessions: ShootSession[],
  from: Date | null = null,
  to: Date | null = null,
) {
  const groups = new Map<string, ShootSession[]>();
  const rangeStart = from ? startOfDay(from) : null;
  const rangeEnd = to ? endOfDay(to) : null;
  for (const session of sessions) {
    if (
      !session.date ||
      (rangeStart && session.date < rangeStart) ||
      (rangeEnd && session.date > rangeEnd)
    ) {
      continue;
    }
    if (session.sessionUnits <= 0) continue;
    const type = shootTypeLabel(session.type);
    groups.set(type, [...(groups.get(type) ?? []), session]);
  }
  return Array.from(groups, ([type, sessions]): ShootTypeBaseline => {
    const sessionsWithStaff = sessions.filter(
      (session) => shootSessionStaffCount(session) > 0,
    );
    return {
      type,
      sessions,
      sessionUnits: sessions.reduce(
        (total, session) => total + session.sessionUnits,
        0,
      ),
      taskPerSessionP50: weightedSessionPercentile(
        sessions,
        (session) => session.taskCount / session.sessionUnits,
        0.5,
      ),
      productPerSessionP50: weightedSessionPercentile(
        sessions,
        (session) => session.productCount / session.sessionUnits,
        0.5,
      ),
      staffPerSessionP50: weightedSessionPercentile(
        sessionsWithStaff,
        shootSessionStaffCount,
        0.5,
      ),
      taskPerStaffSessionP50: weightedSessionPercentile(
        sessionsWithStaff,
        (session) =>
          session.taskCount /
          (session.sessionUnits * shootSessionStaffCount(session)),
        0.5,
      ),
      productPerStaffSessionP50: weightedSessionPercentile(
        sessionsWithStaff,
        (session) =>
          session.productCount /
          (session.sessionUnits * shootSessionStaffCount(session)),
        0.5,
      ),
      staffDataSessionUnits: sessionsWithStaff.reduce(
        (total, session) => total + session.sessionUnits,
        0,
      ),
    };
  }).sort((left, right) => right.sessionUnits - left.sessionUnits);
}

export function calculateShootTypeBaselinePlan(
  sessions: ShootSession[],
  from: Date | null = null,
  to: Date | null = null,
): ShootTypeBaselinePlan {
  const rows = calculateShootTypeBaselines(sessions, from, to);
  const validSessions = rows.flatMap((row) => row.sessions);
  const totalSessionUnits = rows.reduce(
    (total, row) => total + row.sessionUnits,
    0,
  );
  const overallTaskPerSessionP50 = weightedSessionPercentile(
    validSessions,
    (session) => session.taskCount / session.sessionUnits,
    0.5,
  );
  const overallProductPerSessionP50 = weightedSessionPercentile(
    validSessions,
    (session) => session.productCount / session.sessionUnits,
    0.5,
  );
  const sessionsWithStaff = validSessions.filter(
    (session) => shootSessionStaffCount(session) > 0,
  );
  const overallStaffPerSessionP50 = weightedSessionPercentile(
    sessionsWithStaff,
    shootSessionStaffCount,
    0.5,
  );
  const overallTaskPerStaffSessionP50 = weightedSessionPercentile(
    sessionsWithStaff,
    (session) =>
      session.taskCount /
      (session.sessionUnits * shootSessionStaffCount(session)),
    0.5,
  );
  const overallProductPerStaffSessionP50 = weightedSessionPercentile(
    sessionsWithStaff,
    (session) =>
      session.productCount /
      (session.sessionUnits * shootSessionStaffCount(session)),
    0.5,
  );
  const staffDataSessionUnits = sessionsWithStaff.reduce(
    (total, session) => total + session.sessionUnits,
    0,
  );
  const validDates = validSessions
    .flatMap((session) => (session.date ? [session.date] : []))
    .sort((left, right) => left.getTime() - right.getTime());
  const rangeStart = startOfDay(
    from ?? validDates[0] ?? new Date(0),
  );
  const rangeEnd = endOfDay(
    to ?? validDates.at(-1) ?? rangeStart,
  );
  let firstFullWeek = startOfWeek(rangeStart);
  if (firstFullWeek < rangeStart) {
    firstFullWeek = addDays(firstFullWeek, 7);
  }
  const fullWeekStarts: Date[] = [];
  for (
    let cursor = firstFullWeek;
    endOfWeek(cursor) <= rangeEnd;
    cursor = addDays(cursor, 7)
  ) {
    fullWeekStarts.push(cursor);
  }
  const usesPartialRange = fullWeekStarts.length === 0;
  const weekRanges = usesPartialRange
    ? [{ start: rangeStart, end: rangeEnd }]
    : fullWeekStarts.map((start) => ({
        start,
        end: endOfWeek(start),
      }));
  const weeklySessionP50 = percentile(
    weekRanges.map(({ start, end }) =>
      validSessions.reduce(
        (total, session) =>
          session.date &&
          session.date >= start &&
          session.date <= end
            ? total + session.sessionUnits
            : total,
        0,
      ),
    ),
    0.5,
  );
  const observedWeeklyTaskP50 = percentile(
    weekRanges.map(({ start, end }) =>
      validSessions.reduce(
        (total, session) =>
          session.date &&
          session.date >= start &&
          session.date <= end
            ? total + session.taskCount
            : total,
        0,
      ),
    ),
    0.5,
  );
  const observedWeeklyProductP50 = percentile(
    weekRanges.map(({ start, end }) => {
      const productCodes = new Set(
        validSessions
          .filter(
            (session) =>
              session.date &&
              session.date >= start &&
              session.date <= end,
          )
          .flatMap((session) => session.productCodes),
      );
      return productCodes.size;
    }),
    0.5,
  );
  const planRows = rows.map(
    (row): ShootTypeBaselinePlanRow => {
      const mixPercentage = totalSessionUnits
        ? (row.sessionUnits / totalSessionUnits) * 100
        : 0;
      return {
        ...row,
        confidence: "stable",
        mixPercentage,
        expectedWeeklySessions:
          weeklySessionP50 * (mixPercentage / 100),
        planningTaskPerSession: row.taskPerSessionP50,
        planningProductPerSession: row.productPerSessionP50,
        usesOverallFallback: false,
      };
    },
  );
  const weeklyTaskBaseline = planRows.reduce(
    (total, row) =>
      total +
      row.expectedWeeklySessions * row.planningTaskPerSession,
    0,
  );
  const weeklyProductBaseline = planRows.reduce(
    (total, row) =>
      total +
      row.expectedWeeklySessions * row.planningProductPerSession,
    0,
  );
  return {
    rows: planRows,
    sessions: validSessions,
    weekCount: weekRanges.length,
    usesPartialRange,
    overallTaskPerSessionP50,
    overallProductPerSessionP50,
    overallStaffPerSessionP50,
    overallTaskPerStaffSessionP50,
    overallProductPerStaffSessionP50,
    staffCoveragePercentage: totalSessionUnits
      ? (staffDataSessionUnits / totalSessionUnits) * 100
      : 0,
    weeklySessionP50,
    weeklyTaskBaseline,
    weeklyProductBaseline,
    observedWeeklyTaskP50,
    observedWeeklyProductP50,
    modelToObservedPercentage: observedWeeklyTaskP50
      ? (weeklyTaskBaseline / observedWeeklyTaskP50) * 100
      : 0,
    fallbackTypeCount: planRows.filter(
      (row) => row.usesOverallFallback,
    ).length,
  };
}

function medianReference(
  rows: MediaCapacityWeek[],
  focusDays: number,
  actualMinutes: number,
  metric: "shootMinutes" | "outputMinutes",
): CapacityReference {
  const perDay = rows
    .filter(
      (row) =>
        row.workingDays > 0 &&
        (row.shootMinutes > 0 || row.outputMinutes > 0),
    )
    .map((row) => row[metric] / row.workingDays);
  if (!perDay.length || focusDays <= 0) {
    return {
      p25Minutes: 0,
      p50Minutes: 0,
      p75Minutes: 0,
      percentage: 0,
      bandStatus: "unavailable",
    };
  }
  const p25Minutes = percentile(perDay, 0.25) * focusDays;
  const p50Minutes = percentile(perDay, 0.5) * focusDays;
  const p75Minutes = percentile(perDay, 0.75) * focusDays;
  return {
    p25Minutes,
    p50Minutes,
    p75Minutes,
    percentage: p50Minutes ? (actualMinutes / p50Minutes) * 100 : 0,
    bandStatus:
      actualMinutes < p25Minutes
        ? "below"
        : actualMinutes > p75Minutes
          ? "above"
          : "within",
  };
}

function uniqueAssignees(tasks: Task[]) {
  return new Set(
    tasks.flatMap((task) =>
      assigneeNames(task.assignee).filter(
        (name) => name !== "Chưa có assignee",
      ),
    ),
  ).size;
}

export function calculateMediaCapacity(
  data: DashboardData,
  reportingDate: Date,
  today = new Date(),
  focusRange?: { from: Date; to: Date },
) {
  const reportingWeekStart = startOfWeek(reportingDate);
  const reportingWeekEnd = endOfWeek(reportingWeekStart);
  const hasValidFocusRange = Boolean(
    focusRange && focusRange.from <= focusRange.to,
  );
  const focusStart = hasValidFocusRange
    ? startOfDay(focusRange!.from)
    : reportingWeekStart;
  const focusEnd = hasValidFocusRange
    ? endOfDay(focusRange!.to)
    : reportingWeekEnd;
  const currentDay = endOfDay(today);
  const focusCutoff =
    focusEnd < currentDay
      ? focusEnd
      : focusStart > currentDay
        ? addDays(focusStart, -1)
        : currentDay;
  const normMap = new Map(
    data.norms.map((norm) => [normalizedKey(norm.formatType), norm]),
  );
  const standardMinutes = new Map<Task, number>();
  const eligibleTasks = data.tasks.filter((task) => !isExcluded(task));
  const shootSourceTasks = eligibleTasks.filter(isShootTask);
  const outputSourceTasks = eligibleTasks.filter(isFinalPublicationTask);
  const trendEvents: MediaTrendEvent[] = [];
  for (const task of shootSourceTasks) {
    const minutes = normMinutesFor(task, normMap) ?? 0;
    if (minutes > 0) standardMinutes.set(task, minutes);
    if (task.startDate) {
      trendEvents.push({
        metric: "shoot",
        date: task.startDate,
        minutes,
        task,
      });
    }
  }
  for (const task of outputSourceTasks) {
    const minutes = normMinutesFor(task, normMap) ?? 0;
    if (minutes > 0) standardMinutes.set(task, minutes);
    if (task.inspectionDate) {
      trendEvents.push({
        metric: "output",
        date: task.inspectionDate,
        minutes,
        task,
      });
    }
  }
  const trendDates = trendEvents
    .map((event) => event.date)
    .sort((left, right) => left.getTime() - right.getTime());
  const trendWeeks = Array.from(
    { length: TREND_WEEK_COUNT },
    (_, index) => {
      const start = addDays(
        reportingWeekStart,
        (index - TREND_WEEK_COUNT + 1) * 7,
      );
      const cutoff =
        index === TREND_WEEK_COUNT - 1
          ? reportingWeekEnd < currentDay
            ? reportingWeekEnd
            : reportingWeekStart > currentDay
              ? addDays(reportingWeekStart, -1)
              : currentDay
          : endOfWeek(start);
      return calculateWeek(
        data,
        shootSourceTasks,
        outputSourceTasks,
        start,
        cutoff,
        normMap,
        standardMinutes,
      );
    },
  );
  const focusWeek = calculateWeek(
    data,
    shootSourceTasks,
    outputSourceTasks,
    focusStart,
    focusCutoff,
    normMap,
    standardMinutes,
    focusEnd,
  );
  const focusFullWeek = calculateWeek(
    data,
    shootSourceTasks,
    outputSourceTasks,
    focusStart,
    focusEnd,
    normMap,
    standardMinutes,
    focusEnd,
  );
  const baselineWeeks = trendWeeks
    .slice(0, -1)
    .slice(-BASELINE_WEEK_COUNT);
  const elapsedWorkingDays =
    focusCutoff < focusStart
      ? 0
      : workingDaysBetween(
          focusStart,
          focusCutoff < focusEnd ? focusCutoff : focusEnd,
        );
  const comparisonDays =
    focusEnd < currentDay
      ? focusWeek.workingDays
      : elapsedWorkingDays;
  const shootReference = medianReference(
    baselineWeeks,
    comparisonDays,
    focusWeek.shootMinutes,
    "shootMinutes",
  );
  const outputReference = medianReference(
    baselineWeeks,
    comparisonDays,
    focusWeek.outputMinutes,
    "outputMinutes",
  );
  const shootTaskReference = periodTaskReference(
    baselineWeeks,
    comparisonDays,
    focusWeek.shootTasks.length,
    "shoot",
  );
  const outputTaskReference = periodTaskReference(
    baselineWeeks,
    comparisonDays,
    focusWeek.outputTasks.length,
    "output",
  );
  const sessionBaselineWeeks = baselineWeeks.filter(
    (row) => row.shootSessions.length > 0 && row.sessionUnits > 0,
  );
  const outputBaselineWeeks = baselineWeeks.filter(
    (row) => row.outputTasks.length > 0,
  );
  const sessionReference = quantityReference(
    sessionBaselineWeeks.map((row) => row.sessionUnits),
    focusWeek.sessionUnits,
  );
  const scheduledTaskReference = quantityReference(
    sessionBaselineWeeks.map((row) => row.scheduledTaskCount),
    focusWeek.scheduledTaskCount,
  );
  const productReference = quantityReference(
    sessionBaselineWeeks.map((row) => row.uniqueProductCount),
    focusWeek.uniqueProductCount,
  );
  const outputCountReference = quantityReference(
    outputBaselineWeeks.map((row) => row.outputTasks.length),
    focusWeek.outputTasks.length,
  );
  const videoCountReference = quantityReference(
    outputBaselineWeeks.map((row) => row.videoTasks.length),
    focusWeek.videoTasks.length,
  );
  const graphicCountReference = quantityReference(
    outputBaselineWeeks.map((row) => row.graphicTasks.length),
    focusWeek.graphicTasks.length,
  );
  const baselineMonthStart = new Date(
    focusEnd.getFullYear(),
    focusEnd.getMonth(),
    1,
  );
  const officialBaselineLastStart = addDays(
    startOfWeek(baselineMonthStart),
    -7,
  );
  const officialBaselineWeeks = Array.from(
    { length: OFFICIAL_BASELINE_WEEK_COUNT },
    (_, index) => {
      const start = addDays(
        officialBaselineLastStart,
        (index - OFFICIAL_BASELINE_WEEK_COUNT + 1) * 7,
      );
      return calculateWeek(
        data,
        shootSourceTasks,
        outputSourceTasks,
        start,
        endOfWeek(start),
        normMap,
        standardMinutes,
      );
    },
  );
  const officialSessionWeeks = officialBaselineWeeks.filter(
    (row) => row.sessionUnits > 0,
  );
  const officialStaffWeeks = officialSessionWeeks.filter(
    (row) => row.staffSessionUnits > 0,
  );
  const officialOutputWeeks = officialBaselineWeeks.filter(
    (row) => row.outputTasks.length > 0,
  );
  const isCompleteWeek = focusEnd < currentDay;
  const forecastOutputCount =
    isCompleteWeek || elapsedWorkingDays <= 0
      ? focusWeek.outputTasks.length
      : (focusWeek.outputTasks.length / elapsedWorkingDays) *
        focusWeek.workingDays;
  const forecastVideoCount =
    isCompleteWeek || elapsedWorkingDays <= 0
      ? focusWeek.videoTasks.length
      : (focusWeek.videoTasks.length / elapsedWorkingDays) *
        focusWeek.workingDays;
  const forecastGraphicCount =
    isCompleteWeek || elapsedWorkingDays <= 0
      ? focusWeek.graphicTasks.length
      : (focusWeek.graphicTasks.length / elapsedWorkingDays) *
        focusWeek.workingDays;
  const officialSessionReference = referenceForValue(
    normalizedQuantityReference(
      officialSessionWeeks,
      focusWeek.workingDays,
      focusFullWeek.sessionUnits,
      "sessionUnits",
    ),
    focusFullWeek.sessionUnits,
  );
  const officialScheduledTaskReference = referenceForValue(
    normalizedQuantityReference(
      officialSessionWeeks,
      focusWeek.workingDays,
      focusFullWeek.scheduledTaskCount,
      "scheduledTaskCount",
    ),
    focusFullWeek.scheduledTaskCount,
  );
  const officialStaffSessionReference = referenceForValue(
    normalizedQuantityReference(
      officialStaffWeeks,
      focusWeek.workingDays,
      focusFullWeek.staffSessionUnits,
      "staffSessionUnits",
    ),
    focusFullWeek.staffSessionUnits,
  );
  const officialProductReference = referenceForValue(
    normalizedQuantityReference(
      officialSessionWeeks,
      focusWeek.workingDays,
      focusFullWeek.uniqueProductCount,
      "uniqueProductCount",
    ),
    focusFullWeek.uniqueProductCount,
  );
  const officialOutputReference = referenceForValue(
    normalizedQuantityReference(
      officialOutputWeeks,
      focusWeek.workingDays,
      forecastOutputCount,
      "outputTaskCount",
    ),
    forecastOutputCount,
  );
  const officialVideoReference = referenceForValue(
    normalizedQuantityReference(
      officialOutputWeeks,
      focusWeek.workingDays,
      forecastVideoCount,
      "videoTaskCount",
    ),
    forecastVideoCount,
  );
  const officialGraphicReference = referenceForValue(
    normalizedQuantityReference(
      officialOutputWeeks,
      focusWeek.workingDays,
      forecastGraphicCount,
      "graphicTaskCount",
    ),
    forecastGraphicCount,
  );
  const baselineShortDate = (value: Date) =>
    `${String(value.getDate()).padStart(2, "0")}/${String(
      value.getMonth() + 1,
    ).padStart(2, "0")}/${value.getFullYear()}`;
  const officialBaseline = {
    versionLabel: `${String(baselineMonthStart.getMonth() + 1).padStart(
      2,
      "0",
    )}/${baselineMonthStart.getFullYear()}`,
    windowLabel: `${baselineShortDate(
      officialBaselineWeeks[0].start,
    )}–${baselineShortDate(
      officialBaselineWeeks.at(-1)?.end ??
        endOfWeek(officialBaselineLastStart),
    )}`,
    weeks: officialBaselineWeeks,
    sessionWeekCount: officialSessionWeeks.length,
    outputWeekCount: officialOutputWeeks.length,
    sessionReference: officialSessionReference,
    scheduledTaskReference: officialScheduledTaskReference,
    staffSessionReference: officialStaffSessionReference,
    productReference: officialProductReference,
    outputReference: officialOutputReference,
    videoReference: officialVideoReference,
    graphicReference: officialGraphicReference,
    shootTypes: calculateShootTypeBaselines(
      officialBaselineWeeks.flatMap((week) => week.shootSessions),
    ),
  };
  const baselineWeekCount = baselineWeeks.filter(
    (row) => row.shootMinutes > 0 || row.outputMinutes > 0,
  ).length;
  const snapshot: Omit<MediaCapacitySnapshot, "savedAt"> = {
    version: 1,
    weekKey: focusWeek.key,
    weekLabel: focusWeek.label,
    baselineWeekCount: Math.min(
      officialBaseline.sessionWeekCount,
      officialBaseline.outputWeekCount,
    ),
    workingDays: focusWeek.workingDays,
    elapsedWorkingDays,
    shootActualMinutes: focusWeek.shootMinutes,
    shootReferenceMinutes: shootReference.p50Minutes,
    outputActualMinutes: focusWeek.outputMinutes,
    outputReferenceMinutes: outputReference.p50Minutes,
    shootTaskCount: focusWeek.shootTasks.length,
    outputTaskCount: focusWeek.outputTasks.length,
    shootLinkCoverage: focusWeek.shootTasks.length
      ? (focusWeek.linkedShootTasks.length /
          focusWeek.shootTasks.length) *
        100
      : 0,
    sessionUnits: focusWeek.sessionUnits,
    sessionReferenceUnits: officialBaseline.sessionReference.p50,
    scheduledTaskCount: focusWeek.scheduledTaskCount,
    scheduledTaskReferenceCount:
      officialBaseline.scheduledTaskReference.p50,
    uniqueProductCount: focusWeek.uniqueProductCount,
    productReferenceCount: officialBaseline.productReference.p50,
    outputCountReference: officialBaseline.outputReference.p50,
    videoTaskCount: focusWeek.videoTasks.length,
    videoReferenceCount: officialBaseline.videoReference.p50,
    graphicTaskCount: focusWeek.graphicTasks.length,
    graphicReferenceCount: officialBaseline.graphicReference.p50,
    baselineVersion: officialBaseline.versionLabel,
    forecastSessionUnits: focusFullWeek.sessionUnits,
    forecastScheduledTaskCount: focusFullWeek.scheduledTaskCount,
    forecastUniqueProductCount: focusFullWeek.uniqueProductCount,
    staffSessionUnits: focusFullWeek.staffSessionUnits,
    staffSessionReferenceUnits:
      officialBaseline.staffSessionReference.p50,
    forecastOutputTaskCount: forecastOutputCount,
  };

  return {
    focusWeek,
    trendWeeks,
    trendEvents,
    trendDateRange: {
      from: trendDates[0] ?? null,
      to: trendDates.at(-1) ?? null,
    },
    baselineWeeks,
    baselineWeekCount,
    elapsedWorkingDays,
    comparisonDays,
    shootReference,
    outputReference,
    shootTaskReference,
    outputTaskReference,
    sessionReference,
    scheduledTaskReference,
    productReference,
    outputCountReference,
    videoCountReference,
    graphicCountReference,
    officialBaseline,
    shootTypeSessions: data.shootSessions ?? [],
    focusFullWeek,
    forecastOutputCount,
    forecastVideoCount,
    forecastGraphicCount,
    isCompleteWeek,
    standardMinutes,
    activeAssignees: uniqueAssignees([
      ...focusWeek.shootTasks,
      ...focusWeek.outputTasks,
    ]),
    snapshot,
    asOfDate: focusCutoff >= focusStart ? focusCutoff : null,
  };
}

export type MediaCapacityStats = ReturnType<
  typeof calculateMediaCapacity
>;
