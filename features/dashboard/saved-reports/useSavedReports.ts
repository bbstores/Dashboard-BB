"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ReportDepartment,
  SavedReport,
  SavedReportFilters,
} from "../model/types";
import {
  loadSavedReports,
  saveSavedReports,
} from "./savedReportRepository";

type SavedReportDraft = {
  name: string;
  department: ReportDepartment;
  filters: SavedReportFilters;
};

function createSavedReport(draft: SavedReportDraft): SavedReport {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: draft.name,
    department: draft.department,
    createdAt: new Date().toISOString(),
    filters: draft.filters,
  };
}

export function useSavedReports() {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const savedReportsRef = useRef<SavedReport[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const reports = loadSavedReports(window.localStorage);
      savedReportsRef.current = reports;
      setSavedReports(reports);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const saveReport = useCallback((draft: SavedReportDraft) => {
    const report = createSavedReport(draft);
    const next = [report, ...savedReportsRef.current];
    savedReportsRef.current = next;
    setSavedReports(next);
    saveSavedReports(window.localStorage, next);
    return report;
  }, []);

  const deleteReport = useCallback((id: string) => {
    const next = savedReportsRef.current.filter(
      (report) => report.id !== id,
    );
    savedReportsRef.current = next;
    setSavedReports(next);
    saveSavedReports(window.localStorage, next);
  }, []);

  return { savedReports, saveReport, deleteReport };
}
