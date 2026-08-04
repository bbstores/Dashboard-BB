"use client";
import "./styles/dashboard.css";
import "./styles/filters.css";
import "./styles/charts.css";
import "./styles/comparison.css";
import "./sections/collection/collection.css";
import "./sections/capacity/capacity.css";
import "./sections/publication/publication.css";
import "./sections/sla/sla.css";
import "./styles/dialogs.css";
import { DashboardFilters } from "./components/DashboardFilters";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardHero } from "./components/DashboardHero";
import { DashboardKpis } from "./components/DashboardKpis";
import { ComparisonDashboard } from "./components/ComparisonDashboard";
import { EmptyDashboard } from "./components/EmptyDashboard";
import { DetailDrawer } from "./dialogs/DetailDrawer";
import { PercentileDialog } from "./dialogs/PercentileDialog";
import { SaveReportDialog } from "./dialogs/SaveReportDialog";
import { SavedReportsPanel } from "./dialogs/SavedReportsPanel";
import { HelpProvider } from "./help/HelpProvider";
import { useDailyTaskChart } from "./hooks/useDailyTaskChart";
import { useDashboardDialogs } from "./hooks/useDashboardDialogs";
import { useDashboardFilters } from "./hooks/useDashboardFilters";
import { useDashboardStats } from "./hooks/useDashboardStats";
import { useWorkbookData } from "./hooks/useWorkbookData";
import type { ReportDepartment, SavedReport } from "./model/types";
import { useSavedReports } from "./saved-reports/useSavedReports";
import { CollectionSection } from "./sections/CollectionSection";
import { MediaCapacitySection } from "./sections/MediaCapacitySection";
import { OverviewSection } from "./sections/OverviewSection";
import { PeopleSection } from "./sections/PeopleSection";
import { PostingSection } from "./sections/PostingSection";
import { PublicationSection } from "./sections/PublicationSection";
import { SlaSection } from "./sections/SlaSection";
export function Dashboard() {
  const filters = useDashboardFilters();
  const workbook = useWorkbookData(filters.resetWorkbookFilters);
  const dialogs = useDashboardDialogs();
  const reports = useSavedReports();
  const analytics = useDashboardStats(
    workbook.data,
    filters.dateWindow,
    filters.collectionMonth,
    filters.backlogDate,
  );
  const dailyTaskChart = useDailyTaskChart(
    workbook.data,
    filters.dailyAssignee,
    filters.dateWindow,
  );
  function chartMetrics(key: string) {
    if (!analytics) throw new Error("Dashboard data is not loaded.");
    const metrics = analytics.pieMetrics[filters.chartScope(key)];
    return filters.pieExcludeOutsource[key]
      ? metrics.withoutOutsource
      : metrics.all;
  }
  function toggleSavedReports(department: ReportDepartment) {
    dialogs.setReportDepartment(
      dialogs.reportDepartment === department ? null : department,
    );
  }
  function saveCurrentReport() {
    const name = dialogs.reportName.trim();
    if (!name || !analytics) return;
    reports.saveReport({
      name,
      department: dialogs.saveDepartment,
      filters: filters.savedReportFilters,
      mediaCapacitySnapshot:
        dialogs.saveDepartment === "media"
          ? {
              ...analytics.mediaCapacity.snapshot,
              savedAt: new Date().toISOString(),
            }
          : undefined,
    });
    dialogs.finishSaveReport(dialogs.saveDepartment);
  }
  function applySavedReport(report: SavedReport) {
    dialogs.showDashboardDepartment(report.department);
    filters.applySavedReportFilters(report.filters);
    dialogs.setReportDepartment(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <HelpProvider>
      <main className="dashboard">
        <DashboardHeader
          fileRef={workbook.fileRef}
          loading={workbook.loading}
          hasData={Boolean(workbook.data)}
          activeDepartment={dialogs.dashboardDepartment}
          comparisonActive={dialogs.comparisonActive}
          reportCounts={reports.reportCounts}
          onDepartmentChange={dialogs.showDashboardDepartment}
          onOpenComparison={dialogs.openComparison}
          onOpenSavedReports={toggleSavedReports}
          onFileSelected={(file) => void workbook.loadWorkbook(file)}
        />
        {!dialogs.comparisonActive && (
          <DashboardHero data={workbook.data} department={dialogs.dashboardDepartment} />
        )}
        {workbook.error && <div className="errorBanner">{workbook.error}</div>}
        {!workbook.data || !analytics ? (
          <EmptyDashboard fileRef={workbook.fileRef} loading={workbook.loading} />
        ) : dialogs.comparisonActive ? (
          <ComparisonDashboard
            data={workbook.data}
            reports={reports.savedReports}
            onOpenDetail={dialogs.setDetail}
          />
        ) : (
          <>
            <DashboardFilters
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              backlogDate={filters.backlogDate}
              hasDateFilter={filters.dateWindow.hasFilter}
              department={dialogs.dashboardDepartment}
              showBacklogDate={dialogs.dashboardDepartment === "media"}
              onDateFromChange={filters.setDateFrom}
              onDateToChange={filters.setDateTo}
              onBacklogDateChange={filters.setBacklogDate}
              onClearDateFilter={filters.clearDateWindow}
              onOpenSaveReport={dialogs.openSaveReport}
            />
            {dialogs.dashboardDepartment === "media" ? (
              <>
                <DashboardKpis
                  viewModel={{
                    selectedTasks: analytics.selectedTasks,
                    startedInWindow: analytics.startedInWindow,
                    inspectionCarryIntoWindow:
                      analytics.inspectionCarryIntoWindow,
                    completionCarryIntoWindow:
                      analytics.completionCarryIntoWindow,
                    missingEither: analytics.missingEither,
                    missingStartOnly: analytics.missingStartOnly,
                    missingAssigneeOnly: analytics.missingAssigneeOnly,
                    missingBoth: analytics.missingBoth,
                    untitledTaskCount: analytics.untitledTaskCount,
                    backlogTasks: analytics.backlogTasks,
                    backlogAttentionTasks:
                      analytics.backlogAttentionTasks,
                    backlogTotal: analytics.backlogTotal,
                  }}
                  allTasks={workbook.data.tasks}
                  backlogDate={filters.backlogDate}
                  onOpenDetail={dialogs.setDetail}
                />
                <section className="dashboardGrid">
                  <OverviewSection
                    viewModel={{
                      reportingDate: analytics.reportingDate,
                      types: analytics.types,
                      costs: analytics.costs,
                      selectedTasks: analytics.selectedTasks,
                      metrics: {
                        status: chartMetrics("status"),
                        handoff: chartMetrics("handoff"),
                        overall: chartMetrics("overall"),
                        stages: chartMetrics("stages"),
                        outsource: chartMetrics("outsource"),
                      },
                    }}
                    scopes={{
                      status: filters.chartScope("status"),
                      handoff: filters.chartScope("handoff"),
                      overall: filters.chartScope("overall"),
                      stages: filters.chartScope("stages"),
                      outsource: filters.chartScope("outsource"),
                    }}
                    excludeOutsource={filters.pieExcludeOutsource}
                    onScopeChange={filters.setChartScope}
                    onExcludeOutsourceChange={
                      filters.setChartExcludeOutsource
                    }
                    onOpenDetail={dialogs.setDetail}
                  />
                  <PeopleSection
                    viewModel={{
                      leaderboard: analytics.leaderboard,
                      staffRows: analytics.staffRows,
                      selectedFeedback: analytics.selectedFeedback,
                      taskByCode: analytics.taskByCode,
                      dailyTaskChart,
                    }}
                    leaderboardUnit={filters.leaderboardUnit}
                    dailyAssignee={filters.dailyAssignee}
                    onLeaderboardUnitChange={
                      filters.setLeaderboardUnit
                    }
                    onDailyAssigneeChange={filters.setDailyAssignee}
                    onOpenDetail={dialogs.setDetail}
                  />
                  <CollectionSection
                    viewModel={{
                      months: analytics.months,
                      collection: analytics.collection,
                      collectionDone: analytics.collectionDone,
                      collectionTasks: analytics.collectionTasks,
                      childCollections: analytics.childCollections,
                    }}
                    collectionMonth={filters.collectionMonth}
                    onCollectionMonthChange={
                      filters.setCollectionMonth
                    }
                    onOpenDetail={dialogs.setDetail}
                  />
                  <PublicationSection
                    videoMetrics={chartMetrics("videoPublications")}
                    graphicMetrics={chartMetrics("graphicPublications")}
                    videoScope={filters.chartScope("videoPublications")}
                    graphicScope={filters.chartScope(
                      "graphicPublications",
                    )}
                    videoExcludeOutsource={Boolean(
                      filters.pieExcludeOutsource.videoPublications,
                    )}
                    graphicExcludeOutsource={Boolean(
                      filters.pieExcludeOutsource.graphicPublications,
                    )}
                    onScopeChange={filters.setChartScope}
                    onExcludeOutsourceChange={
                      filters.setChartExcludeOutsource
                    }
                    onOpenDetail={dialogs.setDetail}
                  />
                  <MediaCapacitySection
                    data={workbook.data}
                    viewModel={analytics.mediaCapacity}
                    globalDateFrom={filters.dateFrom}
                    globalDateTo={filters.dateTo}
                    onOpenDetail={dialogs.setDetail}
                  />
                  <SlaSection
                    viewModel={{
                      sla: analytics.sla,
                      reportingDate: analytics.reportingDate,
                      backlog: analytics.backlog,
                      backlogTasks: analytics.backlogTasks,
                    }}
                    backlogDate={filters.backlogDate}
                    onOpenDetail={dialogs.setDetail}
                    onOpenPercentile={dialogs.setPercentileDetail}
                  />
                </section>
                <section className="logicNote">
                  <span>LOGIC TEST V0.1</span>
                  <p>
                    &quot;Tổng task trong kỳ&quot; là hợp khử trùng của task
                    có Ngày Bắt Đầu, Ngày Kiểm Duyệt carry-in hoặc Ngày Hoàn
                    Thành carry-in nằm trong bộ lọc. Ngày Kiểm Duyệt phản ánh
                    mốc người làm bàn giao; Ngày Hoàn Thành phản ánh toàn quy
                    trình và có ảnh hưởng của người đánh giá.
                  </p>
                </section>
              </>
            ) : (
              <section className="dashboardGrid businessDashboard">
                <PostingSection
                  tasks={workbook.data.tasks}
                  publications={workbook.data.publications}
                  dateWindow={filters.dateWindow}
                  onOpenDetail={dialogs.setDetail}
                />
              </section>
            )}
          </>
        )}
        {dialogs.detail && (
          <DetailDrawer key={`${dialogs.detail.title}:${dialogs.detail.subtitle}`} detail={dialogs.detail} onClose={() => dialogs.setDetail(null)} />
        )}
        {dialogs.percentileDetail && (
          <PercentileDialog
            detail={dialogs.percentileDetail}
            onClose={() => dialogs.setPercentileDetail(null)}
            onSelect={dialogs.openPercentileTasks}
          />
        )}
        {dialogs.reportDepartment && (
          <SavedReportsPanel
            department={dialogs.reportDepartment}
            reports={reports.savedReports}
            onClose={() => dialogs.setReportDepartment(null)}
            onApply={applySavedReport}
            onDelete={reports.deleteReport}
          />
        )}
        {dialogs.saveReportOpen && (
          <SaveReportDialog
            reportName={dialogs.reportName}
            department={dialogs.saveDepartment}
            onReportNameChange={dialogs.setReportName}
            onDepartmentChange={dialogs.setSaveDepartment}
            onClose={dialogs.closeSaveReport}
            onSave={saveCurrentReport}
          />
        )}
      </main>
    </HelpProvider>
  );
}
