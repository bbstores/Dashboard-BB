import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { calculateDashboardStats } from "../features/dashboard/analytics/calculateDashboardStats";
import { DashboardFilters } from "../features/dashboard/components/DashboardFilters";
import { DashboardKpis } from "../features/dashboard/components/DashboardKpis";
import { DetailDrawer } from "../features/dashboard/dialogs/DetailDrawer";
import type {
  DetailView,
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
      reportDepartment="business"
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

test("KPI selection opens the matching detail data", () => {
  const selectedTask = task();
  selectedTask.receivedStartDate = new Date(2026, 6, 20, 9, 5);
  const stats = calculateDashboardStats(
    {
      fileName: "anonymous.xlsx",
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
