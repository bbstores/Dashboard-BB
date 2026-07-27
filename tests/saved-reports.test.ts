import assert from "node:assert/strict";
import test from "node:test";
import { SAVED_REPORTS_KEY } from "../features/dashboard/model/constants";
import type { SavedReport } from "../features/dashboard/model/types";
import {
  loadSavedReports,
  saveSavedReports,
} from "../features/dashboard/saved-reports/savedReportRepository";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const report: SavedReport = {
  id: "report-1",
  name: "Media tuần 30",
  department: "media",
  createdAt: "2026-07-27T08:00:00.000Z",
  filters: {
    dateFrom: "2026-07-20",
    dateTo: "2026-07-26",
    backlogDate: "2026-07-26",
    collectionMonth: "07.2026",
    leaderboardUnit: "minutes",
    pieScopes: { status: "combined" },
    pieExcludeOutsource: { status: true },
  },
};

test("persists and loads the versioned saved-report store", () => {
  const storage = new MemoryStorage();
  saveSavedReports(storage, [report]);

  const raw = storage.getItem(SAVED_REPORTS_KEY);
  assert.ok(raw);
  assert.deepEqual(JSON.parse(raw), {
    version: 1,
    reports: [report],
  });
  assert.deepEqual(loadSavedReports(storage), [report]);
});

test("loads legacy arrays and filters invalid reports", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    SAVED_REPORTS_KEY,
    JSON.stringify([
      report,
      { ...report, id: 123 },
      { ...report, department: "unknown" },
      { ...report, filters: { ...report.filters, leaderboardUnit: "week" } },
    ]),
  );

  assert.deepEqual(loadSavedReports(storage), [report]);
  assert.deepEqual(JSON.parse(storage.getItem(SAVED_REPORTS_KEY) ?? ""), {
    version: 1,
    reports: [report],
  });
});

test("returns an empty list for corrupt or unsupported storage", () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVED_REPORTS_KEY, "{not-json");
  assert.deepEqual(loadSavedReports(storage), []);

  storage.setItem(
    SAVED_REPORTS_KEY,
    JSON.stringify({ version: 99, reports: [report] }),
  );
  assert.deepEqual(loadSavedReports(storage), []);
});
