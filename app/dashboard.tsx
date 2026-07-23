"use client";

import { useMemo, useRef, useState } from "react";

type Task = {
  code: string;
  title: string;
  stage: string;
  formatType: string;
  productCode: string;
  collection: string;
  expectedMinutes: number;
  status: string;
  assignee: string;
  startDate: Date | null;
  completedDate: Date | null;
  handoffRating: string;
  overallRating: string;
  type: string;
};

type Feedback = {
  taskCode: string;
  at: Date | null;
  assignee: string;
};

type DashboardData = {
  tasks: Task[];
  feedback: Feedback[];
  fileName: string;
};

type DateWindow = {
  from: Date | null;
  to: Date | null;
  hasFilter: boolean;
};

type PieDatum = { label: string; value: number };

const COLORS = [
  "#174f3d",
  "#8fbf45",
  "#d9ff72",
  "#f3b562",
  "#d46b5f",
  "#79a7a0",
  "#7b72b7",
  "#b7a992",
  "#325d88",
  "#cd7da4",
];

const EXCLUDED_BACKLOG_STATUSES = new Set([
  "done",
  "archived",
  "pending / cancel",
  "pending/cancel",
  "kinh doanh done",
]);

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedKey(value: unknown) {
  return normalize(value).toLocaleLowerCase("vi");
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function inputDate(value: string, end = false) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return end ? endOfDay(date) : startOfDay(date);
}

function excelDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const utc = Math.round((value - 25569) * 86400 * 1000);
    const date = new Date(utc);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object") {
    const candidate = value as {
      result?: unknown;
      text?: string;
      richText?: Array<{ text?: string }>;
    };
    if (candidate.result != null) return excelDate(candidate.result);
    if (candidate.text) return excelDate(candidate.text);
    if (candidate.richText) {
      return excelDate(candidate.richText.map((item) => item.text ?? "").join(""));
    }
  }

  const text = normalize(value);
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const ymd = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cellValue(value: unknown): unknown {
  if (value == null) return "";
  if (value instanceof Date || typeof value !== "object") return value;
  const cell = value as {
    result?: unknown;
    text?: string;
    hyperlink?: string;
    richText?: Array<{ text?: string }>;
  };
  if (cell.result != null) return cell.result;
  if (cell.text != null) return cell.text;
  if (cell.richText) return cell.richText.map((item) => item.text ?? "").join("");
  if (cell.hyperlink) return cell.hyperlink;
  return String(value);
}

function inWindow(date: Date | null, window: DateWindow) {
  if (!window.hasFilter) return true;
  if (!date) return false;
  if (window.from && date < window.from) return false;
  if (window.to && date > window.to) return false;
  return true;
}

