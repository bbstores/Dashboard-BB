import { SAVED_REPORTS_KEY } from "../model/constants";
import type { SavedReport } from "../model/types";
import { validSavedReports } from "./validateSavedReport";

const STORE_VERSION = 1;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

type SavedReportStore = {
  version: typeof STORE_VERSION;
  reports: SavedReport[];
};

function decodeStore(value: unknown): SavedReport[] {
  if (Array.isArray(value)) {
    return validSavedReports(value);
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === STORE_VERSION &&
    "reports" in value
  ) {
    return validSavedReports(value.reports);
  }
  return [];
}

export function loadSavedReports(storage: StorageReader): SavedReport[] {
  const stored = storage.getItem(SAVED_REPORTS_KEY);
  if (!stored) return [];
  try {
    return decodeStore(JSON.parse(stored));
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
