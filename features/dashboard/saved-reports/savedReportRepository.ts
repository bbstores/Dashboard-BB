import { SAVED_REPORTS_KEY } from "../model/constants";
import type { SavedReport } from "../model/types";
import { validSavedReports } from "./validateSavedReport";

const STORE_VERSION = 1;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;
type StorageAdapter = StorageReader & Partial<StorageWriter>;

type SavedReportStore = {
  version: typeof STORE_VERSION;
  reports: SavedReport[];
};

function decodeStore(value: unknown) {
  if (Array.isArray(value)) {
    return { reports: validSavedReports(value), needsMigration: true };
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === STORE_VERSION &&
    "reports" in value
  ) {
    return {
      reports: validSavedReports(value.reports),
      needsMigration: false,
    };
  }
  return { reports: [], needsMigration: false };
}

export function loadSavedReports(storage: StorageAdapter): SavedReport[] {
  const stored = storage.getItem(SAVED_REPORTS_KEY);
  if (!stored) return [];
  try {
    const decoded = decodeStore(JSON.parse(stored));
    if (decoded.needsMigration && storage.setItem) {
      saveSavedReports(storage as StorageWriter, decoded.reports);
    }
    return decoded.reports;
  } catch {
    return [];
  }
}

export function saveSavedReports(
  storage: StorageWriter,
  reports: SavedReport[],
) {
  const payload: SavedReportStore = {
    version: STORE_VERSION,
    reports,
  };
  storage.setItem(SAVED_REPORTS_KEY, JSON.stringify(payload));
}
