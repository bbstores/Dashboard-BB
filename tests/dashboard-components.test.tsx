import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { calculateDashboardStats } from "../features/dashboard/analytics/calculateDashboardStats";
import { DashboardFilters } from "../features/dashboard/components/DashboardFilters";
import { DashboardHeader } from "../features/dashboard/components/DashboardHeader";
import { DashboardKpis } from "../features/dashboard/components/DashboardKpis";
import { DailyTaskChart } from "../features/dashboard/components/DailyTaskChart";
import { DetailDrawer } from "../features/dashboard/dialogs/DetailDrawer";
import { PercentileDialog } from "../features/dashboard/dialogs/PercentileDialog";
import { PostingSection } from "../features/dashboard/sections/PostingSection";
import type {
  DetailView,
  PublicationPost,
  ReportDepartment,
  Task,
} from "../features/dashboard/model/types";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});

Object.defineProperties(globalThis, {
  window: { configurable: true, value: dom.window },
  document: { configurable: true, value: dom.window.document },
  navigator: { configurable: true, value: dom.window.navigator },
  HTMLElement: { configurable: true, value: dom.window.HTMLElement },
  Node: { configurable: true, value: dom.window.Node },
  Event: { configurable: true, value: dom.window.Event },
  MutationObserver: {
    configurable: true,
    value: dom.window.MutationObserver,
  },
});

const { cleanup, fireEvent, render, screen } = await import(
  "@testing-library/react"
);

afterEach(cleanup);

function task(): Task {
  return {
    code: "ANON-DETAIL-001",
    title: "Anonymous detail task",
    stage: "Edit",
    formatType: "Video",
    productCode: "",
    collection: "",
    expectedMinutes: 60,
    status: "In Progress",
    assignee: "Nhân sự A",
    startDate: new Date(2026, 6, 20, 9),
    completedDate: null,
    inspectionDate: null,
    businessApprovalDate: null,
    handoffRating: "",
    overallRating: "",
    type: "Social",
    outsource: "",
  };
}

