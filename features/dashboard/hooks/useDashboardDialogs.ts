import { useState } from "react";
import type {
  DetailView,
  PercentileDetail,
  ReportDepartment,
} from "../model/types";

export function useDashboardDialogs() {
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [percentileDetail, setPercentileDetail] =
    useState<PercentileDetail | null>(null);
  const [reportDepartment, setReportDepartment] =
    useState<ReportDepartment | null>(null);
  const [saveReportOpen, setSaveReportOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [saveDepartment, setSaveDepartment] =
    useState<ReportDepartment>("media");

  function openSaveReport(department: ReportDepartment) {
    setSaveDepartment(department);
    setSaveReportOpen(true);
  }

  function closeSaveReport() {
    setSaveReportOpen(false);
  }

  function finishSaveReport(department: ReportDepartment) {
    setReportName("");
    setSaveReportOpen(false);
    setReportDepartment(department);
  }

  return {
    detail,
    setDetail,
    percentileDetail,
    setPercentileDetail,
    reportDepartment,
    setReportDepartment,
    saveReportOpen,
    reportName,
    setReportName,
    saveDepartment,
    setSaveDepartment,
    openSaveReport,
    closeSaveReport,
    finishSaveReport,
  };
}
