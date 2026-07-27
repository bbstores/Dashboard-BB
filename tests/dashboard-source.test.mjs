import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("implements the requested task dashboard sections", async () => {
  const { execSync } = await import("child_process");
  const dashboardSource = execSync(
    "find app features shared -type f \\( -name '*.ts' -o -name '*.tsx' \\) -print0 | xargs -0 cat",
  ).toString();

  for (const expected of [
    "Leaderboard thời gian",
    "Số task thực hiện &amp; số lần trả về",
    "Thiếu ngày bắt đầu hoặc assignee",
    "Tiến độ hoàn thành",
    "Tình trạng task",
    "Đánh giá bàn giao",
    "Đánh giá tổng",
    "Task tồn",
    "Task theo Type",
    "Task theo công đoạn",
  ]) {
    assert.match(dashboardSource, new RegExp(expected));
  }
});

test("reads the workbook locally without embedding employee data", async () => {
  const { execSync } = await import("child_process");
  const dashboardSource = execSync(
    "find app features shared -type f \\( -name '*.ts' -o -name '*.tsx' \\) -print0 | xargs -0 cat",
  ).toString();
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(dashboardSource, /type="file"/);
  assert.match(dashboardSource, /file\.arrayBuffer\(\)/);
  assert.match(dashboardSource, /readDashboardWorkbook/);
  assert.match(dashboardSource, /validateDashboardWorkbook/);
  assert.match(dashboardSource, /thiếu cột bắt buộc/);
  assert.match(dashboardSource, /"2\.6 Tasklist"|'2\.6 Tasklist'/);
  assert.match(dashboardSource, /"2\.9 Lịch sử phản hồi Task"|'2\.9 Lịch sử phản hồi Task'/);
  assert.doesNotMatch(dashboardSource, /\bfetch\s*\(/);
  assert.doesNotMatch(dashboardSource, /sessionStorage/);
  assert.match(dashboardSource, /bb-dashboard-saved-reports-v1/);
  assert.doesNotMatch(dashboardSource, /filters:\s*\{[^}]*tasks/s);
  assert.match(readme, /không được tải lên server/i);

  await assert.rejects(access(new URL("../.openai/hosting.json", import.meta.url)));
  await assert.rejects(access(new URL("../public/data", root)));
});

test("keeps dashboard analytics independent from React", async () => {
  const { execSync } = await import("child_process");
  const analyticsSource = execSync(
    "find features/dashboard/analytics -type f -name '*.ts' -print0 | xargs -0 cat",
  ).toString();
  const dashboardHook = await readFile(
    new URL("../features/dashboard/hooks/useDashboardStats.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(analyticsSource, /from [\"']react[\"']/);
  assert.match(dashboardHook, /calculateDashboardStats/);
  assert.doesNotMatch(dashboardHook, /classifyTask|groupCount|evaluateHandoff/);
});
