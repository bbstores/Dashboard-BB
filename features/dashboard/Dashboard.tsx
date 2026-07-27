"use client";

import "./styles/sla.css";
import type { SavedReport } from "./model/types";

import {
  inputDate,
  percentile,
  operationalMinute,
} from "@/shared/date/dateUtils";

import {
  formatNumber,
  formatHours,
  formatMinutes,
  formatWorkDays,
  formatDate,
  formatSlaMinutes,
  formatOperationalTime,
  formatDistributionValue,
} from "@/shared/formatting/format";

import {
  evaluateHandoff,
  evaluateOverall,
  handoffLateMinutes,
  lateMinuteBucket,
} from "./model/slaUtils";

import {
  matchesGroup,
  assigneeNames,
  isVideoPublication,
  isGraphicPublication,
  cycleBucket,
  agingBucket,
  groupCount,
  outsourceName,
} from "./model/taskUtils";

import { dashboardHelp } from "./help/helpContent";
import { HelpProvider } from "./help/HelpProvider";
import { useDashboardDialogs } from "./hooks/useDashboardDialogs";
import { useDashboardFilters } from "./hooks/useDashboardFilters";
import { useDashboardStats } from "./hooks/useDashboardStats";
import { useDailyTaskChart } from "./hooks/useDailyTaskChart";
import { useWorkbookData } from "./hooks/useWorkbookData";
import { useSavedReports } from "./saved-reports/useSavedReports";

import { HelpButton } from "./components/HelpButton";
import { PieChart } from "./components/PieChart";
import { ProgressDonut } from "./components/ProgressDonut";
import { CollectionChildrenPanel } from "./components/CollectionPanel";
import { HorizontalBars } from "./components/HorizontalBars";
import { StaffColumns } from "./components/StaffColumns";
import { StaffTimeOfDayChart } from "./components/StaffTimeOfDayChart";
import { DailyTaskChart } from "./components/DailyTaskChart";
import { DetailDrawer } from "./components/DetailDrawer";
import { SlaMetricCard } from "./components/SlaMetricCard";
import { PercentileDialog } from "./components/PercentileDialog";

// ─── Main Dashboard Component ───────────────────────────────────────────────

