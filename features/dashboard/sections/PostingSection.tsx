import { useMemo, useState } from "react";
import {
  calculatePublicationStats,
  OLD_ASSET_CUTOFF,
  type PublicationDailyRow,
  type PublicationPlatformRow,
} from "../analytics/calculatePublicationStats";
import { PieChart } from "../components/PieChart";
import type {
  DateWindow,
  DetailView,
  PublicationPost,
  Task,
} from "../model/types";
import {
  isGraphicPublication,
  isVideoPublication,
  publicationReadyDate,
} from "../model/taskUtils";
import {
  formatDate,
  formatNumber,
  formatPercent,
} from "@/shared/formatting/format";

type AssetFilter = "all" | "video" | "graphic" | "old";

function PostingKpi({
  label,
  value,
  note,
  variant = "",
  onClick,
}: {
  label: string;
  value: number;
  note: string;
  variant?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      <small>{note}</small>
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`postingKpiCard interactive ${variant}`.trim()}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <div className={`postingKpiCard ${variant}`.trim()}>
      {content}
    </div>
  );
}

function PlatformMixChart({
  rows,
}: {
  rows: PublicationPlatformRow[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  return (
    <article className="postingPlatformPanel">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">CƠ CẤU THEO KÊNH</span>
          <h3>Nguồn bài đăng theo nền tảng</h3>
        </div>
        <div className="postingLegend">
          <span><i className="reup" />Reup</span>
          <span><i className="video" />Video</span>
          <span><i className="graphic" />Hình ảnh</span>
          <span><i className="unknown" />Chưa xác định</span>
        </div>
      </div>
      <p className="postingChartNote">
        Mỗi dòng trong bảng Đăng Bài được tính là một bài. Một task đăng
        Facebook và TikTok sẽ được tính thành hai bài ở hai nền tảng.
      </p>
      <div className="postingPlatformRows">
        {rows.map((row) => (
          <div className="postingPlatformRow" key={row.label}>
            <span title={row.label}>{row.label}</span>
            <div className="postingPlatformTrack">
              <i
                className="reup"
                title={`Reup: ${row.reup}`}
                style={{ width: `${(row.reup / max) * 100}%` }}
              />
              <i
                className="video"
                title={`Video: ${row.video}`}
                style={{ width: `${(row.video / max) * 100}%` }}
              />
              <i
                className="graphic"
                title={`Hình ảnh: ${row.graphic}`}
                style={{ width: `${(row.graphic / max) * 100}%` }}
              />
              {row.unknown > 0 && (
                <i
                  className="unknown"
                  title={`Chưa xác định: ${row.unknown}`}
                  style={{ width: `${(row.unknown / max) * 100}%` }}
                />
              )}
            </div>
            <strong>{formatNumber(row.total)}</strong>
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

function assetType(task: Task) {
  if (isVideoPublication(task)) return "Video";
  if (isGraphicPublication(task)) return "Hình ảnh";
  return "Chưa xác định";
}

function UnscheduledAssets({
  tasks,
  videoTasks,
  graphicTasks,
  oldAssets,
  onOpenDetail,
}: {
  tasks: Task[];
  videoTasks: Task[];
  graphicTasks: Task[];
  oldAssets: Task[];
  onOpenDetail: (detail: DetailView) => void;
}) {
  const [filter, setFilter] = useState<AssetFilter>("all");
  const oldCodes = useMemo(
    () => new Set(oldAssets.map((task) => task.code)),
    [oldAssets],
  );
  const selectedTasks =
    filter === "video"
      ? videoTasks
      : filter === "graphic"
        ? graphicTasks
        : filter === "old"
          ? oldAssets
          : tasks;
  const sortedTasks = [...selectedTasks].sort((left, right) => {
    const leftOld = oldCodes.has(left.code) ? 0 : 1;
    const rightOld = oldCodes.has(right.code) ? 0 : 1;
    if (leftOld !== rightOld) return leftOld - rightOld;
    return (
      (publicationReadyDate(left)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
      (publicationReadyDate(right)?.getTime() ?? Number.MAX_SAFE_INTEGER)
    );
  });

  const filters: Array<{
    key: AssetFilter;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "Tất cả", count: tasks.length },
    { key: "video", label: "Video", count: videoTasks.length },
    { key: "graphic", label: "Hình ảnh", count: graphicTasks.length },
    { key: "old", label: "Ấn phẩm cũ", count: oldAssets.length },
  ];

  return (
    <article className="unscheduledPanel">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">TASKLIST CHƯA CÓ ĐĂNG BÀI</span>
          <h3>Ấn phẩm chưa lên lịch</h3>
        </div>
        <button
          type="button"
          className="postingDetailButton"
          onClick={() =>
            onOpenDetail({
              title: "Ấn phẩm chưa lên lịch",
              subtitle:
                filter === "old"
                  ? "Ấn phẩm cuối chưa có lịch, sẵn sàng trước 01/07/2026"
                  : `Nhóm đang chọn: ${filters.find((item) => item.key === filter)?.label}`,
              tasks: sortedTasks,
            })
          }
        >
          Xem toàn bộ {formatNumber(sortedTasks.length)}
        </button>
      </div>
      <div className="assetFilterTabs" role="group" aria-label="Lọc ấn phẩm chưa lên lịch">
        {filters.map((item) => (
          <button
            type="button"
            className={filter === item.key ? "active" : ""}
            key={item.key}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
            <strong>{formatNumber(item.count)}</strong>
          </button>
        ))}
      </div>
      <div className="unscheduledTableWrap">
        <table className="unscheduledTable">
          <thead>
            <tr>
              <th>Loại</th>
              <th>Task</th>
              <th>Format Type</th>
              <th>Trạng thái</th>
              <th>Assignee</th>
              <th>Mốc sẵn sàng</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.slice(0, 12).map((task) => (
              <tr key={task.code}>
                <td>
                  <span className={`assetKind ${assetType(task) === "Video" ? "video" : "graphic"}`}>
                    {assetType(task)}
                  </span>
                </td>
                <td>
                  <strong>{task.code}</strong>
                  <small>{task.title || "Chưa có tên task"}</small>
                </td>
                <td>{task.formatType || "Chưa xác định"}</td>
                <td><span className="statusPill">{task.status || "Chưa xác định"}</span></td>
                <td>{task.assignee || "Chưa có assignee"}</td>
                <td>
                  {formatDate(publicationReadyDate(task))}
                  {oldCodes.has(task.code) && <b className="oldAssetFlag">Cũ</b>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sortedTasks.length && (
          <p className="emptyText">Không có ấn phẩm phù hợp.</p>
        )}
      </div>
    </article>
  );
}

export function PostingSection({
  tasks,
  publications,
  dateWindow,
  onOpenDetail,
}: {
  tasks: Task[];
  publications: PublicationPost[];
  dateWindow: DateWindow;
  onOpenDetail: (detail: DetailView) => void;
}) {
  const stats = useMemo(
    () => calculatePublicationStats(tasks, publications, dateWindow),
    [tasks, publications, dateWindow],
  );

  return (
    <section className="postingSection fullWidth groupProduction">
      <div className="postingHeader">
        <div>
          <span className="chartKicker">KINH DOANH · ĐĂNG BÀI</span>
          <h2>Điều phối ấn phẩm & lịch đăng</h2>
          <p>
            Bài đăng đếm theo từng dòng và từng nền tảng; ấn phẩm chưa
            lên lịch đếm theo task thành phẩm cuối.
          </p>
        </div>
      </div>

      <div className="postingKpis">
        <PostingKpi
          label="Tổng bài trong kỳ"
          value={stats.total}
          note={`${formatNumber(stats.posted)} bài đã đăng`}
        />
        <PostingKpi
          label="Bài reup"
          value={stats.reup}
          note={formatPercent(stats.reup, stats.total)}
        />
        <PostingKpi
          label="Dùng ấn phẩm media"
          value={stats.media}
          note={`${formatNumber(stats.video)} video · ${formatNumber(stats.graphic)} hình`}
        />
        <PostingKpi
          label="Chưa lên lịch"
          value={stats.unscheduledTasks.length}
          note={`${formatNumber(stats.unscheduledVideoTasks.length)} video · ${formatNumber(stats.unscheduledGraphicTasks.length)} hình`}
          onClick={() =>
            onOpenDetail({
              title: "Ấn phẩm chưa lên lịch",
              subtitle:
                "Task thành phẩm cuối có cột 2.7 Đăng Bài để trống",
              tasks: stats.unscheduledTasks,
            })
          }
        />
        <PostingKpi
          label="Ấn phẩm cũ"
          value={stats.oldAssets.length}
          note={`Sẵn sàng trước ${formatDate(OLD_ASSET_CUTOFF)}`}
          variant="warning"
          onClick={() =>
            onOpenDetail({
              title: "Ấn phẩm cũ",
              subtitle:
                "Ấn phẩm cuối chưa có lịch, sẵn sàng trước 01/07/2026",
              tasks: stats.oldAssets,
            })
          }
        />
      </div>

      <div className="postingOverviewGrid">
        <PieChart
          className="postingSourceMix"
          title="Nguồn bài đăng"
          data={stats.postMix}
          totalLabel="Bài đăng"
          help={{
            title: "Nguồn bài đăng",
            purpose:
              "Phân biệt bài reup và bài sử dụng ấn phẩm media trong khoảng ngày lọc.",
            objective:
              "Cho biết tỷ trọng nội dung tái sử dụng so với sản xuất mới, đồng thời tách media video và hình ảnh.",
            calculation:
              "Book Task trống là Reup. Book Task nối tới task Video + Edit là Media Video; nối tới task không phải Video + Graphic Design là Media Hình ảnh. Mỗi dòng đăng ở một nền tảng được tính là một bài.",
            example:
              "Một video có hai dòng Facebook và TikTok sẽ đóng góp hai bài Media Video.",
            note:
              "Book Task không khớp quy tắc ấn phẩm cuối được đưa vào Chưa xác định để tổng luôn đối soát được.",
          }}
        />
        <PlatformMixChart rows={stats.platformRows} />
      </div>

      {stats.unknown > 0 && (
        <div className="postingDataAlert">
          <strong>{formatNumber(stats.unknown)} bài cần kiểm tra dữ liệu</strong>
          <span>
            Có Book Task nhưng task liên kết không khớp quy tắc Video–Edit
            hoặc Hình ảnh–Graphic Design.
          </span>
        </div>
      )}

      <UnscheduledAssets
        tasks={stats.unscheduledTasks}
        videoTasks={stats.unscheduledVideoTasks}
        graphicTasks={stats.unscheduledGraphicTasks}
        oldAssets={stats.oldAssets}
        onOpenDetail={onOpenDetail}
      />

      <PostingDailyLineChart rows={stats.dailyRows} />
    </section>
  );
}