function classifyTask(task: Task, window: DateWindow) {
  if (!window.hasFilter) {
    return {
      included: true,
      started: Boolean(task.startDate),
      carried: false,
    };
  }
  const started = inWindow(task.startDate, window);
  const carried =
    Boolean(task.completedDate) &&
    inWindow(task.completedDate, window) &&
    Boolean(task.startDate) &&
    !inWindow(task.startDate, window);
  return { included: started || carried, started, carried };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatHours(minutes: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(minutes / 60)} giờ`;
}

function groupCount<T>(rows: T[], key: (row: T) => string) {
  const result = new Map<string, number>();
  for (const row of rows) {
    const label = normalize(key(row)) || "Chưa xác định";
    result.set(label, (result.get(label) ?? 0) + 1);
  }
  return [...result.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function monthFromTask(task: Task) {
  const collectionMonth = task.collection.match(/(\d{2}\.\d{4})/);
  if (collectionMonth) return collectionMonth[1];
  if (!task.startDate) return "";
  return `${String(task.startDate.getMonth() + 1).padStart(2, "0")}.${task.startDate.getFullYear()}`;
}

function PieChart({
  title,
  data,
  centerLabel,
  compact = false,
}: {
  title: string;
  data: PieDatum[];
  centerLabel?: string;
  compact?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient = total
    ? data
        .map((item, index) => {
          const start = (cursor / total) * 100;
          cursor += item.value;
          const end = (cursor / total) * 100;
          return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
        })
        .join(",")
    : "#e4e3dc 0 100%";

  return (
    <article className={`chartCard pieCard ${compact ? "compact" : ""}`}>
      <div className="chartTitle">
        <div>
          <span className="chartKicker">PHÂN BỔ</span>
          <h3>{title}</h3>
        </div>
        <strong>{formatNumber(total)}</strong>
      </div>
      <div className="pieLayout">
        <div className="pie" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="pieHole">
            <strong>{formatNumber(total)}</strong>
            <span>{centerLabel ?? "task"}</span>
          </div>
        </div>
        <div className="legend">
          {data.slice(0, 10).map((item, index) => (
            <div className="legendRow" key={item.label}>
              <i style={{ background: COLORS[index % COLORS.length] }} />
              <span title={item.label}>{item.label}</span>
              <strong>{formatNumber(item.value)}</strong>
            </div>
          ))}
          {!data.length && <p className="emptyText">Chưa có dữ liệu phù hợp.</p>}
        </div>
      </div>
    </article>
  );
}

function ProgressDonut({
  title,
  done,
  total,
  unit,
}: {
  title: string;
  done: number;
  total: number;
  unit: string;
}) {
  const percent = total ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div className="progressPanel">
      <div
        className="progressDonut"
        style={{
          background: `conic-gradient(var(--lime) 0 ${percent}%, rgba(255,255,255,.16) ${percent}% 100%)`,
        }}
      >
        <div>
          <strong>{Math.round(percent)}%</strong>
          <span>hoàn thành</span>
        </div>
      </div>
      <div>
        <span className="chartKicker">{title}</span>
        <h3>
          {formatNumber(done)} <small>/ {formatNumber(total)} {unit}</small>
        </h3>
      </div>
    </div>
  );
}

function HorizontalBars({
  title,
  subtitle,
  rows,
  format = formatNumber,
}: {
  title: string;
  subtitle: string;
  rows: PieDatum[];
  format?: (value: number) => string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <article className="chartCard">
      <div className="chartTitle">
        <div>
          <span className="chartKicker">{subtitle}</span>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="horizontalBars">
        {rows.slice(0, 15).map((row, index) => (
          <div className="horizontalRow" key={row.label}>
            <span className="rank">{String(index + 1).padStart(2, "0")}</span>
            <span className="barLabel" title={row.label}>{row.label}</span>
            <div className="barTrack">
              <i style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
            </div>
            <strong>{format(row.value)}</strong>
          </div>
        ))}
        {!rows.length && <p className="emptyText">Chưa có dữ liệu phù hợp.</p>}
      </div>
    </article>
  );
}

function StaffColumns({
  rows,
}: {
  rows: Array<{
    name: string;
    total: number;
    started: number;
    carried: number;
    feedback: number;
  }>;
}) {
  const max = Math.max(
    ...rows.flatMap((row) => [row.total, row.started, row.carried, row.feedback]),
    1,
  );
  return (
    <article className="chartCard fullWidth">
      <div className="chartTitle">
        <div>
          <span className="chartKicker">NHÂN SỰ</span>
          <h3>Số task thực hiện &amp; số lần trả về</h3>
        </div>
        <div className="columnLegend">
          <span><i className="c1" />Tổng task</span>
          <span><i className="c2" />Bắt đầu trong kỳ</span>
          <span><i className="c3" />Carry-in hoàn thành</span>
          <span><i className="c4" />Lần trả về</span>
        </div>
      </div>
      <div className="columnScroller">
        <div className="columnChart" style={{ minWidth: `${Math.max(780, rows.length * 94)}px` }}>
          {rows.map((row) => (
            <div className="columnGroup" key={row.name}>
              <div className="columns">
                {[row.total, row.started, row.carried, row.feedback].map((value, index) => (
                  <div
                    key={index}
                    className={`column c${index + 1}`}
                    style={{ height: `${Math.max(value ? 8 : 0, (value / max) * 220)}px` }}
                    title={`${value}`}
                  >
                    {value > 0 && <span>{value}</span>}
                  </div>
                ))}
              </div>
              <span className="columnName" title={row.name}>{row.name}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function Dashboard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [collectionMonth, setCollectionMonth] = useState("");
  const [backlogDate, setBacklogDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const dateWindow = useMemo<DateWindow>(
    () => ({
      from: inputDate(dateFrom),
      to: inputDate(dateTo, true),
      hasFilter: Boolean(dateFrom || dateTo),
    }),
    [dateFrom, dateTo],
  );

  async function loadWorkbook(file: File) {
    setLoading(true);
    setError("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const taskSheet = workbook.getWorksheet("2.6 Tasklist");
      const feedbackSheet = workbook.getWorksheet("2.9 Lịch sử phản hồi Task");
      if (!taskSheet || !feedbackSheet) {
        throw new Error(
          "Không tìm thấy sheet “2.6 Tasklist” hoặc “2.9 Lịch sử phản hồi Task”.",
        );
      }

      function headersFor(sheet: import("exceljs").Worksheet) {
        const headers = new Map<string, number>();
        sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
          headers.set(normalizedKey(cellValue(cell.value)), column);
        });
        return headers;
      }

      function valueAt(
        row: import("exceljs").Row,
        headers: Map<string, number>,
        name: string,
      ) {
        const column = headers.get(normalizedKey(name));
        return column ? cellValue(row.getCell(column).value) : "";
      }

      const taskHeaders = headersFor(taskSheet);
      const tasks: Task[] = [];
      for (let index = 2; index <= taskSheet.actualRowCount; index += 1) {
        const row = taskSheet.getRow(index);
        const code = normalize(valueAt(row, taskHeaders, "Công việc"));
        if (!code) continue;
        tasks.push({
          code,
          title: normalize(valueAt(row, taskHeaders, "Tên Task")),
          stage: normalize(valueAt(row, taskHeaders, "Công đoạn")),
          formatType: normalize(valueAt(row, taskHeaders, "Format Type")),
          productCode: normalize(valueAt(row, taskHeaders, "Mã sản phẩm")),
          collection: normalize(valueAt(row, taskHeaders, "Bộ Sưu Tập")),
          expectedMinutes: numberValue(
            valueAt(row, taskHeaders, "Số phút dự kiến"),
          ),
          status: normalize(valueAt(row, taskHeaders, "Trạng thái")),
          assignee: normalize(valueAt(row, taskHeaders, "Assignee")),
          startDate: excelDate(valueAt(row, taskHeaders, "Ngày Bắt Đầu")),
          completedDate: excelDate(
            valueAt(row, taskHeaders, "Ngày Hoàn Thành"),
          ),
          handoffRating: normalize(
            valueAt(row, taskHeaders, "Đánh Giá Bàn Giao"),
          ),
          overallRating: normalize(
            valueAt(row, taskHeaders, "Đánh Giá Tổng"),
          ),
          type: normalize(valueAt(row, taskHeaders, "Type")),
        });
      }

      const feedbackHeaders = headersFor(feedbackSheet);
      const feedback: Feedback[] = [];
      for (let index = 2; index <= feedbackSheet.actualRowCount; index += 1) {
        const row = feedbackSheet.getRow(index);
        const taskCode = normalize(valueAt(row, feedbackHeaders, "Task"));
        if (!taskCode) continue;
        feedback.push({
          taskCode,
          at: excelDate(valueAt(row, feedbackHeaders, "Thời Điểm")),
          assignee: normalize(
            valueAt(row, feedbackHeaders, "Người Làm Task"),
          ),
        });
      }

      setData({ tasks, feedback, fileName: file.name });
      setCollectionMonth("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể đọc file Excel này.",
      );
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const analytics = useMemo(() => {
    if (!data) return null;
    const classified = data.tasks.map((task) => ({
      task,
      ...classifyTask(task, dateWindow),
    }));
    const selectedTasks = classified
      .filter((item) => item.included)
      .map((item) => item.task);

    const leaderboard = new Map<string, number>();
    for (const task of selectedTasks) {
      const name = task.assignee || "Chưa có assignee";
      leaderboard.set(
        name,
        (leaderboard.get(name) ?? 0) + task.expectedMinutes,
      );
    }

    const taskByCode = new Map(data.tasks.map((task) => [task.code, task]));
    const feedbackCount = new Map<string, number>();
    for (const item of data.feedback) {
      if (!inWindow(item.at, dateWindow)) continue;
      const name = item.assignee || taskByCode.get(item.taskCode)?.assignee;
      if (!name) continue;
      feedbackCount.set(name, (feedbackCount.get(name) ?? 0) + 1);
    }

    const people = new Set<string>();
    classified.forEach((item) => {
      if (item.included && item.task.assignee) people.add(item.task.assignee);
    });
    feedbackCount.forEach((_, name) => people.add(name));

    const staffRows = [...people]
      .map((name) => {
        const rows = classified.filter(
          (item) => item.task.assignee === name && item.included,
        );
        return {
          name,
          total: rows.length,
          started: rows.filter((item) => item.started).length,
          carried: rows.filter((item) => item.carried).length,
          feedback: feedbackCount.get(name) ?? 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const months = [
      ...new Set(data.tasks.map(monthFromTask).filter(Boolean)),
    ].sort((a, b) => {
      const [am, ay] = a.split(".").map(Number);
      const [bm, by] = b.split(".").map(Number);
      return by - ay || bm - am;
    });

    const collectionTasks = collectionMonth
      ? data.tasks.filter((task) => monthFromTask(task) === collectionMonth)
      : [];
    const collectionDone = collectionTasks.filter(
      (task) => normalizedKey(task.status) === "done",
    );

    const backlogCutoff = inputDate(backlogDate, true) ?? endOfDay(new Date());
    const backlog = data.tasks.filter((task) => {
      if (!task.startDate || task.startDate > backlogCutoff) return false;
      return !EXCLUDED_BACKLOG_STATUSES.has(normalizedKey(task.status));
    });

    return {
      selectedTasks,
      leaderboard: [...leaderboard.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      staffRows,
      months,
      missingStart: data.tasks.filter((task) => !task.startDate).length,
      missingAssignee: data.tasks.filter((task) => !task.assignee).length,
      missingEither: data.tasks.filter(
        (task) => !task.startDate || !task.assignee,
      ).length,
      collection: {
        taskDone: collectionDone.length,
        taskTotal: collectionTasks.length,
        minuteDone: collectionDone.reduce(
          (sum, task) => sum + task.expectedMinutes,
          0,
        ),
        minuteTotal: collectionTasks.reduce(
          (sum, task) => sum + task.expectedMinutes,
          0,
        ),
      },
      status: groupCount(selectedTasks, (task) => task.status),
      handoff: groupCount(selectedTasks, (task) => task.handoffRating),
      overall: groupCount(selectedTasks, (task) => task.overallRating),
      types: groupCount(selectedTasks, (task) => task.type),
      stages: groupCount(selectedTasks, (task) => task.stage),
      backlog: groupCount(backlog, (task) => task.status),
      backlogTotal: backlog.length,
    };
  }, [data, dateWindow, collectionMonth, backlogDate]);

  return (
    <main className="dashboard">
      <header className="dashboardHeader">
        <div className="dashboardBrand">
          <span>BB</span>
          <div>
            <strong>Operations Intelligence</strong>
            <small>Task performance dashboard</small>
          </div>
        </div>
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
              ? `${formatNumber(data.tasks.length)} task · ${formatNumber(data.feedback.length)} phản hồi`
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
            <button
              className="clearButton"
              disabled={!dateWindow.hasFilter}
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
            >
              Xóa lọc
            </button>
          </section>

          <section className="kpiGrid">
            <article className="kpiCard dark">
              <span>Task trong kỳ</span>
              <strong>{formatNumber(analytics.selectedTasks.length)}</strong>
              <small>Bắt đầu trong kỳ + carry-in hoàn thành trong kỳ</small>
            </article>
            <article className="kpiCard">
              <span>Thiếu ngày bắt đầu hoặc assignee</span>
              <strong>{formatNumber(analytics.missingEither)}</strong>
              <small>{analytics.missingStart} thiếu ngày · {analytics.missingAssignee} thiếu assignee</small>
            </article>
            <article className="kpiCard lime">
              <span>Task tồn tại mốc chọn</span>
              <strong>{formatNumber(analytics.backlogTotal)}</strong>
              <small>Không tính Done, Archived, Pending/Cancel, Kinh Doanh Done</small>
            </article>
          </section>

          <section className="dashboardGrid">
            <HorizontalBars
              title="Leaderboard thời gian"
              subtitle="TỔNG PHÚT DỰ KIẾN THEO ASSIGNEE"
              rows={analytics.leaderboard}
              format={formatHours}
            />

            <article className="chartCard collectionCard">
              <div className="chartTitle">
                <div>
                  <span className="chartKicker">BỘ SƯU TẬP</span>
                  <h3>Tiến độ hoàn thành</h3>
                </div>
                <select
                  value={collectionMonth}
                  onChange={(event) => setCollectionMonth(event.target.value)}
                  aria-label="Chọn tháng bộ sưu tập"
                >
                  <option value="">Chọn tháng bắt buộc</option>
                  {analytics.months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              {collectionMonth ? (
                <div className="progressGrid">
                  <ProgressDonut
                    title="THEO SỐ TASK"
                    done={analytics.collection.taskDone}
                    total={analytics.collection.taskTotal}
                    unit="task"
                  />
                  <ProgressDonut
                    title="THEO TỔNG PHÚT"
                    done={analytics.collection.minuteDone}
                    total={analytics.collection.minuteTotal}
                    unit="phút"
                  />
                </div>
              ) : (
                <div className="selectPrompt">
                  <span>01</span>
                  <p>Chọn tháng để tính tiến độ từ các task thuộc Bộ Sưu Tập của tháng đó.</p>
                </div>
              )}
            </article>

            <StaffColumns rows={analytics.staffRows} />

            <div className="triplePie fullWidth">
              <PieChart title="Tình trạng task" data={analytics.status} compact />
              <PieChart title="Đánh giá bàn giao" data={analytics.handoff} compact />
              <PieChart title="Đánh giá tổng" data={analytics.overall} compact />
            </div>

            <section className="chartCard backlogCard">
              <div className="chartTitle">
                <div>
                  <span className="chartKicker">TASK TỒN</span>
                  <h3>Tồn tại trước mốc</h3>
                </div>
                <label>
                  Mốc kiểm tra
                  <input
                    type="date"
                    value={backlogDate}
                    onChange={(event) => setBacklogDate(event.target.value)}
                  />
                </label>
              </div>
              <PieChart title="Trạng thái task tồn" data={analytics.backlog} compact />
            </section>

            <HorizontalBars
              title="Task theo Type"
              subtitle="COLUMN TYPE"
              rows={analytics.types}
            />
            <PieChart title="Task theo công đoạn" data={analytics.stages} />
          </section>

          <section className="logicNote">
            <span>LOGIC TEST V0.1</span>
            <p>
              “Tổng task trong kỳ” = task có Ngày Bắt Đầu nằm trong bộ lọc +
              task bắt đầu ngoài bộ lọc nhưng Ngày Hoàn Thành nằm trong bộ lọc.
              Khi không chọn ngày, dashboard lấy toàn bộ dữ liệu.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
