import type {
  LeaderboardUnit,
  PieScope,
  ReportDepartment,
  SavedReport,
  SavedReportFilters,
} from "../model/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): value is Record<string, T> {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (item) =>
      typeof item === "string" &&
      allowedValues.includes(item as T),
  );
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "boolean")
  );
}

function isSavedReportFilters(value: unknown): value is SavedReportFilters {
  if (!isRecord(value)) return false;
  const leaderboardUnits: LeaderboardUnit[] = [
    "minutes",
    "hours",
    "days",
  ];
  const pieScopes: PieScope[] = [
    "started",
    "inspectionCarry",
    "completionCarry",
    "combined",
  ];
  return (
    typeof value.dateFrom === "string" &&
    typeof value.dateTo === "string" &&
    typeof value.backlogDate === "string" &&
    typeof value.collectionMonth === "string" &&
    typeof value.leaderboardUnit === "string" &&
    leaderboardUnits.includes(value.leaderboardUnit as LeaderboardUnit) &&
    isStringRecord(value.pieScopes, pieScopes) &&
    isBooleanRecord(value.pieExcludeOutsource)
  );
}

export function isSavedReport(value: unknown): value is SavedReport {
  if (!isRecord(value)) return false;
  const departments: ReportDepartment[] = ["media", "business"];
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.department === "string" &&
    departments.includes(value.department as ReportDepartment) &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    isSavedReportFilters(value.filters)
  );
}

export function validSavedReports(value: unknown): SavedReport[] {
  return Array.isArray(value) ? value.filter(isSavedReport) : [];
}
