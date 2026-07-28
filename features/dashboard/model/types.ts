// ─── Dashboard Domain Types ─────────────────────────────────────────────────

export type Task = {
  code: string;
  title: string;
  stage: string;
  formatType: string;
  productCode: string;
  collection: string;
  expectedMinutes: number;
  status: string;
  assignee: string;
  startDate: Date | null;
  receivedStartDate?: Date | null;
  completedDate: Date | null;
  inspectionDate: Date | null;
  businessApprovalDate: Date | null;
  handoffRating: string;
  overallRating: string;
  type: string;
  outsource: string;
  publicationIds?: string[];
  platform?: string;
};

export type WorkNorm = {
  formatType: string;
  recordMinutes: number;
  editMinutes: number;
  graphicMinutes: number;
  contentMinutes: number;
};

export type Feedback = {
  taskCode: string;
  at: Date | null;
  assignee: string;
};

export type PublicationPost = {
  id: string;
  scheduledAt: Date | null;
  platform: string;
  posted: boolean;
  postType: string;
  title: string;
  bookTaskCode?: string;
};

export type DashboardData = {
  tasks: Task[];
  feedback: Feedback[];
  norms: WorkNorm[];
  publications: PublicationPost[];
  fileName: string;
};

export type DateWindow = {
  from: Date | null;
  to: Date | null;
  hasFilter: boolean;
};

export type PieDatum = { label: string; value: number };
export type PieScope = "started" | "inspectionCarry" | "completionCarry" | "combined";
export type ReportDepartment = "media" | "business";
export type LeaderboardUnit = "minutes" | "hours" | "days";

export type DailyTaskDatum = {
  date: Date;
  assigned: number;
  handedSameDay: number;
  handedBacklog: number;
  backlog: number;
  assignedTasks: Task[];
  handedSameDayTasks: Task[];
  handedBacklogTasks: Task[];
  backlogTasks: Task[];
};

export type StaffTimeOfDayRow = {
  name: string;
  inspectionTimes: number[];
  completionTimes: number[];
  inspectionTasks: Task[];
  completionTasks: Task[];
};

export type SavedReport = {
  id: string;
  name: string;
  department: ReportDepartment;
  createdAt: string;
  filters: SavedReportFilters;
};

export type SavedReportFilters = {
  dateFrom: string;
  dateTo: string;
  backlogDate: string;
  collectionMonth: string;
  leaderboardUnit: LeaderboardUnit;
  pieScopes: Record<string, PieScope>;
  pieExcludeOutsource: Record<string, boolean>;
};

export type PercentileDetail = {
  title: string;
  subtitle: string;
  metricLabel: string;
  observations: Array<{ task: Task; value: number }>;
  unit: "minutes" | "days";
};

export type DetailView = {
  title: string;
  subtitle: string;
  tasks?: Task[];
  feedback?: Array<Feedback & { task?: Task }>;
  publicationEvidence?: Array<{
    post: PublicationPost;
    task?: Task;
    reason: string;
  }>;
  publicationEvidenceLabel?: string;
  taskMetric?: {
    label: string;
    value: (task: Task) => number;
    format: (value: number) => string;
    describe?: (value: number) => string;
  };
};

export type DashboardHelp = {
  title: string;
  purpose: string;
  objective?: string;
  calculation: string;
  example: string;
  note?: string;
};

export type MilestoneEvaluation = {
  label: string;
  code:
    | "onTime"
    | "late"
    | "overdue"
    | "ongoing"
    | "notStarted"
    | "excluded"
    | "invalid";
};

export type ChildCollection = {
  name: string;
  tasks: Task[];
  doneTasks: Task[];
  taskTotal: number;
  taskDone: number;
  minuteTotal: number;
  minuteDone: number;
};
