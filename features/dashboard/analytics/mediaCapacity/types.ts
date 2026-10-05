import type { DashboardData, ShootSession, Task } from "../../model/types";

export type MediaCapacityWeek = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  workingDays: number;
  shootTasks: Task[];
  shootOpeningBacklogTasks: Task[];
  shootHandedTasks: Task[];
  shootHandedCarryTasks: Task[];
  shootHandedNewTasks: Task[];
  shootClosingBacklogTasks: Task[];
  linkedShootTasks: Task[];
  unlinkedShootTasks: Task[];
  shootSessions: ShootSession[];
  sessionUnits: number;
  scheduledTaskCount: number;
  uniqueProductCount: number;
  uniqueStaffCount: number;
  outputTasks: Task[];
  outputOpeningBacklogTasks: Task[];
  outputStartedTasks: Task[];
  outputHandedCarryTasks: Task[];
  outputHandedNewTasks: Task[];
  outputClosingBacklogTasks: Task[];
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

export type ShootContributionMetric = "time" | "tasks" | "products";

export type ShootStaffContributionRow = {
  staffName: string;
  sessions: ShootSession[];
  sessionCount: number;
  participatedSessionUnits: number;
  timeValue: number;
  taskValue: number;
  productValue: number;
  timePercentage: number;
  taskPercentage: number;
  productPercentage: number;
};

export type ShootStaffContributionStats = {
  rows: ShootStaffContributionRow[];
  sessionCount: number;
  namedSessionCount: number;
  coveragePercentage: number;
  totalSessionUnits: number;
  attributedSessionUnits: number;
  attributedTaskCount: number;
  attributedProductCount: number;
};

export type ShootStaffTaskMinutesRow = {
  staffName: string;
  tasks: Task[];
  minutes: number;
};

export type ShootSessionTaskMinutes = {
  session: ShootSession;
  linkedTasks: Task[];
  staffRows: ShootStaffTaskMinutesRow[];
  totalMinutes: number;
};
