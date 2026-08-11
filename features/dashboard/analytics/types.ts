import type {
  Feedback,
  PieDatum,
  PieScope,
  Task,
} from "../model/types";

export type ClassifiedTask = {
  task: Task;
  included: boolean;
  started: boolean;
  inspectionCarry: boolean;
  completionCarry: boolean;
};

export type TaskSelection = {
  classified: ClassifiedTask[];
  selectedTasks: Task[];
  startedInWindow: ClassifiedTask[];
  inspectionCarryIntoWindow: ClassifiedTask[];
  completionCarryIntoWindow: ClassifiedTask[];
};

export type LeaderboardRow = {
  label: string;
  value: number;
  started: number;
  carried: number;
  waiting: number;
  tasks: Task[];
  startedTasks: Task[];
  carriedTasks: Task[];
  waitingTasks: Task[];
};

export type AssigneeStageDatum = {
  label: string;
  value: number;
  minutes: number;
  tasks: Task[];
};

export type AssigneeStageProfile = {
  assignee: string;
  totalTasks: number;
  stages: AssigneeStageDatum[];
};

type StaffRow = {
  name: string;
  total: number;
  totalTasks: Task[];
  started: number;
  startedTasks: Task[];
  inspectionCarry: number;
  inspectionCarryTasks: Task[];
  completionCarry: number;
  completionCarryTasks: Task[];
  feedback: number;
};

export type StaffStats = {
  selectedFeedback: Feedback[];
  taskByCode: Map<string, Task>;
  staffRows: StaffRow[];
};

export type PieMetricSet = {
  tasks: Task[];
  status: PieDatum[];
  handoff: PieDatum[];
  overall: PieDatum[];
  stages: PieDatum[];
  outsource: PieDatum[];
  videoFormats: PieDatum[];
  videoTypes: PieDatum[];
  graphicFormats: PieDatum[];
  graphicTypes: PieDatum[];
};

export type PieMetrics = Record<
  PieScope,
  {
    all: PieMetricSet;
    withoutOutsource: PieMetricSet;
  }
>;

export type NormRow = {
  task: Task;
  normMinutes: number | null;
  label: string;
};
