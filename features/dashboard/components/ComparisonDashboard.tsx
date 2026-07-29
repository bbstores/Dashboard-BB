"use client";

import { useMemo, useState } from "react";
import {
  calculateReportComparison,
  comparisonPeriod,
  type BusinessComparisonPoint,
  type ComparisonPeriod,
  type MediaComparisonPoint,
} from "../analytics/calculateReportComparison";
import type {
  DashboardData,
  ReportDepartment,
  SavedReport,
} from "../model/types";
import {
  formatCurrency,
  formatNumber,
} from "@/shared/formatting/format";

type ComparisonPoint = MediaComparisonPoint | BusinessComparisonPoint;
type Series<T> = {
  label: string;
  color: string;
  value: (point: T) => number;
};

const COLORS = ["#195b47", "#8fc33c", "#ccff58", "#f3b252", "#d96b5f"];

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function ComparisonBars<T extends ComparisonPoint>({
  title,
  subtitle,
  points,
  series,
  format = formatNumber,
}: {
  title: string;
  subtitle: string;
  points: T[];
  series: Series<T>[];
  format?: (value: number) => string;
}) {
  const max = Math.max(
    1,
    ...points.flatMap((point) => series.map((item) => item.value(point))),
  );
  return (
    <article className="comparisonCard">
      <header>
        <span>{subtitle}</span>
        <h3>{title}</h3>
      </header>
      <div className="comparisonLegend">
        {series.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="comparisonBarRows">
        {points.map((point) => (
          <div className="comparisonBarRow" key={point.id}>
            <div className="comparisonReportLabel">
              <strong>{point.name}</strong>
              <small>{point.dateLabel}</small>
            </div>
            <div className="comparisonBarTracks">
              {series.map((item) => {
                const value = item.value(point);
                return (
                  <div className="comparisonBarTrack" key={item.label}>
                    <span
                      style={{
                        background: item.color,
                        width: `${(value / max) * 100}%`,
                      }}
                    />
                    <b>{format(value)}</b>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ComparisonStack<T extends ComparisonPoint>({
  title,
  subtitle,
  points,
  series,
}: {
  title: string;
  subtitle: string;
  points: T[];
  series: Series<T>[];
}) {
  return (
    <article className="comparisonCard">
      <header>
        <span>{subtitle}</span>
        <h3>{title}</h3>
      </header>
      <div className="comparisonLegend">
        {series.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="comparisonStacks">
        {points.map((point) => {
          const values = series.map((item) => item.value(point));
          const total = values.reduce((sum, value) => sum + value, 0);
          return (
            <div className="comparisonStackRow" key={point.id}>
              <div className="comparisonReportLabel">
                <strong>{point.name}</strong>
                <small>{point.dateLabel}</small>
              </div>
              <div>
                <div className="comparisonStackTrack">
                  {series.map((item, index) => (
                    <span
                      key={item.label}
                      title={`${item.label}: ${formatNumber(values[index])}`}
                      style={{
                        background: item.color,
                        width: `${total ? (values[index] / total) * 100 : 0}%`,
                      }}
                    />
                  ))}
                </div>
                <small className="comparisonStackValues">
                  {series
                    .map(
                      (item, index) =>
                        `${item.label}: ${formatNumber(values[index])}`,
                    )
                    .join(" · ")}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ComparisonTrend<T extends ComparisonPoint>({
  title,
  subtitle,
  points,
  series,
  format = formatNumber,
}: {
  title: string;
  subtitle: string;
  points: T[];
  series: Series<T>[];
  format?: (value: number) => string;
}) {
  const width = 920;
  const height = 280;
  const left = 50;
  const right = 24;
  const top = 25;
  const bottom = 58;
  const max = Math.max(
    1,
    ...points.flatMap((point) => series.map((item) => item.value(point))),
  );
  const x = (index: number) =>
    left +
    (points.length <= 1
      ? (width - left - right) / 2
      : (index / (points.length - 1)) * (width - left - right));
  const y = (value: number) =>
    top + (1 - value / max) * (height - top - bottom);

  return (
    <article className="comparisonCard comparisonTrendCard">
      <header>
        <span>{subtitle}</span>
        <h3>{title}</h3>
      </header>
      <div className="comparisonLegend">
        {series.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="comparisonChartScroller">
        <svg viewBox={`0 0 ${width} ${height}`} role="img">
          {[0, 0.5, 1].map((ratio) => {
            const value = max * ratio;
            return (
              <g key={ratio}>
                <line
                  className="comparisonGridLine"
                  x1={left}
                  x2={width - right}
                  y1={y(value)}
                  y2={y(value)}
                />
                <text
                  className="comparisonAxisText"
                  x={left - 9}
                  y={y(value) + 4}
                  textAnchor="end"
                >
                  {format(value)}
                </text>
              </g>
            );
          })}
          {series.map((item) => {
            const path = points
              .map(
                (point, index) =>
                  `${index ? "L" : "M"} ${x(index)} ${y(item.value(point))}`,
              )
              .join(" ");
            return (
              <g key={item.label}>
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                {points.map((point, index) => (
                  <circle
                    key={point.id}
                    cx={x(index)}
                    cy={y(item.value(point))}
                    fill={item.color}
                    r="5"
                  >
                    <title>
                      {point.name} · {item.label}:{" "}
                      {format(item.value(point))}
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}
          {points.map((point, index) => (
            <text
              className="comparisonAxisText"
              key={point.id}
              x={x(index)}
              y={height - 25}
              textAnchor="middle"
            >
              {point.dateLabel}
            </text>
          ))}
        </svg>
      </div>
    </article>
  );
}

function StaffHeatmap({ points }: { points: MediaComparisonPoint[] }) {
  const people = Array.from(
    new Set(points.flatMap((point) => Object.keys(point.assigneeMinutes))),
  )
    .map((name) => ({
      name,
      total: points.reduce(
        (sum, point) => sum + (point.assigneeMinutes[name] ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const max = Math.max(
    1,
    ...people.flatMap((person) =>
      points.map((point) => point.assigneeMinutes[person.name] ?? 0),
    ),
  );
  return (
    <article className="comparisonCard comparisonHeatmapCard">
      <header>
        <span>TẢI CÔNG VIỆC THEO ASSIGNEE</span>
        <h3>Phút dự kiến của nhân sự</h3>
      </header>
      <div
        className="comparisonHeatmap"
        style={{
          gridTemplateColumns: `minmax(150px, 1.4fr) repeat(${points.length}, minmax(85px, 1fr))`,
        }}
      >
        <b>Nhân sự</b>
        {points.map((point) => (
          <b key={point.id}>{point.dateLabel}</b>
        ))}
        {people.map((person) => (
          <div className="comparisonHeatmapRow" key={person.name}>
            <strong>{person.name}</strong>
            {points.map((point) => {
              const value = point.assigneeMinutes[person.name] ?? 0;
              const opacity = value ? 0.16 + (value / max) * 0.84 : 0.05;
              return (
                <span
                  key={point.id}
                  style={{ background: `rgba(25, 91, 71, ${opacity})` }}
                  title={`${person.name} · ${point.name}: ${formatNumber(value)} phút`}
                >
                  {formatNumber(value)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </article>
  );
}

function MediaCharts({
  points,
  period,
}: {
  points: MediaComparisonPoint[];
  period: ComparisonPeriod;
}) {
  const unit = period === "week" ? "TUẦN" : "THÁNG";
  return (
    <section className="comparisonCharts">
      <ComparisonTrend
        title={`Luồng task qua từng ${period === "week" ? "tuần" : "tháng"}`}
        subtitle={`KHỐI LƯỢNG MEDIA THEO ${unit}`}
        points={points}
        series={[
          { label: "Task trong kỳ", color: COLORS[0], value: (p) => p.started },
          { label: "Bàn giao carry-in", color: COLORS[1], value: (p) => p.inspectionCarry },
          { label: "Tồn cuối kỳ", color: COLORS[3], value: (p) => p.backlog },
        ]}
      />
      <ComparisonBars
        title="Cơ cấu task thực hiện"
        subtitle="TASK TRONG KỲ VÀ HAI LOẠI CARRY-IN"
        points={points}
        series={[
          { label: "Bắt đầu", color: COLORS[0], value: (p) => p.started },
          { label: "Carry-in bàn giao", color: COLORS[1], value: (p) => p.inspectionCarry },
          { label: "Carry-in hoàn thành", color: COLORS[2], value: (p) => p.completionCarry },
        ]}
      />
      <ComparisonBars
        title="Tổng tải công việc"
        subtitle="PHÚT DỰ KIẾN ĐÃ CỘNG THEO ASSIGNEE"
        points={points}
        series={[
          { label: "Tổng phút", color: COLORS[0], value: (p) => p.totalMinutes },
        ]}
        format={(value) => `${formatNumber(value)} phút`}
      />
      <StaffHeatmap points={points} />
      <ComparisonTrend
        title="Tuân thủ SLA"
        subtitle="TỶ LỆ ĐÚNG HẠN"
        points={points}
        format={formatPercent}
        series={[
          { label: "Bàn giao", color: COLORS[0], value: (p) => p.handoffOnTimeRate },
          { label: "Hoàn thành", color: COLORS[1], value: (p) => p.overallOnTimeRate },
        ]}
      />
      <ComparisonBars
        title="Điểm cần chú ý"
        subtitle="LẦN TRẢ VỀ VÀ TASK QUÁ HẠN BÀN GIAO"
        points={points}
        series={[
          { label: "Lần trả về", color: COLORS[3], value: (p) => p.feedback },
          { label: "Quá hạn", color: COLORS[4], value: (p) => p.overdue },
        ]}
      />
      <ComparisonBars
        title="Mức độ trễ và kiểm duyệt"
        subtitle="P50 / P90 THEO PHÚT"
        points={points}
        series={[
          { label: "Trễ bàn giao P50", color: COLORS[3], value: (p) => p.handoffLateP50 },
          { label: "Checking P50", color: COLORS[0], value: (p) => p.checkingP50 },
          { label: "Checking P90", color: COLORS[4], value: (p) => p.checkingP90 },
        ]}
        format={(value) => `${formatNumber(value)} phút`}
      />
      <ComparisonStack
        title="Sản lượng ấn phẩm"
        subtitle="VIDEO VÀ GRAPHIC"
        points={points}
        series={[
          { label: "Video", color: COLORS[0], value: (p) => p.video },
          { label: "Graphic", color: COLORS[2], value: (p) => p.graphic },
        ]}
      />
      <ComparisonBars
        title="Chi phí đã phân bổ"
        subtitle="TỔNG CHI PHÍ VÀ CHI PHÍ / TASK"
        points={points}
        series={[
          { label: "Tổng chi phí", color: COLORS[0], value: (p) => p.cost },
          { label: "Chi phí / task", color: COLORS[3], value: (p) => p.costPerTask },
        ]}
        format={formatCurrency}
      />
      <ComparisonBars
        title="Backlog cuối kỳ"
        subtitle="TỔNG TỒN VÀ TASK TRÊN 7 NGÀY"
        points={points}
        series={[
          { label: "Tổng tồn", color: COLORS[0], value: (p) => p.backlog },
          { label: "Trên 7 ngày", color: COLORS[4], value: (p) => p.backlogOverSevenDays },
        ]}
      />
    </section>
  );
}

function BusinessCharts({
  points,
  period,
}: {
  points: BusinessComparisonPoint[];
  period: ComparisonPeriod;
}) {
  return (
    <section className="comparisonCharts">
      <ComparisonTrend
        title={`Sản lượng đăng bài theo ${period === "week" ? "tuần" : "tháng"}`}
        subtitle="TỔNG BÀI VÀ BÀI ĐÃ ĐĂNG"
        points={points}
        series={[
          { label: "Tổng bài", color: COLORS[0], value: (p) => p.total },
          { label: "Đã đăng", color: COLORS[1], value: (p) => p.posted },
        ]}
      />
      <ComparisonBars
        title="Tỷ lệ bài đã đăng"
        subtitle="TỶ LỆ HOÀN THÀNH LỊCH ĐĂNG"
        points={points}
        series={[
          { label: "Tỷ lệ đã đăng", color: COLORS[0], value: (p) => p.postedRate },
        ]}
        format={formatPercent}
      />
      <ComparisonBars
        title="Bình quân bài/ngày"
        subtitle="CHUẨN HÓA THEO NGÀY LÀM VIỆC"
        points={points}
        series={[
          { label: "Bài / ngày", color: COLORS[1], value: (p) => p.perDay },
        ]}
        format={(value) =>
          new Intl.NumberFormat("vi-VN", {
            maximumFractionDigits: 1,
          }).format(value)
        }
      />
      <ComparisonStack
        title="Cơ cấu nguồn bài"
        subtitle="REUP VÀ ẤN PHẨM MEDIA"
        points={points}
        series={[
          { label: "Reup", color: COLORS[3], value: (p) => p.reup },
          { label: "Video", color: COLORS[0], value: (p) => p.video },
          { label: "Hình ảnh", color: COLORS[2], value: (p) => p.graphic },
          { label: "Chưa xác định", color: COLORS[4], value: (p) => p.unknown },
        ]}
      />
      <ComparisonStack
        title="Phễu điều phối ấn phẩm"
        subtitle="ĐÃ LÊN LỊCH VÀ CHƯA LÊN LỊCH"
        points={points}
        series={[
          { label: "Đã lên lịch", color: COLORS[0], value: (p) => p.scheduled },
          { label: "Chưa lên lịch", color: COLORS[2], value: (p) => p.unscheduled },
          { label: "Ấn phẩm cũ", color: COLORS[4], value: (p) => p.oldAssets },
        ]}
      />
      <ComparisonBars
        title="Hiệu quả sử dụng media"
        subtitle="TASK MEDIA GỐC VÀ BÀI / TASK"
        points={points}
        series={[
          { label: "Task media gốc", color: COLORS[0], value: (p) => p.uniqueMediaTasks },
          { label: "Bài / task", color: COLORS[1], value: (p) => p.postsPerMediaTask },
        ]}
        format={(value) =>
          new Intl.NumberFormat("vi-VN", {
            maximumFractionDigits: 1,
          }).format(value)
        }
      />
      <ComparisonBars
        title="Dữ liệu cần kiểm tra"
        subtitle="BOOK TASK VÀ KHÔNG ĐĂNG SOCIAL"
        points={points}
        series={[
          { label: "Số dòng lỗi", color: COLORS[4], value: (p) => p.dataIssues },
        ]}
      />
      <PlatformComparison points={points} />
    </section>
  );
}

function PlatformComparison({ points }: { points: BusinessComparisonPoint[] }) {
  const platforms = Array.from(
    new Set(points.flatMap((point) => Object.keys(point.platforms))),
  )
    .map((label) => ({
      label,
      total: points.reduce(
        (sum, point) => sum + (point.platforms[label] ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  return (
    <ComparisonStack<BusinessComparisonPoint>
      title="Bài đăng theo nền tảng"
      subtitle="TOP 5 NỀN TẢNG TRONG CÁC KỲ ĐÃ CHỌN"
      points={points}
      series={platforms.map((platform, index) => ({
        label: platform.label,
        color: COLORS[index % COLORS.length],
        value: (point) => point.platforms[platform.label] ?? 0,
      }))}
    />
  );
}

export function ComparisonDashboard({
  data,
  reports,
}: {
  data: DashboardData;
  reports: SavedReport[];
}) {
  const [department, setDepartment] =
    useState<ReportDepartment>("media");
  const [period, setPeriod] = useState<ComparisonPeriod>("week");
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const available = useMemo(
    () =>
      reports
        .filter(
          (report) =>
            report.department === department &&
            comparisonPeriod(report) === period,
        )
        .sort(
          (left, right) =>
            left.filters.dateFrom.localeCompare(right.filters.dateFrom),
        ),
    [department, period, reports],
  );
  const selectedReports = useMemo(
    () =>
      available.filter((report) => !excludedIds.includes(report.id)),
    [available, excludedIds],
  );
  const points = useMemo(
    () =>
      calculateReportComparison(
        data,
        selectedReports,
        department,
        period,
      ),
    [data, department, period, selectedReports],
  );

  return (
    <section className="comparisonDashboard">
      <header className="comparisonHero">
        <div>
          <span>REPORT COMPARISON</span>
          <h1>So sánh báo cáo &amp; xu hướng vận hành</h1>
          <p>
            Chọn nhiều kỳ cùng phòng ban. Các mốc được sắp theo thời gian
            và tính lại từ file Excel hiện tại.
          </p>
        </div>
        <div className="comparisonModeControls">
          <div>
            <small>Phòng ban</small>
            {(["media", "business"] as const).map((value) => (
              <button
                type="button"
                className={department === value ? "active" : ""}
                onClick={() => setDepartment(value)}
                key={value}
              >
                {value === "media" ? "Media" : "Kinh doanh"}
              </button>
            ))}
          </div>
          <div>
            <small>Chu kỳ</small>
            {(["week", "month"] as const).map((value) => (
              <button
                type="button"
                className={period === value ? "active" : ""}
                onClick={() => setPeriod(value)}
                key={value}
              >
                {value === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="comparisonReportPicker">
        <header>
          <div>
            <span>CHỌN BÁO CÁO</span>
            <h2>
              {department === "media" ? "Media" : "Kinh doanh"} ·{" "}
              {period === "week" ? "Theo tuần" : "Theo tháng"}
            </h2>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setExcludedIds([])}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={() =>
                setExcludedIds(available.map((report) => report.id))
              }
            >
              Bỏ chọn
            </button>
          </div>
        </header>
        {available.length ? (
          <div className="comparisonReportOptions">
            {available.map((report) => {
              const checked = !excludedIds.includes(report.id);
              return (
                <label className={checked ? "selected" : ""} key={report.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setExcludedIds((current) =>
                        checked
                          ? [...current, report.id]
                          : current.filter((id) => id !== report.id),
                      )
                    }
                  />
                  <strong>{report.name}</strong>
                  <span>
                    {report.filters.dateFrom} → {report.filters.dateTo}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="comparisonEmpty">
            Chưa có báo cáo {period === "week" ? "tuần" : "tháng"} đã lưu
            cho phòng ban này.
          </div>
        )}
      </section>

      {points.length ? (
        department === "media" ? (
          <MediaCharts
            points={points as MediaComparisonPoint[]}
            period={period}
          />
        ) : (
          <BusinessCharts
            points={points as BusinessComparisonPoint[]}
            period={period}
          />
        )
      ) : available.length ? (
        <div className="comparisonEmpty comparisonEmptyLarge">
          Chọn ít nhất một báo cáo để bắt đầu so sánh.
        </div>
      ) : null}

      <aside className="comparisonSnapshotNote">
        <strong>Phạm vi lịch sử</strong>
        <p>
          Báo cáo đã lưu hiện lưu bộ lọc, chưa lưu snapshot. Các chỉ số được
          tính lại từ file đang nạp; trạng thái Done, Đã đăng hoặc Backlog có
          thể khác thời điểm bạn bấm lưu. Backlog trên trang này dùng ngày cuối
          của từng kỳ làm mốc.
        </p>
      </aside>
    </section>
  );
}