test("DashboardFilters emits typed filter actions", () => {
  const changes: string[] = [];
  let cleared = false;
  let saveDepartment: ReportDepartment | null = null;

  render(
    <DashboardFilters
      dateFrom=""
      dateTo=""
      backlogDate="2026-07-27"
      hasDateFilter
      department="business"
      onDateFromChange={(value) => changes.push(`from:${value}`)}
      onDateToChange={(value) => changes.push(`to:${value}`)}
      onBacklogDateChange={(value) => changes.push(`backlog:${value}`)}
      onClearDateFilter={() => {
        cleared = true;
      }}
      onOpenSaveReport={(department) => {
        saveDepartment = department;
      }}
    />,
  );

  fireEvent.change(screen.getByLabelText("Từ ngày"), {
    target: { value: "2026-07-01" },
  });
  fireEvent.change(screen.getByLabelText("Đến ngày"), {
    target: { value: "2026-07-31" },
  });
  fireEvent.change(screen.getByLabelText(/Mốc task tồn/), {
    target: { value: "2026-07-30" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Xóa lọc" }));
  fireEvent.click(
    screen.getByRole("button", { name: /Lưu báo cáo/ }),
  );

  assert.deepEqual(changes, [
    "from:2026-07-01",
    "to:2026-07-31",
    "backlog:2026-07-30",
  ]);
  assert.equal(cleared, true);
  assert.equal(saveDepartment, "business");
});

test("DashboardHeader switches dashboard and opens saved reports separately", () => {
  let activeDepartment: ReportDepartment = "media";
  let openedReports: ReportDepartment | null = null;
  let comparisonOpened = false;
  const inputRef = { current: null };

  render(
    <DashboardHeader
      fileRef={inputRef}
      loading={false}
      hasData
      activeDepartment="media"
      comparisonActive={false}
      reportCounts={{ media: 2, business: 3 }}
      onDepartmentChange={(department) => {
        activeDepartment = department;
      }}
      onOpenSavedReports={(department) => {
        openedReports = department;
      }}
      onOpenComparison={() => {
        comparisonOpened = true;
      }}
      onFileSelected={() => undefined}
    />,
  );

  const mediaTab = screen.getByRole("button", { name: "Media" });
  const businessTab = screen.getByRole("button", {
    name: "Kinh doanh",
  });
  assert.equal(mediaTab.getAttribute("aria-pressed"), "true");
  assert.equal(businessTab.getAttribute("aria-pressed"), "false");

  fireEvent.click(businessTab);
  assert.equal(activeDepartment, "business");
  assert.equal(openedReports, null);

  fireEvent.click(
    screen.getByRole("button", {
      name: "Báo cáo đã lưu của Media",
    }),
  );
  assert.equal(openedReports, "media");

  fireEvent.click(screen.getByRole("button", { name: "So sánh" }));
  assert.equal(comparisonOpened, true);
});

test("DashboardFilters hides task backlog date on business dashboard", () => {
  render(
    <DashboardFilters
      dateFrom=""
      dateTo=""
      backlogDate="2026-07-27"
      hasDateFilter={false}
      department="business"
      showBacklogDate={false}
      onDateFromChange={() => undefined}
      onDateToChange={() => undefined}
      onBacklogDateChange={() => undefined}
      onClearDateFilter={() => undefined}
      onOpenSaveReport={() => undefined}
    />,
  );

  assert.equal(screen.queryByLabelText(/Mốc task tồn/), null);
  assert.ok(screen.getByLabelText("Từ ngày"));
  assert.ok(screen.getByLabelText("Đến ngày"));
});

test("KPI selection opens the matching detail data", () => {
  const selectedTask = task();
  selectedTask.receivedStartDate = new Date(2026, 6, 20, 9, 5);
  const stats = calculateDashboardStats(
    {
      fileName: "anonymous.xlsx",
      publications: [],
      tasks: [selectedTask],
      feedback: [],
      norms: [],
    },
    {
      dateWindow: { from: null, to: null, hasFilter: false },
      collectionMonth: "",
      backlogDate: "2026-07-27",
    },
  );
  const detailState: { current: DetailView | null } = { current: null };

  render(
    <DashboardKpis
      viewModel={stats}
      allTasks={[selectedTask]}
      backlogDate="2026-07-27"
      onOpenDetail={(detail) => {
        detailState.current = detail;
      }}
    />,
  );

  const taskInPeriod = screen.getByText("Task trong kỳ").closest("button");
  assert.ok(taskInPeriod);
  fireEvent.click(taskInPeriod);
  assert.ok(detailState.current);
  assert.equal(detailState.current.title, "Task trong kỳ");
  assert.deepEqual(detailState.current.tasks, [selectedTask]);

  cleanup();
  let closed = false;
  render(
    <DetailDrawer
      detail={detailState.current}
      onClose={() => {
        closed = true;
      }}
    />,
  );

  assert.ok(screen.getByText("ANON-DETAIL-001"));
  assert.ok(screen.getByText("Anonymous detail task"));
  assert.ok(screen.getByText("09:05 20/07/2026"));
  fireEvent.click(
    screen.getByRole("button", { name: "Đóng chi tiết" }),
  );
  assert.equal(closed, true);
});

test("attention KPI opens invalid Done chronology as standalone detail", () => {
  const backlogTask = task();
  const attentionTask = {
    ...task(),
    code: "ANON-ATTENTION-001",
    title: "Invalid chronology",
    status: "Done",
    startDate: new Date(2026, 6, 20),
    inspectionDate: new Date(2026, 6, 19),
    completedDate: new Date(2026, 6, 19),
  };
  const stats = calculateDashboardStats(
    {
      fileName: "attention.xlsx",
      publications: [],
      tasks: [backlogTask, attentionTask],
      feedback: [],
      norms: [],
    },
    {
      dateWindow: { from: null, to: null, hasFilter: false },
      collectionMonth: "",
      backlogDate: "2026-07-20",
    },
  );
  const detailState: { current: DetailView | null } = { current: null };

  render(
    <DashboardKpis
      viewModel={stats}
      allTasks={[backlogTask, attentionTask]}
      backlogDate="2026-07-20"
      onOpenDetail={(detail) => {
        detailState.current = detail;
      }}
    />,
  );

  const attentionKpi = screen
    .getByText("Dữ liệu cần lưu ý")
    .closest("button");
  assert.ok(attentionKpi);
  fireEvent.click(attentionKpi);
  assert.ok(detailState.current);
  assert.equal(detailState.current.title, "Dữ liệu cần lưu ý");
  assert.deepEqual(detailState.current.tasks, [attentionTask]);

  cleanup();
  render(
    <DetailDrawer
      detail={detailState.current}
      onClose={() => undefined}
    />,
  );

  assert.ok(screen.getByText("ANON-ATTENTION-001"));
  assert.equal(screen.queryByText("ANON-DETAIL-001"), null);
});

test("P50 selects P1 through P50 and sorts observations ascending", () => {
  const observations = [8, 1, 5, 2, 13, 3].map((value, index) => ({
    task: {
      ...task(),
      code: `ANON-PERCENTILE-${index + 1}`,
    },
    value,
  }));
  let selected:
    | Array<{ task: Task; value: number }>
    | undefined;

  render(
    <PercentileDialog
      detail={{
        title: "Cycle time hoàn thành",
        subtitle: "Kiểm thử phân vị",
        metricLabel: "Cycle time",
        observations,
        unit: "days",
      }}
      onClose={() => undefined}
      onSelect={(_label, _note, selection) => {
        selected = selection;
      }}
    />,
  );

  const p50Card = screen.getByRole("button", {
    name: "P503 ngàyCác task từ P1 đến P50Xem task →",
  });
  fireEvent.click(p50Card);

  assert.deepEqual(
    selected?.map((observation) => observation.value),
    [1, 2, 3],
  );
});

test("monthly daily chart keeps all 31 date labels readable", () => {
  const rows = Array.from({ length: 31 }, (_, index) => ({
    date: new Date(2026, 6, index + 1),
    assigned: index,
    handedSameDay: 0,
    handedBacklog: 0,
    backlog: index,
    assignedTasks: [],
    handedSameDayTasks: [],
    handedBacklogTasks: [],
    backlogTasks: [],
  }));

  const { container } = render(
    <DailyTaskChart
      rows={rows}
      assignees={[]}
      assignee=""
      onAssigneeChange={() => undefined}
    />,
  );

  const chart = container.querySelector(".dailyChartSvg");
  assert.ok(chart);
  assert.equal(chart.getAttribute("style"), "min-width: 1860px;");
  assert.ok(screen.getByText("01/07"));
  assert.ok(screen.getByText("02/07"));
  assert.ok(screen.getByText("31/07"));
});

test("posting section shows source mix and counts multi-platform posts independently", () => {
  const videoTask = {
    ...task(),
    code: "VIDEO-POST",
    startDate: new Date(2026, 6, 10, 9),
    publicationIds: ["POST-1", "POST-3"],
  };
  const scheduledUnpostedTask = {
    ...task(),
    code: "VIDEO-NOT-POSTED",
    startDate: new Date(2026, 6, 10, 9),
    publicationIds: ["POST-MISSING"],
  };
  const recentGraphicTask = {
    ...task(),
    code: "GRAPHIC-NOT-SCHEDULED",
    stage: "Graphic Design",
    formatType: "Ảnh Post",
    startDate: new Date(2026, 6, 11, 9),
    publicationIds: [],
  };
  const noSocialTask = {
    ...task(),
    code: "VIDEO-NO-SOCIAL",
    startDate: new Date(2026, 6, 10, 9),
    platform: "Không Đăng Social",
    publicationIds: ["POST-NO-SOCIAL"],
  };
  const publications: PublicationPost[] = [
    {
      id: "POST-1",
      scheduledAt: new Date(2026, 6, 10, 9),
      platform: "Facebook",
      posted: true,
      postType: "Reels",
      title: "Facebook reel",
      bookTaskCode: "VIDEO-POST",
    },
    {
      id: "POST-2",
      scheduledAt: new Date(2026, 6, 11, 9),
      platform: "Facebook",
      posted: false,
      postType: "Ảnh Post",
      title: "Facebook photo",
      bookTaskCode: "",
    },
    {
      id: "POST-3",
      scheduledAt: new Date(2026, 6, 11, 10),
      platform: "TikTok",
      posted: true,
      postType: "Video",
      title: "TikTok video",
      bookTaskCode: "VIDEO-POST",
    },
    {
      id: "POST-NO-SOCIAL",
      scheduledAt: new Date(2026, 6, 10, 10),
      platform: "Không Đăng Social",
      posted: false,
      postType: "Video",
      title: "Không dùng cho social",
      bookTaskCode: "VIDEO-NO-SOCIAL",
    },
  ];
  const postingDetailState: { current: DetailView | null } = {
    current: null,
  };
  const { container } = render(
    <PostingSection
      tasks={[
        videoTask,
        scheduledUnpostedTask,
        recentGraphicTask,
        noSocialTask,
      ]}
      publications={publications}
      dateWindow={{
        from: new Date(2026, 6, 10),
        to: new Date(2026, 6, 11, 23, 59, 59, 999),
        hasFilter: true,
      }}
      onOpenDetail={(detail) => {
        postingDetailState.current = detail;
      }}
    />,
  );

  assert.ok(screen.getByText("Nguồn bài đăng"));
  assert.ok(screen.getAllByText("Bài reup").length >= 1);
  assert.ok(screen.getAllByText("Media · Video").length >= 1);
  assert.ok(screen.getAllByText("Facebook").length >= 1);
  assert.ok(screen.getAllByText("TikTok").length >= 1);
  assert.ok(screen.getByText("Bài đăng theo nền tảng"));
  assert.ok(
    screen.getByText(
      "Dữ liệu cần kiểm tra · Không Đăng Social",
    ),
  );
  assert.ok(screen.getByText("Bài đăng dùng media"));
  assert.ok(screen.getByText("Tình trạng lên lịch ấn phẩm"));
  assert.equal(
    screen.queryByText("TASKLIST CHƯA CÓ ĐĂNG BÀI"),
    null,
  );
  assert.ok(
    screen.getByText("Tình trạng đăng của task đã lên lịch"),
  );
  assert.ok(screen.getByText("BẮT ĐẦU TỪ 01/07/2026"));
  assert.match(
    container.querySelector(".postingKpiTooltip")?.textContent ?? "",
    /1 task.*0 video.*1 hình/,
  );
  assert.ok(screen.getByText("Chưa đăng"));
  assert.ok(
    screen.getByText("2 bài video · 0 bài hình · từ 1 task gốc"),
  );
  assert.match(
    screen.getByText(/Một task đăng Facebook và TikTok/).textContent ?? "",
    /hai bài/,
  );
  assert.equal(
    container.querySelectorAll(".postingPlatformGroup").length,
    2,
  );
  for (const group of container.querySelectorAll(
    ".postingPlatformGroup",
  )) {
    assert.equal(
      group.querySelectorAll(".postingPlatformColumn").length,
      3,
    );
  }
  assert.equal(
    container.querySelector(".postingPlatformTrack"),
    null,
  );
  assert.match(
    container
      .querySelector(".postingTrend.total")
      ?.getAttribute("d") ?? "",
    /\bC\b/,
  );

  const totalKpi = Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      ".postingKpiCard",
    ),
  ).find((element) =>
    element.textContent?.startsWith("Tổng bài trong kỳ"),
  );
  assert.ok(totalKpi);
  fireEvent.click(totalKpi);
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-1", "POST-2", "POST-3"],
  );

  const mediaKpi = Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      ".postingKpiCard",
    ),
  ).find((element) =>
    element.textContent?.startsWith("Bài đăng dùng media"),
  );
  assert.ok(mediaKpi);
  fireEvent.click(mediaKpi);
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-1", "POST-3"],
  );

  const unscheduledKpi = Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      ".postingKpiCard",
    ),
  ).find((element) =>
    element.textContent?.startsWith("Chưa lên lịch"),
  );
  assert.ok(unscheduledKpi);
  fireEvent.click(unscheduledKpi);
  assert.deepEqual(
    postingDetailState.current?.tasks?.map((item) => item.code),
    ["GRAPHIC-NOT-SCHEDULED"],
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Lát biểu đồ Bài reup: 1 Bài đăng",
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-2"],
  );
  assert.equal(
    postingDetailState.current?.publicationEvidenceLabel,
    "Phân loại",
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Lát biểu đồ TikTok: 1 Bài đăng",
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-3"],
  );

  const noSocialMetric = screen
    .getByText("Dữ liệu cần kiểm tra · Không Đăng Social")
    .closest("button");
  assert.ok(noSocialMetric);
  fireEvent.click(
    noSocialMetric,
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-NO-SOCIAL"],
  );
  assert.equal(
    postingDetailState.current?.publicationEvidenceLabel,
    "Lý do kiểm tra",
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Facebook · Reup: 1 bài",
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-2"],
  );

  fireEvent.click(
    screen.getAllByRole("button", {
      name: "Facebook · Tất cả: 2 bài",
    })[0],
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-1", "POST-2"],
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Lát biểu đồ Chưa lên lịch: 1 Task ấn phẩm",
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.tasks?.map((item) => item.code),
    ["GRAPHIC-NOT-SCHEDULED"],
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Lát biểu đồ phụ Đã đăng: 1 Task",
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.tasks?.map((item) => item.code),
    ["VIDEO-POST"],
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: /Tổng bài ngày 11\/7\/2026: 2 bài/,
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-2", "POST-3"],
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: /Đã đăng ngày 11\/7\/2026: 1 bài/,
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-3"],
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Đường Tổng bài: 3 bài",
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-1", "POST-2", "POST-3"],
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Đường Đã đăng: 2 bài",
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-1", "POST-3"],
  );

  fireEvent.click(
    screen.getByRole("checkbox", { name: "Facebook" }),
  );
  assert.ok(
    screen.getByRole("button", {
      name: "Đường Tổng bài: 2 bài",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Đường Tổng bài: 2 bài",
    }),
  );
  assert.deepEqual(
    postingDetailState.current?.publicationEvidence?.map(
      (item) => item.post.id,
    ),
    ["POST-1", "POST-2"],
  );

  fireEvent.click(
    screen.getByRole("checkbox", { name: "TikTok" }),
  );
  assert.ok(
    screen.getByRole("button", {
      name: "Đường Tổng bài: 3 bài",
    }),
  );
  assert.ok(screen.getByText("Đang cộng: 2 nền tảng"));
});

