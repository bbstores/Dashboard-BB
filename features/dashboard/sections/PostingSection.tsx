import { useMemo, useState } from "react";
import {
  calculatePublicationStats,
  type PublicationBreakdownRow,
  type PublicationDailyRow,
} from "../analytics/calculatePublicationStats";
import type {
  DateWindow,
  PublicationPost,
} from "../model/types";
import { formatNumber, formatPercent } from "@/shared/formatting/format";

function PlatformColumnChart({
  rows,
}: {
  rows: PublicationBreakdownRow[];
}) {
  const width = Math.max(820, rows.length * 96);
  const height = 330;
  const left = 48;
  const right = 18;
  const top = 24;
  const bottom = 82;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(1, ...rows.map((row) => row.total));
  const groupWidth = plotWidth / Math.max(rows.length, 1);
  const barWidth = Math.min(26, groupWidth * 0.28);

  return (
    <div className="postingChartScroller">
      <svg
        className="postingPlatformChart"
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: `${width}px` }}
        role="img"
        aria-label="Tổng bài đăng và số bài đã đăng theo nền tảng"
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = top + plotHeight - ratio * plotHeight;
          return (
            <g key={ratio}>
              <line
                className="postingGridLine"
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
              />
              <text
                className="postingAxisText"
                x={left - 9}
                y={y + 4}
                textAnchor="end"
              >
                {Math.round(max * ratio)}
              </text>
            </g>
          );
        })}
        {rows.map((row, index) => {
          const center = left + groupWidth * (index + 0.5);
          const totalHeight = (row.total / max) * plotHeight;
          const postedHeight = (row.posted / max) * plotHeight;
          return (
            <g key={row.label}>
              <rect
                className="postingBar total"
                x={center - barWidth - 2}
                y={top + plotHeight - totalHeight}
                width={barWidth}
                height={totalHeight}
                rx="5"
              />
              <rect
                className="postingBar posted"
                x={center + 2}
                y={top + plotHeight - postedHeight}
                width={barWidth}
                height={postedHeight}
                rx="5"
              />
              <text
                className="postingPlatformLabel"
                x={center}
                y={height - 54}
                textAnchor="end"
                transform={`rotate(-32 ${center} ${height - 54})`}
              >
                {row.label}
              </text>
              <title>
                {row.label} · Tổng {row.total} · Đã đăng {row.posted}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PostTypeChart({
  rows,
}: {
  rows: PublicationBreakdownRow[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  return (
    <article className="postingSubchart postingTypeChart">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">CƠ CẤU NỘI DUNG</span>
          <h3>Theo loại bài đăng</h3>
        </div>
        <div className="postingLegend">
          <span><i className="total" />Tổng bài</span>
          <span><i className="posted" />Đã đăng</span>
        </div>
      </div>
      <div className="postingTypeRows">
        {rows.map((row) => (
          <div className="postingTypeRow" key={row.label}>
            <span title={row.label}>{row.label}</span>
            <div className="postingTypeTrack">
              <i
                className="total"
                style={{ width: `${(row.total / max) * 100}%` }}
              />
              <i
                className="posted"
                style={{ width: `${(row.posted / max) * 100}%` }}
              />
            </div>
            <strong>{formatNumber(row.total)}</strong>
            <small>{formatNumber(row.posted)} đã đăng</small>
          </div>
        ))}
        {!rows.length && (
          <p className="emptyText">Chưa có dữ liệu phù hợp.</p>
        )}
      </div>
    </article>
  );
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function PostingDailyLineChart({
  rows,
}: {
  rows: PublicationDailyRow[];
}) {
  const height = 300;
  const left = 42;
  const right = 18;
  const top = 30;
  const bottom = 52;
  const daySpacing = rows.length <= 31 ? 54 : 42;
  const width = Math.max(
    760,
    left + right + Math.max(0, rows.length - 1) * daySpacing,
  );
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(
    1,
    ...rows.flatMap((row) => [row.total, row.posted]),
  );
  const pointFor = (
    value: number,
    index: number,
  ) => ({
    x:
      left +
      (rows.length <= 1
        ? plotWidth / 2
        : (index / (rows.length - 1)) * plotWidth),
    y: top + plotHeight - (value / max) * plotHeight,
  });
  const totalPoints = rows.map((row, index) =>
    pointFor(row.total, index),
  );
  const postedPoints = rows.map((row, index) =>
    pointFor(row.posted, index),
  );
  const labelStep =
    rows.length <= 31
      ? 1
      : Math.max(1, Math.ceil(rows.length / 31));

  return (
    <article className="postingSubchart postingDailyChart">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">NHỊP ĐĂNG THEO NGÀY</span>
          <h3>Số lượng bài đăng theo ngày</h3>
        </div>
        <div className="postingLegend">
          <span><i className="total line" />Tổng bài</span>
          <span><i className="posted line" />Đã đăng</span>
        </div>
      </div>
      <div className="postingChartScroller">
        {rows.length ? (
          <svg
            className="postingDailySvg"
            viewBox={`0 0 ${width} ${height}`}
            style={{ minWidth: `${width}px` }}
            role="img"
            aria-label="Đường xu hướng tổng bài và số bài đã đăng theo ngày"
          >
            {[0, 0.5, 1].map((ratio) => {
              const y = top + plotHeight - ratio * plotHeight;
              return (
                <g key={ratio}>
                  <line
                    className="postingGridLine"
                    x1={left}
                    x2={width - right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    className="postingAxisText"
                    x={left - 8}
                    y={y + 4}
                    textAnchor="end"
                  >
                    {Math.round(max * ratio)}
                  </text>
                </g>
              );
            })}
            <path
              className="postingTrend total"
              d={smoothPath(totalPoints)}
            />
            <path
              className="postingTrend posted"
              d={smoothPath(postedPoints)}
            />
            {rows.map((row, index) => {
              const totalPoint = totalPoints[index];
              const postedPoint = postedPoints[index];
              return (
                <g key={row.date.toISOString()}>
                  <circle
                    className="postingTrendPoint total"
                    cx={totalPoint.x}
                    cy={totalPoint.y}
                    r="4"
                  />
                  <circle
                    className="postingTrendPoint posted"
                    cx={postedPoint.x}
                    cy={postedPoint.y}
                    r="3.5"
                  />
                  {(index % labelStep === 0 ||
                    index === rows.length - 1) && (
                    <text
                      className="postingAxisText"
                      x={totalPoint.x}
                      y={height - 17}
                      textAnchor="middle"
                    >
                      {String(row.date.getDate()).padStart(2, "0")}/
                      {String(row.date.getMonth() + 1).padStart(2, "0")}
                    </text>
                  )}
                  <title>
                    {String(row.date.getDate()).padStart(2, "0")}/
                    {String(row.date.getMonth() + 1).padStart(2, "0")}
                    {" · "}Tổng {row.total} · Đã đăng {row.posted}
                  </title>
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="emptyText">Chưa có dữ liệu phù hợp.</p>
        )}
      </div>
    </article>
  );
}

export function PostingSection({
  publications,
  dateWindow,
}: {
  publications: PublicationPost[];
  dateWindow: DateWindow;
}) {
  const [platform, setPlatform] = useState("");
  const overview = useMemo(
    () =>
      calculatePublicationStats(
        publications,
        dateWindow,
        "",
      ),
    [publications, dateWindow],
  );
  const activePlatform = overview.platforms.includes(platform)
    ? platform
    : "";
  const detail = useMemo(
    () =>
      calculatePublicationStats(
        publications,
        dateWindow,
        activePlatform,
      ),
    [publications, dateWindow, activePlatform],
  );

  return (
    <section className="postingSection fullWidth groupProduction">
      <div className="postingHeader">
        <div>
          <span className="chartKicker">SHEET 2.7 ĐĂNG BÀI</span>
          <h2>Hiệu suất đăng bài</h2>
          <p>
            Đếm theo Ngày Đăng trong khoảng thời gian đang lọc.
          </p>
        </div>
        <div className="postingKpis">
          <div>
            <span>Tổng bài trong kỳ</span>
            <strong>{formatNumber(overview.total)}</strong>
          </div>
          <div>
            <span>Đã đăng</span>
            <strong>{formatNumber(overview.posted)}</strong>
            <small>
              {formatPercent(overview.posted, overview.total)}
            </small>
          </div>
        </div>
      </div>

      <article className="postingPlatformPanel">
        <div className="postingSubchartTitle">
          <div>
            <span className="chartKicker">SO SÁNH NỀN TẢNG</span>
            <h3>Tổng bài và bài đã đăng</h3>
          </div>
          <div className="postingLegend">
            <span><i className="total" />Tổng bài</span>
            <span><i className="posted" />Đã đăng</span>
          </div>
        </div>
        <PlatformColumnChart rows={overview.platformRows} />
      </article>

      <div className="postingDrilldownHeader">
        <div>
          <span className="chartKicker">PHÂN TÍCH CHI TIẾT</span>
          <h3>
            {activePlatform || "Tất cả nền tảng"}
          </h3>
        </div>
        <label>
          <span>Nền tảng</span>
          <select
            value={activePlatform}
            onChange={(event) => setPlatform(event.target.value)}
            aria-label="Chọn nền tảng đăng bài"
          >
            <option value="">Tất cả nền tảng</option>
            {overview.platforms.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="postingDrilldownGrid">
        <PostTypeChart rows={detail.postTypeRows} />
        <PostingDailyLineChart rows={detail.dailyRows} />
      </div>
    </section>
  );
}
