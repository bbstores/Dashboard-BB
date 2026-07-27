// ─── Dashboard Constants ────────────────────────────────────────────────────

export const SAVED_REPORTS_KEY = "bb-dashboard-saved-reports-v1";

export const COLORS = [
  "#174f3d",
  "#8fbf45",
  "#d9ff72",
  "#f3b562",
  "#d46b5f",
  "#79a7a0",
  "#7b72b7",
  "#b7a992",
  "#325d88",
  "#cd7da4",
];

export const EXCLUDED_BACKLOG_STATUSES = new Set([
  "done",
  "archived",
  "pending / cancel",
  "pending/cancel",
  "kinh doanh done",
]);

export const KPI_START_DATE = new Date(2026, 5, 15);