test("posting data alert opens publication evidence", () => {
  const issueTask = {
    ...task(),
    code: "ISSUE-TASK",
    formatType: "Xào Source",
    publicationIds: ["ISSUE-POST"],
  };
  const detailState: { current: DetailView | null } = { current: null };
  render(
    <PostingSection
      tasks={[issueTask]}
      publications={[
        {
          id: "ISSUE-POST",
          scheduledAt: new Date(2026, 6, 10),
          platform: "Facebook",
          posted: true,
          postType: "Reels",
          title: "Bài cần kiểm tra",
          bookTaskCode: "ISSUE-TASK",
        },
      ]}
      dateWindow={{
        from: new Date(2026, 6, 1),
        to: new Date(2026, 6, 31, 23, 59, 59, 999),
        hasFilter: true,
      }}
      onOpenDetail={(detail) => {
        detailState.current = detail;
      }}
    />,
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: /1 bài cần kiểm tra dữ liệu/,
    }),
  );
  assert.ok(detailState.current);
  assert.equal(detailState.current.publicationEvidence?.length, 1);

  cleanup();
  render(
    <DetailDrawer
      detail={detailState.current}
      onClose={() => undefined}
    />,
  );
  assert.ok(screen.getByText("ISSUE-POST"));
  assert.ok(screen.getByText("ISSUE-TASK"));
  assert.ok(screen.getByText(/không phải Graphic Design/));
});