export function Dashboard() {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    dailyAssignee,
    setDailyAssignee,
    collectionMonth,
    setCollectionMonth,
    leaderboardUnit,
    setLeaderboardUnit,
    pieExcludeOutsource,
    backlogDate,
    setBacklogDate,
    dateWindow,
    savedReportFilters,
    clearDateWindow,
    resetWorkbookFilters,
    applySavedReportFilters,
    chartScope,
    setChartScope,
    setChartExcludeOutsource,
  } = useDashboardFilters();
  const { fileRef, data, loading, error, loadWorkbook } =
    useWorkbookData(resetWorkbookFilters);
  const {
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
  } = useDashboardDialogs();
  const {
    savedReports,
    saveReport,
    deleteReport: deleteSavedReport,
  } = useSavedReports();

  function saveCurrentReport() {
    const name = reportName.trim();
    if (!name) return;
    saveReport({
      name,
      department: saveDepartment,
      filters: savedReportFilters,
    });
    finishSaveReport(saveDepartment);
  }

  function applySavedReport(report: SavedReport) {
    applySavedReportFilters(report.filters);
    setReportDepartment(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const analytics = useDashboardStats(data, dateWindow, collectionMonth, backlogDate);

  const dailyTaskChart = useDailyTaskChart(data, dailyAssignee, dateWindow);

  function chartMetrics(key: string) {
    if (!analytics) throw new Error("Dashboard data is not loaded.");
    const metrics = analytics!.pieMetrics[chartScope(key)];
    return pieExcludeOutsource[key] ? metrics.withoutOutsource : metrics.all;
  }

  return (
    <HelpProvider>
    <main className="dashboard">
      <header className="dashboardHeader">
        <div className="dashboardBrand">
          <span>BB</span>
          <div>
            <strong>Operations Intelligence</strong>
            <small>Task performance dashboard</small>
          </div>
        </div>
        <nav className="reportNavigation" aria-label="Báo cáo theo phòng ban">
          <span>Báo cáo theo phòng ban</span>
          <button
            type="button"
            className={reportDepartment === "media" ? "active" : ""}
            onClick={() =>
              setReportDepartment(reportDepartment === "media" ? null : "media")
            }
          >
            Media
            <small>{savedReports.filter((report: SavedReport) => report.department === "media").length}</small>
          </button>
          <button
            type="button"
            className={reportDepartment === "business" ? "active" : ""}
            onClick={() =>
              setReportDepartment(reportDepartment === "business" ? null : "business")
            }
          >
            Kinh doanh
            <small>{savedReports.filter((report: SavedReport) => report.department === "business").length}</small>
          </button>
        </nav>
        <button className="uploadButton" onClick={() => fileRef.current?.click()}>
          {loading ? "Đang đọc dữ liệu…" : data ? "Đổi file Excel" : "Chọn file Excel"}
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".xlsx"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadWorkbook(file);
          }}
        />
      </header>

      <section className="dashboardHero">
        <div>
          <p className="eyebrow">TASKLIST CONTROL ROOM</p>
          <h1>Hiệu suất công việc,<br />nhìn trong một màn hình.</h1>
          <p className="heroCopy">
            File được đọc và xử lý ngay trên thiết bị. Không có dữ liệu nhân sự
            nào được tải lên máy chủ hoặc lưu trong mã nguồn.
          </p>
        </div>
        <div className={`dataBadge ${data ? "loaded" : ""}`}>
          <span>{data ? "ĐÃ NẠP" : "CHỜ FILE"}</span>
          <strong>{data ? data.fileName : "BB Store Task Export"}</strong>
          <small>
            {data
              ? `${formatNumber(data!.tasks.length)} task · ${formatNumber(data!.feedback.length)} phản hồi`
              : "Hỗ trợ workbook .xlsx có đúng tên sheet Lark Base"}
          </small>
        </div>
      </section>

      {error && <div className="errorBanner">{error}</div>}

      {!data || !analytics ? (
        <section className="emptyState">
          <div className="dropMark">↓</div>
          <p className="eyebrow">BẮT ĐẦU</p>
          <h2>Nạp file export mới nhất</h2>
          <p>
            Dashboard cần sheet <code>2.6 Tasklist</code> và{" "}
            <code>2.9 Lịch sử phản hồi Task</code>.
          </p>
          <button onClick={() => fileRef.current?.click()}>
            {loading ? "Đang xử lý…" : "Chọn workbook"}
          </button>
        </section>
      ) : (
        <>
          <section className="filterBar">
            <div className="filterIntro">
              <span className="chartKicker">BỘ LỌC CHUNG</span>
              <strong>{dateWindow.hasFilter ? "Khoảng thời gian tùy chọn" : "Toàn bộ dữ liệu"}</strong>
            </div>
            <label>
              Từ ngày
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <span className="filterArrow">→</span>
            <label>
              Đến ngày
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <label className="backlogFilter">
              Mốc task tồn
              <input
                type="date"
                value={backlogDate}
                onChange={(event) => setBacklogDate(event.target.value)}
              />
              <small>Độc lập · mặc định hôm nay</small>
            </label>
            <button
              className="clearButton"
              disabled={!dateWindow.hasFilter}
              onClick={clearDateWindow}
            >
              Xóa lọc
            </button>
            <button
              type="button"
              className="saveReportButton"
              onClick={() => openSaveReport(reportDepartment ?? "media")}
            >
              <span>＋</span> Lưu báo cáo
            </button>
          </section>

          <section className="kpiGrid">
            <button
              type="button"
              className="kpiCard dark interactive"
              onClick={() => setDetail({
                title: "Task trong kỳ",
                subtitle: "Hợp khử trùng của task bắt đầu, carry-in bàn giao và carry-in hoàn thành",
                tasks: analytics!.selectedTasks,
              })}
            >
              <HelpButton help={dashboardHelp("Task trong kỳ")} />
              <span>Task trong kỳ</span>
              <strong>{formatNumber(analytics!.selectedTasks.length)}</strong>
              <small>
                <b>{formatNumber(analytics!.startedInWindow.length)}</b> bắt đầu trong kỳ
                {" · "}
                <b>{formatNumber(analytics!.inspectionCarryIntoWindow.length)}</b> carry-in bàn giao
                {" · "}
                <b>{formatNumber(analytics!.completionCarryIntoWindow.length)}</b> carry-in hoàn thành
                <br />
                <em>Hai mốc carry-in có thể giao nhau; tổng đã khử trùng.</em>
              </small>
            </button>
            <button
              type="button"
              className="kpiCard interactive"
              onClick={() => setDetail({
                title: "Task thiếu thông tin",
                subtitle: "Chưa có Ngày Bắt Đầu hoặc chưa có Assignee",
                tasks: data!.tasks.filter((task) => !task.startDate || !task.assignee),
              })}
            >
              <HelpButton help={dashboardHelp("Task thiếu thông tin")} />
              <span>Thiếu ngày bắt đầu hoặc assignee</span>
              <strong>{formatNumber(analytics!.missingEither)}</strong>
              <small>
                <b>{analytics!.missingStartOnly}</b> chỉ thiếu ngày ·{" "}
                <b>{analytics!.missingAssigneeOnly}</b> chỉ thiếu assignee
                <br />
                <b>{analytics!.missingBoth}</b> thiếu cả hai
              </small>
            </button>
            <button
              type="button"
              className="kpiCard lime interactive"
              onClick={() => setDetail({
                title: "Task tồn tại mốc chọn",
                subtitle: `Các task tồn tính đến ${formatDate(inputDate(backlogDate))}`,
                tasks: analytics!.backlogTasks,
              })}
            >
              <HelpButton help={dashboardHelp("Task tồn tại mốc chọn")} />
              <span>Task tồn tại mốc chọn</span>
              <strong>{formatNumber(analytics!.backlogTotal)}</strong>
              <small>Không tính Done, Archived, Pending/Cancel, Kinh Doanh Done</small>
            </button>
          </section>

          <section className="dashboardGrid">
            <header className="dashboardGroupHeader overviewHeader">
              <span>01</span>
              <div>
                <p>TỔNG QUAN VẬN HÀNH</p>
                <h2>Trạng thái, chất lượng &amp; phân bổ task</h2>
              </div>
            </header>
            <header className="dashboardGroupHeader peopleHeader">
              <span>02</span>
              <div>
                <p>NHÂN SỰ &amp; KHỐI LƯỢNG</p>
                <h2>Thời gian, số task &amp; phản hồi</h2>
              </div>
            </header>
            <header className="dashboardGroupHeader productionHeader">
              <span>03</span>
              <div>
                <p>BỘ SƯU TẬP &amp; SẢN LƯỢNG</p>
                <h2>Tiến độ BST, Video &amp; Graphic</h2>
              </div>
            </header>
            <header className="dashboardGroupHeader slaGroupHeader">
              <span>04</span>
              <div>
                <p>SLA &amp; ĐỊNH MỨC</p>
                <h2>Nhịp xử lý, aging &amp; tải công việc</h2>
              </div>
            </header>

            <HorizontalBars
              title="Leaderboard thời gian"
              subtitle="TỔNG PHÚT DỰ KIẾN THEO ASSIGNEE"
              rows={analytics!.leaderboard}
              className="groupPeople leaderboardCard"
              format={
                leaderboardUnit === "minutes"
                  ? formatMinutes
                  : leaderboardUnit === "hours"
                    ? formatHours
                    : formatWorkDays
              }
              headerAction={
                <label className="unitSelector">
                  Đơn vị
                  <select
                    value={leaderboardUnit}
                    onChange={(event) =>
                      setLeaderboardUnit(
                        event.target.value as "minutes" | "hours" | "days",
                      )
                    }
                    aria-label="Đơn vị thời gian leaderboard"
                  >
                    <option value="minutes">Phút</option>
                    <option value="hours">Giờ</option>
                    <option value="days">Ngày công (8 giờ)</option>
                  </select>
                </label>
              }
              onSelect={(label, metric = "total") => {
                const row = analytics!.leaderboard.find((item) => item.label === label);
                if (!row) return;

                const titleMap = {
                  total: "Tổng thời gian",
                  started: "Task trong kỳ",
                  carried: "Carry-in bàn giao",
                  waiting: "To Do / Pending-Cancel",
                };

                const taskMap = {
                  total: row.tasks,
                  started: row.startedTasks,
                  carried: row.carriedTasks,
                  waiting: row.waitingTasks,
                };

                setDetail({
                  title: `${titleMap[metric as keyof typeof titleMap]} · ${label}`,
                  subtitle: "Các task tạo nên thời gian đã chọn",
                  tasks: taskMap[metric as keyof typeof taskMap] ?? [],
                });
              }}
            />

            <article className="chartCard collectionCard fullWidth groupProduction">
              <div className="chartTitle">
                <div>
                  <span className="chartKicker">BỘ SƯU TẬP</span>
                  <h3>Tiến độ hoàn thành</h3>
                </div>
                <div className="chartHeaderTools">
                  <select
                    value={collectionMonth}
                    onChange={(event) => setCollectionMonth(event.target.value)}
                    aria-label="Chọn tháng bộ sưu tập"
                  >
                    <option value="">Chọn tháng bắt buộc</option>
                    {analytics!.months.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <HelpButton help={dashboardHelp("Tiến độ hoàn thành")} />
                </div>
              </div>
              {collectionMonth ? (
                <div className="collectionProgressArea">
                  <div className="progressGrid">
                    <div className="metricHoverGroup tasks">
                      <ProgressDonut
                        title="THEO SỐ TASK"
                        done={analytics!.collection.taskDone}
                        total={analytics!.collection.taskTotal}
                        unit="task"
                        onSelect={(scope) => setDetail({
                          title: scope === "done" ? `Task Done · ${collectionMonth}` : `Tất cả task · ${collectionMonth}`,
                          subtitle: "Tiến độ Bộ Sưu Tập theo số lượng task",
                          tasks: scope === "done" ? analytics!.collectionDone : analytics!.collectionTasks,
                        })}
                      />
                      <CollectionChildrenPanel
                        month={collectionMonth}
                        metric="tasks"
                        rows={analytics!.childCollections}
                        onSelect={(child) => setDetail({
                          title: `${child.name} · Số task`,
                          subtitle: "Các task thuộc BST con đã chọn",
                          tasks: child.tasks,
                        })}
                      />
                    </div>
                    <div className="metricHoverGroup minutes">
                      <ProgressDonut
                        title="THEO TỔNG PHÚT"
                        done={analytics!.collection.minuteDone}
                        total={analytics!.collection.minuteTotal}
                        unit="phút"
                        onSelect={(scope) => setDetail({
                          title: scope === "done" ? `Phút đã Done · ${collectionMonth}` : `Tổng phút · ${collectionMonth}`,
                          subtitle: "Danh sách task tạo nên tổng số phút dự kiến",
                          tasks: scope === "done" ? analytics!.collectionDone : analytics!.collectionTasks,
                        })}
                      />
                      <CollectionChildrenPanel
                        month={collectionMonth}
                        metric="minutes"
                        rows={analytics!.childCollections}
                        onSelect={(child) => setDetail({
                          title: `${child.name} · Tổng phút`,
                          subtitle: "Các task tạo nên số phút của BST con",
                          tasks: child.tasks,
                        })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="selectPrompt">
                  <span>01</span>
                  <p>Chọn tháng để tính tiến độ từ các task thuộc Bộ Sưu Tập của tháng đó.</p>
                </div>
              )}
            </article>

            <DailyTaskChart
              rows={dailyTaskChart.rows}
              assignees={dailyTaskChart.assignees}
              assignee={dailyAssignee}
              onAssigneeChange={setDailyAssignee}
              onSelect={(type, row) => {
                const titleMap = {
                  assigned: "Được giao",
                  handedSameDay: "Bàn giao · Task trong ngày",
                  handedBacklog: "Bàn giao · Xử lý task tồn",
                  backlog: "Tồn cuối ngày",
                };
                const taskMap = {
                  assigned: row.assignedTasks,
                  handedSameDay: row.handedSameDayTasks,
                  handedBacklog: row.handedBacklogTasks,
                  backlog: row.backlogTasks,
                };
                setDetail({
                  title: titleMap[type],
                  subtitle: formatDate(row.date),
                  tasks: taskMap[type],
                });
              }}
            />

            <StaffColumns
              rows={analytics!.staffRows}
              className="groupPeople"
              onSelect={(name, metric) => {
                if (metric === "feedback") {
                  setDetail({
                    title: `Lần trả về · ${name}`,
                    subtitle: "Dữ liệu từ sheet 2.9 Lịch sử phản hồi Task trong bộ lọc",
                    feedback: analytics!.selectedFeedback
                      .filter((item) =>
                        assigneeNames(
                          item.assignee ||
                            analytics!.taskByCode.get(item.taskCode)?.assignee ||
                            "",
                        ).includes(name),
                      )
                      .map((item) => ({ ...item, task: analytics!.taskByCode.get(item.taskCode) })),
                  });
                  return;
                }
                const row = analytics!.staffRows.find(r => r.name === name);
                if (!row) return;
                const labels = {
                  total: "Tổng task",
                  started: "Bắt đầu trong kỳ",
                  inspectionCarry: "Carry-in bàn giao",
                  completionCarry: "Carry-in hoàn thành",
                };
                const taskMap = {
                  total: row.totalTasks,
                  started: row.startedTasks,
                  inspectionCarry: row.inspectionCarryTasks,
                  completionCarry: row.completionCarryTasks,
                };
                setDetail({
                  title: `${labels[metric as keyof typeof labels]} · ${name}`,
                  subtitle: "Các task tạo nên cột đã chọn",
                  tasks: taskMap[metric as keyof typeof taskMap] ?? [],
                });
              }}
            />

            <div className="triplePie fullWidth groupOverview">
              <PieChart
                title="Tình trạng task"
                data={chartMetrics("status").status}
                compact
                scope={chartScope("status")}
                onScopeChange={(scope) => setChartScope("status", scope)}
                excludeOutsource={Boolean(pieExcludeOutsource.status)}
                onExcludeOutsourceChange={(checked) =>
                  setChartExcludeOutsource("status", checked)
                }
                onSelect={(label) => setDetail({
                  title: `Tình trạng · ${label}`,
                  subtitle: "Task trong bộ lọc có cùng trạng thái",
                  tasks: chartMetrics("status").tasks.filter(
                    (task) => matchesGroup(task.status, label),
                  ),
                })}
              />
              <PieChart
                title="Tuân thủ ngày bàn giao"
                data={chartMetrics("handoff").handoff}
                compact
                scope={chartScope("handoff")}
                onScopeChange={(scope) => setChartScope("handoff", scope)}
                excludeOutsource={Boolean(pieExcludeOutsource.handoff)}
                onExcludeOutsourceChange={(checked) =>
                  setChartExcludeOutsource("handoff", checked)
                }
                onSelect={(label) => setDetail({
                  title: `Tuân thủ bàn giao · ${label}`,
                  subtitle: `Đánh giá tại mốc ${formatDate(analytics!.reportingDate)}`,
                  tasks: chartMetrics("handoff").tasks.filter(
                    (task) =>
                      evaluateHandoff(task, analytics!.reportingDate).label ===
                      label,
                  ),
                })}
              />
              <PieChart
                title="Tuân thủ hạn hoàn thành"
                data={chartMetrics("overall").overall}
                compact
                scope={chartScope("overall")}
                onScopeChange={(scope) => setChartScope("overall", scope)}
                excludeOutsource={Boolean(pieExcludeOutsource.overall)}
                onExcludeOutsourceChange={(checked) =>
                  setChartExcludeOutsource("overall", checked)
                }
                onSelect={(label) => setDetail({
                  title: `Tuân thủ hoàn thành · ${label}`,
                  subtitle: `Hạn là cuối ngày làm việc kế tiếp · đánh giá tại ${formatDate(analytics!.reportingDate)}`,
                  tasks: chartMetrics("overall").tasks.filter(
                    (task) =>
                      evaluateOverall(task, analytics!.reportingDate).label ===
                      label,
                  ),
                })}
              />
            </div>

            <HorizontalBars
              title="Task theo Type"
              subtitle="COLUMN TYPE"
              rows={analytics!.types}
              className="groupOverview"
              onSelect={(label) => setDetail({
                title: `Type · ${label}`,
                subtitle: "Task trong bộ lọc có cùng Type",
                tasks: analytics!.selectedTasks.filter((task) => matchesGroup(task.type, label)),
              })}
            />
            <PieChart
              title="Task theo công đoạn"
              className="groupOverview"
              data={chartMetrics("stages").stages}
              scope={chartScope("stages")}
              onScopeChange={(scope) => setChartScope("stages", scope)}
              excludeOutsource={Boolean(pieExcludeOutsource.stages)}
              onExcludeOutsourceChange={(checked) =>
                setChartExcludeOutsource("stages", checked)
              }
              onSelect={(label) => setDetail({
                title: `Công đoạn · ${label}`,
                subtitle: "Task trong bộ lọc có cùng công đoạn",
                tasks: chartMetrics("stages").tasks.filter(
                  (task) => matchesGroup(task.stage, label),
                ),
              })}
            />
            <PieChart
              title="Task Outsource"
              className="groupOverview"
              data={chartMetrics("outsource").outsource}
              scope={chartScope("outsource")}
              onScopeChange={(scope) => setChartScope("outsource", scope)}
              onSelect={(label) => setDetail({
                title: `Outsource · ${label}`,
                subtitle: "Các task có cùng tên trong cột Outsource",
                tasks: chartMetrics("outsource").tasks.filter(
                  (task) => matchesGroup(outsourceName(task), label),
                ),
              })}
            />
            <section className="publicationSection fullWidth groupProduction videoPublication">
              <div className="publicationHeader">
                <span className="chartKicker">SỐ LƯỢNG ẤN PHẨM</span>
                <h2>Video</h2>
              </div>
              <div className="publicationGrid">
                <PieChart
                  title="Theo Format Type"
                  help={{
                    title: "Ấn phẩm Video theo Format Type",
                    purpose: "Cơ cấu số ấn phẩm video theo từng định dạng đầu ra.",
                    objective: "Giúp quản lý biết đội ngũ đang sản xuất nhiều loại video nào để cân đối năng lực edit và kế hoạch nội dung.",
                    calculation: "Chỉ lấy task có Format Type chứa từ khóa video và Công đoạn là Edit, sau đó nhóm theo Format Type.",
                    example: "Reels Video có 30 trong tổng 50 ấn phẩm video → lát này là 30 và 60%.",
                  }}
                  data={chartMetrics("videoPublications").videoFormats}
                  compact
                  scope={chartScope("videoPublications")}
                  onScopeChange={(scope) => setChartScope("videoPublications", scope)}
                  excludeOutsource={Boolean(pieExcludeOutsource.videoPublications)}
                  onExcludeOutsourceChange={(checked) => setChartExcludeOutsource("videoPublications", checked)}
                  hoverBreakdown={(label) => {
                    const tasks = chartMetrics("videoPublications").tasks.filter(
                      (task) => isVideoPublication(task) && matchesGroup(task.formatType, label),
                    );
                    return { title: `${label} · phân bổ theo Type`, data: groupCount(tasks, (task) => task.type) };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Video · Format Type · ${label}`,
                    subtitle: "Format Type chứa 'video' và Công đoạn là Edit",
                    tasks: chartMetrics("videoPublications").tasks.filter(
                      (task) => isVideoPublication(task) && matchesGroup(task.formatType, label),
                    ),
                  })}
                />
                <PieChart
                  title="Theo Type"
                  help={{
                    title: "Ấn phẩm Video theo Type",
                    purpose: "Cơ cấu cùng tập ấn phẩm video nhưng được phân tích theo cột Type.",
                    objective: "Cho biết video đang phục vụ nhóm công việc hoặc mục đích nào, hỗ trợ ưu tiên nguồn lực theo Type.",
                    calculation: "Lấy task có Format Type chứa video và Công đoạn Edit, sau đó nhóm theo Type.",
                    example: "Type Social có 20 trong tổng 50 video → hiển thị 20 và 40%.",
                  }}
                  data={chartMetrics("videoPublications").videoTypes}
                  compact
                  hoverBreakdown={(label) => {
                    const tasks = chartMetrics("videoPublications").tasks.filter(
                      (task) => isVideoPublication(task) && matchesGroup(task.type, label),
                    );
                    return { title: `${label} · phân bổ theo Format Type`, data: groupCount(tasks, (task) => task.formatType) };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Video · Type · ${label}`,
                    subtitle: "Ấn phẩm Video được phân bổ theo cột Type",
                    tasks: chartMetrics("videoPublications").tasks.filter(
                      (task) => isVideoPublication(task) && matchesGroup(task.type, label),
                    ),
                  })}
                />
              </div>
            </section>

            <section className="publicationSection fullWidth groupProduction graphicPublication">
              <div className="publicationHeader">
                <span className="chartKicker">SỐ LƯỢNG ẤN PHẨM</span>
                <h2>Graphic</h2>
              </div>
              <div className="publicationGrid">
                <PieChart
                  title="Theo Format Type"
                  help={{
                    title: "Ấn phẩm Graphic theo Format Type",
                    purpose: "Cơ cấu số ấn phẩm hình ảnh theo từng định dạng đầu ra.",
                    objective: "Giúp quản lý nhìn nhu cầu thiết kế theo định dạng để cân đối năng lực graphic và kế hoạch sản xuất.",
                    calculation: "Chỉ lấy task có Công đoạn Graphic Design và Format Type không chứa video, sau đó nhóm theo Format Type.",
                    example: "Banner có 40 trong tổng 100 ấn phẩm graphic → lát Banner là 40 và 40%.",
                  }}
                  data={chartMetrics("graphicPublications").graphicFormats}
                  compact
                  scope={chartScope("graphicPublications")}
                  onScopeChange={(scope) => setChartScope("graphicPublications", scope)}
                  excludeOutsource={Boolean(pieExcludeOutsource.graphicPublications)}
                  onExcludeOutsourceChange={(checked) => setChartExcludeOutsource("graphicPublications", checked)}
                  hoverBreakdown={(label) => {
                    const tasks = chartMetrics("graphicPublications").tasks.filter(
                      (task) => isGraphicPublication(task) && matchesGroup(task.formatType, label),
                    );
                    return { title: `${label} · phân bổ theo Type`, data: groupCount(tasks, (task) => task.type) };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Graphic · Format Type · ${label}`,
                    subtitle: "Công đoạn Graphic Design và không phải video",
                    tasks: chartMetrics("graphicPublications").tasks.filter(
                      (task) => isGraphicPublication(task) && matchesGroup(task.formatType, label),
                    ),
                  })}
                />
                <PieChart
                  title="Theo Type"
                  help={{
                    title: "Ấn phẩm Graphic theo Type",
                    purpose: "Cơ cấu cùng tập ấn phẩm graphic nhưng được phân tích theo cột Type.",
                    objective: "Cho biết thiết kế hình ảnh đang tập trung vào nhóm công việc nào để điều phối người và lịch sản xuất.",
                    calculation: "Lấy task thuộc Công đoạn Graphic Design, loại Format Type video, rồi nhóm theo Type.",
                    example: "Type Campaign có 25 trong tổng 100 graphic → hiển thị 25 và 25%.",
                  }}
                  data={chartMetrics("graphicPublications").graphicTypes}
                  compact
                  hoverBreakdown={(label) => {
                    const tasks = chartMetrics("graphicPublications").tasks.filter(
                      (task) => isGraphicPublication(task) && matchesGroup(task.type, label),
                    );
                    return { title: `${label} · phân bổ theo Format Type`, data: groupCount(tasks, (task) => task.formatType) };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Graphic · Type · ${label}`,
                    subtitle: "Ấn phẩm Graphic được phân bổ theo cột Type",
                    tasks: chartMetrics("graphicPublications").tasks.filter(
                      (task) => isGraphicPublication(task) && matchesGroup(task.type, label),
                    ),
                  })}
                />
              </div>
            </section>

            <section className="slaSection fullWidth groupSla">
              <div className="slaHeader">
                <div>
                  <span className="chartKicker">SLA · KHÁM PHÁ DỮ LIỆU</span>
                  <h2>Nhịp xử lý &amp; định mức</h2>
                  <p>
                    Giờ làm việc: Thứ Hai–Thứ Bảy, 08:30–12:00 và
                    13:00–17:30; đã loại lịch nghỉ lễ Việt Nam 2026.
                  </p>
                </div>
                <span className="slaMode">CHƯA GẮN NGƯỠNG ĐẠT / VI PHẠM</span>
              </div>

              <section className="handoffSlaBlock">
                <div className="handoffSlaHeader">
                  <div>
                    <span className="chartKicker">TUÂN THỦ MỐC BÀN GIAO</span>
                    <h3>Bàn giao trong ngày &amp; mức độ trễ</h3>
                    <p>
                      Cùng ngày luôn được tính đúng hạn. Khi sang ngày khác,
                      phút trễ chỉ tính từ 08:30 trong giờ làm việc.
                    </p>
                  </div>
                  <HelpButton help={dashboardHelp("Tuân thủ ngày bàn giao")} />
                </div>
                <div className="handoffKpis">
                  <SlaMetricCard
                    kicker="TỶ LỆ ĐÚNG NGÀY"
                    title="Task đã bàn giao đủ dữ liệu"
                    value={`${Math.round(analytics!.sla.handoffOnTimeRate)}%`}
                    note={`${formatNumber(analytics!.sla.onTimeHandoffs.length)} / ${formatNumber(analytics!.sla.handedForKpi.length)} task bàn giao đúng ngày`}
                    help={dashboardHelp("Tuân thủ ngày bàn giao")}
                    onClick={() =>
                      setDetail({
                        title: "Bàn giao đúng ngày",
                        subtitle: "Ngày Kiểm Duyệt cùng ngày Ngày Bắt Đầu",
                        tasks: analytics!.sla.onTimeHandoffs.map((row) => row.task),
                      })
                    }
                  />
                  <SlaMetricCard
                    kicker="CHƯA BÀN GIAO"
                    title="Quá hạn tại ngày báo cáo"
                    value={formatNumber(analytics!.sla.overdueHandoffs.length)}
                    note={`Đánh giá tại ${formatDate(analytics!.reportingDate)}`}
                    help={dashboardHelp("Tuân thủ ngày bàn giao")}
                    onClick={() =>
                      setDetail({
                        title: "Quá hạn chưa bàn giao",
                        subtitle: "Đã qua ngày bắt đầu nhưng chưa có Ngày Kiểm Duyệt",
                        tasks: analytics!.sla.overdueHandoffs.map((row) => row.task),
                      })
                    }
                  />
                  <SlaMetricCard
                    kicker="MỨC TRỄ ĐIỂN HÌNH"
                    title="P50 của task bàn giao trễ ngày"
                    value={formatSlaMinutes(analytics!.sla.handoffLateP50)}
                    note={`${formatNumber(analytics!.sla.lateHandoffs.length)} task trễ ngày · chỉ tính giờ làm việc`}
                    help={{
                      title: "P50 phút trễ bàn giao",
                      purpose: "Mức phút trễ điển hình của riêng các task đã bàn giao sang ngày khác.",
                      objective: "Phân biệt task chỉ trễ qua ngày nhưng bàn giao trước ca với task chiếm nhiều giờ làm việc của ngày kế tiếp.",
                      calculation: "Bắt đầu tính từ 08:30 của ngày làm việc kế tiếp; loại ngoài giờ, nghỉ trưa, Chủ nhật và ngày lễ. P50 là trung vị.",
                      example: "Bàn giao 07:00 hôm sau → 0 phút làm việc. Bàn giao 09:30 → 60 phút.",
                    }}
                    onExpand={() =>
                      setPercentileDetail({
                        title: "Mức trễ bàn giao",
                        subtitle: "Phân vị số phút trễ của các task bàn giao sang ngày khác, chỉ tính trong giờ làm việc.",
                        metricLabel: "Số phút trễ",
                        observations: analytics!.sla.lateHandoffs.map((row) => ({ task: row.task, value: row.minutes })),
                        unit: "minutes",
                      })
                    }
                    onClick={() =>
                      setDetail({
                        title: "Task bàn giao trễ ngày",
                        subtitle: "Các task tạo nên P50 và phân bổ mức độ trễ",
                        tasks: analytics!.sla.lateHandoffs.map((row) => row.task),
                        taskMetric: {
                          label: "Số phút trễ",
                          value: handoffLateMinutes,
                          format: formatSlaMinutes,
                          describe: lateMinuteBucket,
                        },
                      })
                    }
                  />
                </div>
                <HorizontalBars
                  title="Mức độ trễ bàn giao"
                  subtitle="PHÚT TRỄ TRONG GIỜ LÀM VIỆC"
                  rows={analytics!.sla.handoffLateDistribution}
                  className="handoffLateChart"
                  help={{
                    title: "Mức độ trễ bàn giao",
                    purpose: "Phân nhóm các task bàn giao sang ngày khác theo số phút làm việc bị trễ.",
                    objective: "Nhận diện trễ chỉ mang tính qua ngày và các trường hợp thực sự chiếm thời gian của ca kế tiếp.",
                    calculation: "Phút trễ tính từ 08:30 ngày làm việc kế tiếp, loại ngoài giờ, nghỉ trưa, Chủ nhật và ngày lễ.",
                    example: "Task kiểm duyệt 07:00 hôm sau thuộc nhóm 0 phút; 10:00 thuộc nhóm 61–120 phút.",
                  }}
                  onSelect={(label) =>
                    setDetail({
                      title: `Mức trễ · ${label}`,
                      subtitle: "Task bàn giao trễ ngày trong cùng khoảng phút",
                      tasks: analytics!.sla.lateHandoffs
                        .filter((row) => lateMinuteBucket(row.minutes) === label)
                        .map((row) => row.task),
                      taskMetric: {
                        label: "Số phút trễ",
                        value: handoffLateMinutes,
                        format: formatSlaMinutes,
                        describe: lateMinuteBucket,
                      },
                    })
                  }
                />
              </section>

              <StaffTimeOfDayChart
                rows={analytics!.sla.staffTimeOfDayRows}
                onSelect={(row, metric, tasks, context) => {
                  const isInspection = metric === "inspection";
                  const values = tasks
                    .map((task) => isInspection ? task.inspectionDate : task.completedDate)
                    .filter((value): value is Date => Boolean(value))
                    .map(operationalMinute);
                  setDetail({
                    title: `${isInspection ? "Giờ bàn giao" : "Giờ hoàn thành"} · ${row.name}`,
                    subtitle: `${context} · P50 ${values.length ? formatOperationalTime(percentile(values, 0.5), true) : "—"} theo ngày vận hành 08:30–08:30`,
                    tasks,
                  });
                }}
              />

              <div className="slaMetrics">
                <SlaMetricCard
                  kicker="CYCLE TIME"
                  title="P50 hoàn thành"
                  value={`${analytics!.sla.cycleP50} ngày`}
                  note={`P90: ${analytics!.sla.cycleP90} ngày · ${formatNumber(analytics!.sla.cycleRows.length)} task đủ ngày`}
                  onExpand={() =>
                    setPercentileDetail({
                        title: "Cycle time hoàn thành",
                        subtitle: "Phân vị số ngày lịch từ Ngày Bắt Đầu đến Ngày Hoàn Thành.",
                        metricLabel: "Cycle time",
                        observations: analytics!.sla.cycleRows.map((row) => ({ task: row.task, value: row.days })),
                        unit: "days",
                    })
                  }
                  onClick={() => setDetail({
                    title: "Task có dữ liệu Cycle time",
                    subtitle: "Hoàn thành trong kỳ và có Ngày Bắt Đầu",
                    tasks: analytics!.sla.cycleRows.map((row) => row.task),
                  })}
                />
                <SlaMetricCard
                  kicker="ĐỊNH MỨC 1.7"
                  title="Độ phủ định mức tham chiếu"
                  value={`${Math.round(analytics!.sla.normCoverage)}%`}
                  note={`${formatNumber(analytics!.sla.normMapped)} / ${formatNumber(analytics!.sla.normEligible)} task map được`}
                  onClick={() => setDetail({
                    title: "Task chưa có định mức",
                    subtitle: "Không tìm thấy Format Type/Công đoạn phù hợp trong sheet 1.7",
                    tasks: analytics!.sla.normRows
                      .filter((row) => row.normMinutes === null)
                      .map((row) => row.task),
                  })}
                />
              </div>

              <div className="slaChartGrid cycleChartRow">
                <PieChart
                  title="Cycle time theo ngày"
                  data={analytics!.sla.cycleDistribution}
                  compact
                  onSelect={(label) => setDetail({
                    title: `Cycle time · ${label}`,
                    subtitle: "Task hoàn thành trong kỳ",
                    tasks: analytics!.sla.cycleRows
                      .filter((row) => cycleBucket(row.days) === label)
                      .map((row) => row.task),
                  })}
                />
              </div>

              <div className="slaChartGrid agingBacklogRow">
                <PieChart
                  title="Aging task đang mở"
                  data={analytics!.sla.agingDistribution}
                  compact
                  hoverBreakdown={(label) => {
                    const rows = analytics!.sla.openAgingRows.filter(
                      (row) => agingBucket(row.days) === label,
                    );
                    return { title: `${label} · phân bổ theo trạng thái`, data: groupCount(rows, (row) => row.task.status) };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Aging · ${label}`,
                    subtitle: `Task đang mở tính đến mốc ${formatDate(inputDate(backlogDate))}`,
                    tasks: analytics!.sla.openAgingRows
                      .filter((row) => agingBucket(row.days) === label)
                      .map((row) => row.task),
                  })}
                />
                <PieChart
                  title="Trạng thái task tồn"
                  data={analytics!.backlog}
                  compact
                  hoverBreakdown={(label) => {
                    const rows = analytics!.sla.openAgingRows.filter((row) =>
                      matchesGroup(row.task.status, label),
                    );
                    return { title: `${label} · phân bổ theo Aging`, data: groupCount(rows, (row) => agingBucket(row.days)) };
                  }}
                  help={{
                    ...dashboardHelp("Trạng thái task tồn"),
                    note: `Mốc task tồn đang chọn: ${formatDate(inputDate(backlogDate))}. Task chưa có ngày bắt đầu không nằm trong chỉ số này; trạng thái dùng là trạng thái hiện tại.`,
                  }}
                  onSelect={(label) => setDetail({
                    title: `Task tồn · ${label}`,
                    subtitle: `Task tồn trước mốc ${formatDate(inputDate(backlogDate))}`,
                    tasks: analytics!.backlogTasks.filter((task) =>
                      matchesGroup(task.status, label),
                    ),
                  })}
                />
              </div>

              <article className="checkingCard">
                <div className="checkingHeader">
                  <div>
                    <span className="chartKicker">CHECKING / REVIEWING</span>
                    <h3>Tốc độ tiếp nhận và kiểm duyệt task</h3>
                  </div>
                  <small>
                    Chỉ giữ luồng Checking → Done. Số phút tính trong giờ làm
                    việc; P50 là trung vị và P90 là mức 90% task không vượt quá.
                  </small>
                  <HelpButton help={dashboardHelp("Checking → Done · P50")} />
                </div>
                <div className="checkingMetrics">
                  <SlaMetricCard
                    kicker="TOÀN BỘ THỜI GIAN KIỂM DUYỆT"
                    title="Từ chuyển Checking đến hoàn thành"
                    value={formatSlaMinutes(analytics!.sla.checkingToDoneP50)}
                    note={`50% task không vượt quá mức trên · 90% không vượt quá ${formatSlaMinutes(analytics!.sla.checkingToDoneP90)} · Mẫu ${formatNumber(analytics!.sla.checkingToDoneRows.length)} task`}
                    help={dashboardHelp("Checking → Done · P50")}
                    onExpand={() =>
                      setPercentileDetail({
                        title: "Checking → hoàn thành",
                        subtitle: "Toàn bộ thời gian kiểm duyệt trong giờ làm việc.",
                        metricLabel: "Thời gian Checking → Done",
                        observations: analytics!.sla.checkingToDoneRows.map((row) => ({ task: row.task, value: row.minutes })),
                        unit: "minutes",
                      })
                    }
                    onClick={() => setDetail({
                      title: "Checking → Done",
                      subtitle: "Task hoàn thành trong kỳ có đủ hai mốc",
                      tasks: analytics!.sla.checkingToDoneRows.map((row) => row.task),
                    })}
                  />
              </div>
              </article>

              <div className="slaChartGrid">
                <PieChart
                  title="Đối chiếu kế hoạch với định mức 1.7"
                  data={analytics!.sla.normDistribution}
                  compact
                  onSelect={(label) => setDetail({
                    title: `Kế hoạch phút · ${label}`,
                    subtitle: "Đối chiếu phút dự kiến với chuẩn tham chiếu theo Format Type/Công đoạn; không phải thời gian làm thực tế",
                    tasks: analytics!.sla.normRows
                      .filter((row) => row.label === label)
                      .map((row) => row.task),
                  })}
                />
                <article className="normSummary">
                  <HelpButton help={dashboardHelp("Đối chiếu kế hoạch với định mức 1.7")} />
                  <span className="chartKicker">ĐỐI CHIẾU KẾ HOẠCH</span>
                  <h3>Phút dự kiến và phút chuẩn tham chiếu</h3>
                  <div className="normDisclaimer">
                    <strong>Không phải đánh giá năng suất thực tế</strong>
                    <span>
                      Chưa có thời điểm bắt đầu và hoàn thành công việc thực tế,
                      nên các số liệu dưới đây chỉ so sánh kế hoạch nhập trên
                      Tasklist với bảng chuẩn 1.7.
                    </span>
                  </div>
                  <div>
                    <span>
                      <small>PHÚT DỰ KIẾN TRÊN TASKLIST</small>
                      <strong>{formatNumber(analytics!.sla.normExpectedMinutes)}</strong>
                      <em>{formatWorkDays(analytics!.sla.normExpectedMinutes)}</em>
                    </span>
                    <span>
                      <small>PHÚT CHUẨN THAM CHIẾU 1.7</small>
                      <strong>{formatNumber(analytics!.sla.normStandardMinutes)}</strong>
                      <em>{formatWorkDays(analytics!.sla.normStandardMinutes)}</em>
                    </span>
                  </div>
                  <p>
                    Chỉ đối chiếu các task map được Format Type và Công đoạn.
                    Quy đổi 480 phút bằng một ngày công chỉ để dễ đọc tổng tải
                    kế hoạch, không phải số ngày làm thực tế.
                  </p>
                </article>
              </div>
            </section>
          </section>

          <section className="logicNote">
            <span>LOGIC TEST V0.1</span>
            <p>
              &quot;Tổng task trong kỳ&quot; là hợp khử trùng của task có Ngày Bắt Đầu,
              Ngày Kiểm Duyệt carry-in hoặc Ngày Hoàn Thành carry-in nằm trong
              bộ lọc. Ngày Kiểm Duyệt phản ánh mốc người làm bàn giao; Ngày
              Hoàn Thành phản ánh toàn quy trình và có ảnh hưởng của người
              đánh giá.
            </p>
          </section>
        </>
      )}
      {detail && <DetailDrawer detail={detail} onClose={() => setDetail(null)} />}
      {percentileDetail && (
        <PercentileDialog
          detail={percentileDetail}
          onClose={() => setPercentileDetail(null)}
          onSelect={(label, note, observations) => {
            const selectedPercentile = percentileDetail;
            setDetail({
              title: `${selectedPercentile.title} · ${label}`,
              subtitle: `${note} · ${formatNumber(observations.length)} task`,
              tasks: observations.map((observation) => observation.task),
              taskMetric: {
                label: selectedPercentile.metricLabel,
                value: (task) =>
                  observations.find(
                    (observation) => observation.task === task,
                  )?.value ?? 0,
                format: (value) =>
                  formatDistributionValue(value, selectedPercentile.unit),
              },
            });
          }}
        />
      )}
      {reportDepartment && (
        <div
          className="reportPanelOverlay"
          role="presentation"
          onMouseDown={() => setReportDepartment(null)}
        >
          <aside
            className="reportPanel"
            role="dialog"
            aria-modal="true"
            aria-label={`Báo cáo ${reportDepartment === "media" ? "Media" : "Kinh doanh"}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="chartKicker">BÁO CÁO THEO PHÒNG BAN</span>
                <h2>{reportDepartment === "media" ? "Media" : "Kinh doanh"}</h2>
              </div>
              <button type="button" onClick={() => setReportDepartment(null)}>×</button>
            </header>
            <div className="savedReportList">
              {savedReports.filter((report) => report.department === reportDepartment).length ? (
                savedReports
                  .filter((report) => report.department === reportDepartment)
                  .map((report) => (
                    <article className="savedReportItem" key={report.id}>
                      <button type="button" onClick={() => applySavedReport(report)}>
                        <strong>{report.name}</strong>
                        <span>
                          {report.filters.dateFrom || report.filters.dateTo
                            ? `${report.filters.dateFrom || "Đầu kỳ"} → ${report.filters.dateTo || "Hiện tại"}`
                            : "Toàn bộ thời gian"}
                        </span>
                        <small>
                          Đã lưu {new Intl.DateTimeFormat("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(report.createdAt))}
                        </small>
                      </button>
                      <button
                        type="button"
                        className="deleteReportButton"
                        aria-label={`Xóa báo cáo ${report.name}`}
                        onClick={() => deleteSavedReport(report.id)}
                      >
                        ×
                      </button>
                    </article>
                  ))
              ) : (
                <div className="savedReportEmpty">
                  <span>◎</span>
                  <strong>Chưa có báo cáo đã lưu</strong>
                  <p>Thiết lập bộ lọc rồi chọn &quot;Lưu báo cáo&quot; để thêm vào đây.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      {saveReportOpen && (
        <div
          className="saveReportOverlay"
          role="presentation"
          onMouseDown={closeSaveReport}
        >
          <form
            className="saveReportModal"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              saveCurrentReport();
            }}
          >
            <span className="chartKicker">LƯU CẤU HÌNH HIỆN TẠI</span>
            <h2>Đặt tên báo cáo</h2>
            <p>Bộ lọc và các tùy chọn biểu đồ hiện tại sẽ được lưu trên thiết bị này.</p>
            <label>
              Tên báo cáo
              <input
                autoFocus
                required
                maxLength={80}
                value={reportName}
                onChange={(event) => setReportName(event.target.value)}
                placeholder="Ví dụ: Báo cáo Media tuần 30"
              />
            </label>
            <fieldset>
              <legend>Phòng ban</legend>
              <button
                type="button"
                className={saveDepartment === "media" ? "active" : ""}
                onClick={() => setSaveDepartment("media")}
              >
                Media
              </button>
              <button
                type="button"
                className={saveDepartment === "business" ? "active" : ""}
                onClick={() => setSaveDepartment("business")}
              >
                Kinh doanh
              </button>
            </fieldset>
            <div className="saveReportActions">
              <button type="button" onClick={closeSaveReport}>Hủy</button>
              <button type="submit" disabled={!reportName.trim()}>Lưu báo cáo</button>
            </div>
          </form>
        </div>
      )}
    </main>
    </HelpProvider>
  );
}
