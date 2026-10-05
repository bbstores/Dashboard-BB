import type { PublicationPost, Task } from "../../model/types";

export type PublicationSource =
  | "reup"
  | "video"
  | "graphic"
  | "unknown";

export type PublicationDailyRow = {
  date: Date;
  total: number;
  posted: number;
};

export type PublicationPlatformRow = {
  label: string;
  total: number;
  reup: number;
  video: number;
  graphic: number;
  unknown: number;
};

export type ClassifiedPublication = {
  post: PublicationPost;
  source: PublicationSource;
  task?: Task;
};

export type MediaSupplySlot = {
  key: string;
  platform: string;
  task: Task;
  source: "opening" | "delivered";
  state: "free" | "planned" | "used";
  posts: PublicationPost[];
};

export type MediaSupplyPlatformRow = {
  platform: string;
  expectedPosts: number;
  suppliedPosts: number;
  coveredPosts: number;
  usedPosts: number;
  unusedPosts: number;
  coveragePercentage: number;
};

export type PublicationNormRow = {
  platform: string;
  target: number | null;
  unit: string;
  note: string;
  expected: number | null;
  scheduled: number;
  posted: number;
  gap: number | null;
  attainment: number | null;
  status: "met" | "near" | "below" | "flexible";
  posts: PublicationPost[];
};

export type PublicationNormPerformance = {
  rows: PublicationNormRow[];
  days: number;
  from: Date | null;
  to: Date | null;
  expectedTotal: number;
  scheduledTotal: number;
  postedTotal: number;
  attainment: number;
  fixedChannelCount: number;
  flexibleChannelCount: number;
  unmappedPlatforms: Array<{
    platform: string;
    posts: PublicationPost[];
  }>;
};

export type PublicationSupplyPerformance = {
  days: number;
  expectedPosts: number;
  kpiDailyRate: number;
  openingReadyTasks: Task[];
  openingFreeTasks: Task[];
  openingPlannedUnpostedTasks: Task[];
  openingPlannedPostedTasks: Task[];
  deliveredTasks: Task[];
  availableTasks: Task[];
  supplySlots: MediaSupplySlot[];
  openingSupplySlots: MediaSupplySlot[];
  deliveredSupplySlots: MediaSupplySlot[];
  usedSupplySlots: MediaSupplySlot[];
  unusedSupplySlots: MediaSupplySlot[];
  freeSupplySlots: MediaSupplySlot[];
  plannedSupplySlots: MediaSupplySlot[];
  openingUsedSupplySlots: MediaSupplySlot[];
  deliveredUsedSupplySlots: MediaSupplySlot[];
  platformSupplyRows: MediaSupplyPlatformRow[];
  mediaCoveredPosts: number;
  legacyOldTasks: Task[];
  usedReadyTasks: Task[];
  unusedReadyTasks: Task[];
  readyWithoutDateTasks: Task[];
  postedWithoutReadyTasks: Task[];
  readyMinutes: number;
  deliveredMinutes: number;
  mediaDeliveryRate: number;
  mediaSupplyCoverage: number;
  actualPosts: number;
  mediaPosts: number;
  reupPosts: number;
  unknownPosts: number;
  postingAttainment: number;
  postingShortfall: number;
  businessUnusedGap: number;
  mediaSupplyGap: number;
  excessPosts: number;
  mediaExcessEstimate: number;
  businessExcessEstimate: number;
  unknownExcessEstimate: number;
  mediaPostEvidence: ClassifiedPublication[];
  reupPostEvidence: ClassifiedPublication[];
  unknownPostEvidence: ClassifiedPublication[];
};

export type MediaPostingResponseStatus =
  | "on-time"
  | "late"
  | "incomplete"
  | "unmatched";

export type MediaPostingResponseItem = {
  post: PublicationPost;
  task?: Task;
  status: MediaPostingResponseStatus;
  readyAt: Date | null;
  rule: "done" | "business-done";
  reason: string;
};

export type MediaPostingResponsePlatformRow = {
  platform: string;
  target: number | null;
  unit: string;
  note: string;
  expectedPosts: number | null;
  totalPosts: number;
  postedPosts: number;
  postingAttainment: number | null;
  mediaPosts: number;
  onTimePosts: number;
  mediaShare: number;
  responseRate: number;
  posts: PublicationPost[];
  items: MediaPostingResponseItem[];
};

export type MediaPostingResponsePerformance = {
  days: number;
  from: Date | null;
  to: Date | null;
  expectedPosts: number;
  totalPosts: number;
  postedPosts: number;
  postingAttainment: number;
  fixedChannelCount: number;
  flexibleChannelCount: number;
  unmappedPlatformCount: number;
  mediaPosts: number;
  onTimePosts: number;
  latePosts: number;
  incompletePosts: number;
  unmatchedPosts: number;
  mediaShare: number;
  responseRate: number;
  items: MediaPostingResponseItem[];
  platformRows: MediaPostingResponsePlatformRow[];
};
