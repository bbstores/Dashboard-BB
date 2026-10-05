import type { PublicationDailyRow } from "../../analytics/calculatePublicationStats";
import { formatDate } from "@/shared/formatting/format";
import { formatNormValue } from "./postingShared";

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

export function PostingDailyLineChart({
  rows,
  dailyNormTarget,
  platforms,
  selectedPlatforms,
  onSelectedPlatformsChange,
  onSelect,
}: {
  rows: PublicationDailyRow[];
  dailyNormTarget: number;
  platforms: string[];
  selectedPlatforms: string[];
  onSelectedPlatformsChange: (platforms: string[]) => void;
  onSelect: (
    date: Date | null,
    series: "total" | "posted",
  ) => void;
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
    dailyNormTarget,
    ...rows.flatMap((row) => [row.total, row.posted]),
  );
  const pointFor = (value: number, index: number) => ({
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
  const normPoints = rows.map((_, index) =>
    pointFor(dailyNormTarget, index),
  );
  const totalCount = rows.reduce(
    (sum, row) => sum + row.total,
    0,
  );
  const postedCount = rows.reduce(
    (sum, row) => sum + row.posted,
    0,
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
        <div className="postingDailyTools">
          <div
            className="postingPlatformFilters"
            role="group"
            aria-label="Lọc biểu đồ ngày theo nền tảng"
          >
            <button
              type="button"
              className={!selectedPlatforms.length ? "active" : ""}
              onClick={() => onSelectedPlatformsChange([])}
            >
              Tất cả
            </button>
            {platforms.map((platform) => {
              const checked = selectedPlatforms.includes(platform);
              return (
                <label
                  className={checked ? "active" : ""}
                  key={platform}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      onSelectedPlatformsChange(
                        event.target.checked
                          ? [...selectedPlatforms, platform]
                          : selectedPlatforms.filter(
                              (item) => item !== platform,
                            ),
                      )
                    }
                  />
                  {platform}
                </label>
              );
            })}
          </div>
          <small className="postingPlatformFilterSummary">
            Đang cộng:{" "}
            {selectedPlatforms.length
              ? `${selectedPlatforms.length} nền tảng`
              : "tất cả nền tảng"}
          </small>
          <div className="postingLegend">
            <span><i className="total line" />Tổng bài</span>
            <span><i className="posted line" />Đã đăng</span>
            <span>
              <i className="norm line" />
              Định mức {formatNormValue(dailyNormTarget)}/ngày
            </span>
          </div>
        </div>
      </div>
      <div className="postingChartScroller">
        {rows.length ? (
          <svg
            className="postingDailySvg"
            viewBox={`0 0 ${width} ${height}`}
            style={{ minWidth: `${width}px` }}
            role="img"
            aria-label="Đường xu hướng tổng bài, số bài đã đăng và định mức theo ngày"
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
              className="postingTrend total interactive"
              d={smoothPath(totalPoints)}
              role="button"
              tabIndex={0}
              aria-label={`Đường Tổng bài: ${totalCount} bài`}
              onClick={() => onSelect(null, "total")}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  onSelect(null, "total");
                }
              }}
            />
            <path
              className="postingTrend posted interactive"
              d={smoothPath(postedPoints)}
              role="button"
              tabIndex={0}
              aria-label={`Đường Đã đăng: ${postedCount} bài`}
              onClick={() => onSelect(null, "posted")}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  onSelect(null, "posted");
                }
              }}
            />
            <path
              className="postingTrend norm"
              d={smoothPath(normPoints)}
              aria-label={`Đường Định mức: ${formatNormValue(dailyNormTarget)} bài/ngày`}
            />
            {rows.map((row, index) => {
              const totalPoint = totalPoints[index];
              const postedPoint = postedPoints[index];
              const normPoint = normPoints[index];
              return (
                <g key={row.date.toISOString()}>
                  <circle
                    className="postingTrendPoint total interactive"
                    cx={totalPoint.x}
                    cy={totalPoint.y}
                    r="4"
                    role="button"
                    tabIndex={0}
                    aria-label={`Tổng bài ngày ${formatDate(row.date)}: ${row.total} bài`}
                    onClick={() => onSelect(row.date, "total")}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        onSelect(row.date, "total");
                      }
                    }}
                  />
                  <text
                    className="postingTrendValue total"
                    x={totalPoint.x}
                    y={totalPoint.y - 9}
                    textAnchor="middle"
                  >
                    {row.total}
                  </text>
                  <circle
                    className="postingTrendPoint posted interactive"
                    cx={postedPoint.x}
                    cy={postedPoint.y}
                    r="3.5"
                    role="button"
                    tabIndex={0}
                    aria-label={`Đã đăng ngày ${formatDate(row.date)}: ${row.posted} bài`}
                    onClick={() => onSelect(row.date, "posted")}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        onSelect(row.date, "posted");
                      }
                    }}
                  />
                  <text
                    className="postingTrendValue posted"
                    x={postedPoint.x}
                    y={postedPoint.y + 15}
                    textAnchor="middle"
                  >
                    {row.posted}
                  </text>
                  <circle
                    className="postingTrendPoint norm"
                    cx={normPoint.x}
                    cy={normPoint.y}
                    r="3"
                    aria-label={`Định mức ngày ${formatDate(row.date)}: ${formatNormValue(dailyNormTarget)} bài`}
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
                    {" · "}Định mức {formatNormValue(dailyNormTarget)}
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
