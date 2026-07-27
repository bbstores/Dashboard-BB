import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
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

test("delegates dashboard state and persistence to feature hooks", async () => {
  const dashboardSource = await readFile(
    new URL("../features/dashboard/Dashboard.tsx", import.meta.url),
    "utf8",
  );
  const savedReportHook = await readFile(
    new URL(
      "../features/dashboard/saved-reports/useSavedReports.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(
    dashboardSource,
    /useState|useEffect|useMemo|useRef|localStorage|readDashboardWorkbook/,
  );
  assert.match(dashboardSource, /useDashboardFilters/);
  assert.match(dashboardSource, /useWorkbookData/);
  assert.match(dashboardSource, /useDashboardDialogs/);
  assert.match(dashboardSource, /useSavedReports/);
  assert.match(savedReportHook, /loadSavedReports/);
  assert.match(savedReportHook, /saveSavedReports/);
});

test("keeps phase 6 UI sections isolated behind typed view models", async () => {
  const dashboardSource = await readFile(
    new URL("../features/dashboard/Dashboard.tsx", import.meta.url),
    "utf8",
  );
  const sectionNames = [
    "OverviewSection",
    "PeopleSection",
    "CollectionSection",
    "PublicationSection",
    "SlaSection",
  ];
  const sectionSources = await Promise.all(
    sectionNames.map((name) =>
      readFile(
        new URL(`../features/dashboard/sections/${name}.tsx`, import.meta.url),
        "utf8",
      ),
    ),
  );
  const dialogNames = [
    "DetailDrawer",
    "HelpDialog",
    "PercentileDialog",
    "SavedReportsPanel",
    "SaveReportDialog",
  ];

  assert.ok(
    dashboardSource.split("\n").length - 1 <= 300,
    "Dashboard.tsx should remain an orchestration component under 300 lines",
  );
  for (const name of sectionNames) {
    assert.match(dashboardSource, new RegExp(`<${name}`));
  }
  for (const source of sectionSources) {
    assert.match(source, /viewModel|videoMetrics/);
    assert.doesNotMatch(
      source,
      /readDashboardWorkbook|useWorkbookData|useDashboardStats|exceljs/,
    );
  }
  assert.doesNotMatch(dashboardSource, /\banalytics=\{analytics\}/);
  await Promise.all(
    dialogNames.map((name) =>
      access(
        new URL(
          `../features/dashboard/dialogs/${name}.tsx`,
          import.meta.url,
        ),
      ),
    ),
  );
});

test("keeps phase 7 CSS scoped by dashboard ownership", async () => {
  const dashboardSource = await readFile(
    new URL("../features/dashboard/Dashboard.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const scopedStyles = [
    "features/dashboard/styles/dashboard.css",
    "features/dashboard/styles/filters.css",
    "features/dashboard/styles/charts.css",
    "features/dashboard/styles/dialogs.css",
    "features/dashboard/sections/sla/sla.css",
    "features/dashboard/sections/collection/collection.css",
    "features/dashboard/sections/publication/publication.css",
  ];

  assert.ok(
    globalsSource.split("\n").length - 1 <= 80,
    "globals.css should only contain reset, base styles and tokens",
  );
  assert.match(globalsSource, /:root/);
  assert.match(globalsSource, /box-sizing/);
  assert.doesNotMatch(
    globalsSource,
    /\.(?:dashboard|filterBar|chartCard|detailDrawer|slaSection)/,
  );
  for (const path of scopedStyles) {
    await access(new URL(`../${path}`, import.meta.url));
    assert.match(
      dashboardSource,
      new RegExp(
        path
          .replace("features/dashboard/", "./")
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ),
    );
  }
  await assert.rejects(
    access(
      new URL(
        "../features/dashboard/styles/sla.css",
        import.meta.url,
      ),
    ),
  );
});

test("targets Neon PostgreSQL for phase 8 persistence", async () => {
  const schema = await readFile(
    new URL("../db/schema.ts", import.meta.url),
    "utf8",
  );
  const client = await readFile(
    new URL("../db/client.ts", import.meta.url),
    "utf8",
  );
  const config = await readFile(
    new URL("../drizzle.config.ts", import.meta.url),
    "utf8",
  );
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const migrationFiles = (
    await readdir(new URL("../drizzle", import.meta.url))
  ).filter((name) => name.endsWith(".sql"));
  assert.equal(migrationFiles.length, 1);
  const migration = await readFile(
    new URL(`../drizzle/${migrationFiles[0]}`, import.meta.url),
    "utf8",
  );

  assert.match(schema, /drizzle-orm\/pg-core/);
  assert.match(schema, /pgTable/);
  assert.doesNotMatch(schema, /sqlite/);
  assert.match(config, /dialect:\s*"postgresql"/);
  assert.match(config, /DATABASE_URL_UNPOOLED/);
  assert.match(client, /@neondatabase\/serverless/);
  assert.match(client, /drizzle-orm\/neon-http/);
  assert.ok(packageJson.dependencies["@neondatabase/serverless"]);
  assert.equal(packageJson.dependencies.postgres, undefined);
  assert.match(migration, /timestamp with time zone/);
  assert.match(migration, /boolean DEFAULT true/);
});

test("keeps phase 9 tests and generated files clean", async () => {
  const gitignore = await readFile(
    new URL("../.gitignore", import.meta.url),
    "utf8",
  );
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const requiredTests = [
    "dashboard-analytics.test.ts",
    "date-sla.test.ts",
    "excel-adapter.test.ts",
    "saved-reports.test.ts",
    "workbook-integration.test.ts",
    "dashboard-components.test.tsx",
    "database-schema.test.ts",
  ];

  assert.match(gitignore, /tsconfig\.tsbuildinfo/);
  assert.match(gitignore, /tsc_errors\.log/);
  assert.match(packageJson.scripts["check:unused"], /knip/);
  for (const name of requiredTests) {
    await access(new URL(`../tests/${name}`, import.meta.url));
  }
  await assert.rejects(
    access(new URL("../tsconfig.tsbuildinfo", import.meta.url)),
  );
  await assert.rejects(
    access(new URL("../tsc_errors.log", import.meta.url)),
  );
});
