import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("implements the requested task dashboard sections", async () => {
  const dashboard = await readFile(
    new URL("../app/dashboard.tsx", import.meta.url),
    "utf8",
  );

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
    assert.match(dashboard, new RegExp(expected));
  }
});

test("reads the workbook locally without embedding employee data", async () => {
  const [dashboard, readme] = await Promise.all([
    readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /type="file"/);
  assert.match(dashboard, /file\.arrayBuffer\(\)/);
  assert.match(dashboard, /"2\.6 Tasklist"/);
  assert.match(dashboard, /"2\.9 Lịch sử phản hồi Task"/);
  assert.doesNotMatch(dashboard, /\bfetch\s*\(/);
  assert.doesNotMatch(dashboard, /sessionStorage/);
  assert.match(dashboard, /bb-dashboard-saved-reports-v1/);
  assert.doesNotMatch(dashboard, /filters:\s*\{[^}]*tasks/s);
  assert.match(readme, /không được tải lên server/i);

  await assert.rejects(access(new URL("../.openai/hosting.json", import.meta.url)));
  await assert.rejects(access(new URL("../public/data", root)));
});
