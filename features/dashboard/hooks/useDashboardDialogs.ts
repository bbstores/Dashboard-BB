import { useState } from "react";
import {
  formatDistributionValue,
  formatNumber,
} from "@/shared/formatting/format";
import type {
  DetailView,
  PercentileDetail,
  ReportDepartment,
  Task,
} from "../model/types";

export function useDashboardDialogs() {
  const [comparisonActive, setComparisonActive] = useState(false);
  const [dashboardDepartment, setDashboardDepartment] =
    useState<ReportDepartment>("media");
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

  function showDashboardDepartment(department: ReportDepartment) {
    setComparisonActive(false);
    setDashboardDepartment(department);
  }

  function closeSaveReport() {
    setSaveReportOpen(false);
  }

  function finishSaveReport(department: ReportDepartment) {
    setReportName("");
    setSaveReportOpen(false);
    setReportDepartment(department);
  }

  function openPercentileTasks(
    label: string,
    note: string,
    observations: Array<{ task: Task; value: number }>,
  ) {
    if (!percentileDetail) return;
    setDetail({
      title: `${percentileDetail.title} · ${label}`,
      subtitle: `${note} · ${formatNumber(observations.length)} task`,
      tasks: observations.map((observation) => observation.task),
      taskMetric: {
        label: percentileDetail.metricLabel,
        value: (task) =>
          observations.find(
            (observation) => observation.task === task,
          )?.value ?? 0,
        format: (value) =>
          formatDistributionValue(value, percentileDetail.unit),
      },
    });
  }

  return {
    dashboardDepartment,
    setDashboardDepartment,
    comparisonActive,
    openComparison: () => setComparisonActive(true),
    showDashboardDepartment,
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
    openPercentileTasks,
  };
}
