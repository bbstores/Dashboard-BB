import { useMemo, useState, type ReactNode } from "react";
import {
  calculatePublicationDailyRows,
  calculatePublicationStats,
  OLD_ASSET_CUTOFF,
  type ClassifiedPublication,
  type PublicationDailyRow,
  type PublicationPlatformRow,
  type PublicationSource,
} from "../analytics/calculatePublicationStats";
import { PieChart } from "../components/PieChart";
import type {
  DateWindow,
  DetailView,
  PublicationPost,
  Task,
} from "../model/types";
import { normalize } from "../model/taskUtils";
import {
  formatDate,
  formatNumber,
  formatPercent,
} from "@/shared/formatting/format";
import { dateKey } from "@/shared/date/dateUtils";

const publicationSourceLabels: Record<PublicationSource, string> = {
  reup: "Bài reup",
  video: "Media · Video",
  graphic: "Media · Hình ảnh",
  unknown: "Chưa xác định",
};

function sourceFromChartLabel(label: string): PublicationSource {
  return (
    Object.entries(publicationSourceLabels).find(
      ([, sourceLabel]) => sourceLabel === label,
    )?.[0] as PublicationSource | undefined
  ) ?? "unknown";
}

function publicationEvidence(items: ClassifiedPublication[]) {
  return items.map((item) => ({
    post: item.post,
    task: item.task,
    reason: `${publicationSourceLabels[item.source]} · ${
      item.post.posted ? "Đã đăng" : "Chưa đăng"
    }`,
  }));
}

function PostingKpi({
  label,
  value,
  note,
  variant = "",
  onClick,
  tooltip,
}: {
  label: string;
  value: number;
  note: string;
  variant?: string;
  onClick?: () => void;
  tooltip?: ReactNode;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      <small>{note}</small>
      {tooltip && (
        <span className="postingKpiTooltip" role="tooltip">
          {tooltip}
        </span>
      )}
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
  onSelect,
}: {
  rows: PublicationPlatformRow[];
  onSelect: (
    platform: string,
    source?: PublicationSource,
  ) => void;
}) {
  const max = Math.max(
    1,
    ...rows.flatMap((row) => [
      row.reup,
      row.video,
      row.graphic,
    ]),
  );
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
        </div>
      </div>
      <p className="postingChartNote">
        Mỗi dòng trong bảng Đăng Bài được tính là một bài. Một task đăng
        Facebook và TikTok sẽ được tính thành hai bài ở hai nền tảng.
        Bài chưa xác định được xem tại cảnh báo dữ liệu riêng.
      </p>
      <div className="postingPlatformScroller">
        <div
          className="postingPlatformColumns"
          style={{
            minWidth: `${Math.max(640, rows.length * 150)}px`,
          }}
        >
          {rows.map((row) => (
            <div className="postingPlatformGroup" key={row.label}>
              <div className="postingPlatformBarArea">
                {(
                  [
                    {
                      source: "reup",
                      label: "Reup",
                      value: row.reup,
                    },
                    {
                      source: "video",
                      label: "Video",
                      value: row.video,
                    },
                    {
                      source: "graphic",
                      label: "Hình ảnh",
                      value: row.graphic,
                    },
                  ] as Array<{
                    source: PublicationSource;
                    label: string;
                    value: number;
                  }>
                ).map((column) => (
                  <button
                    type="button"
                    className={`postingPlatformColumn ${column.source}`}
                    key={column.source}
                    title={`${column.label}: ${column.value}`}
                    aria-label={`${row.label} · ${column.label}: ${column.value} bài`}
                    onClick={() =>
                      onSelect(row.label, column.source)
                    }
                    style={{
                      height: `${(column.value / max) * 100}%`,
                    }}
                  >
                    {column.value > 0 && (
                      <span>{formatNumber(column.value)}</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="postingPlatformTotal"
                title={`${row.label}: ${row.total} bài`}
                aria-label={`${row.label} · Tất cả: ${row.total} bài`}
                onClick={() => onSelect(row.label)}
              >
                <span>{row.label}</span>
                <strong>{formatNumber(row.total)}</strong>
              </button>
            </div>
          ))}
          {!rows.length && (
            <p className="emptyText">Chưa có dữ liệu phù hợp.</p>
          )}
        </div>
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
  platforms,
  selectedPlatforms,
  onSelectedPlatformsChange,
  onSelect,
}: {
  rows: PublicationDailyRow[];
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
            {rows.map((row, index) => {
              const totalPoint = totalPoints[index];
              const postedPoint = postedPoints[index];
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
  const [selectedDailyPlatforms, setSelectedDailyPlatforms] =
    useState<string[]>([]);
  const dailyPlatformOptions = useMemo(
    () => stats.platformRows.map((row) => row.label),
    [stats.platformRows],
  );
  const dailyClassifiedPosts = useMemo(
    () =>
      selectedDailyPlatforms.length
        ? stats.classifiedPosts.filter((item) =>
            selectedDailyPlatforms.includes(
              normalize(item.post.platform) || "Chưa xác định",
            ),
          )
        : stats.classifiedPosts,
    [selectedDailyPlatforms, stats.classifiedPosts],
  );
  const filteredDailyRows = useMemo(
    () =>
      calculatePublicationDailyRows(
        dailyClassifiedPosts.map((item) => item.post),
        dateWindow,
      ),
    [dailyClassifiedPosts, dateWindow],
  );
  const openPublicationEvidence = (
    title: string,
    subtitle: string,
    items: ClassifiedPublication[],
  ) =>
    onOpenDetail({
      title,
      subtitle,
      publicationEvidence: publicationEvidence(items),
      publicationEvidenceLabel: "Phân loại",
    });
  const openPlatformEvidence = (
    platform: string,
    source?: PublicationSource,
  ) => {
    const platformPosts = stats.classifiedPosts.filter(
      (item) =>
        (normalize(item.post.platform) || "Chưa xác định") ===
        platform,
    );
    openPublicationEvidence(
      source
        ? `${platform} · ${publicationSourceLabels[source]}`
        : `${platform} · Tất cả bài đăng`,
      source
        ? "Các dòng bài đăng thuộc đúng nền tảng và nhóm nội dung đã chọn"
        : "Toàn bộ dòng bài đăng thuộc nền tảng đã chọn",
      source
        ? platformPosts.filter((item) => item.source === source)
        : platformPosts,
    );
  };

  return (
    <section className="postingSection fullWidth groupProduction">
      <div className="postingHeader">
        <div>
          <span className="chartKicker">KINH DOANH · ĐĂNG BÀI</span>
          <h2>Điều phối ấn phẩm & lịch đăng</h2>
          <p>
            Bài đăng đếm theo từng dòng và từng nền tảng; ấn phẩm chưa
            lên lịch đếm theo task thành phẩm cuối, trừ task có Nền Tảng
            là Không Đăng Social.
          </p>
        </div>
      </div>

      <div className="postingKpis">
        <PostingKpi
          label="Tổng bài trong kỳ"
          value={stats.total}
          note={`${formatNumber(stats.posted)} bài đã đăng`}
          onClick={() =>
            openPublicationEvidence(
              "Tổng bài trong kỳ",
              "Toàn bộ dòng bài đăng trong khoảng ngày đang lọc",
              stats.classifiedPosts,
            )
          }
        />
        <PostingKpi
          label="Bài reup"
          value={stats.reup}
          note={formatPercent(stats.reup, stats.total)}
          onClick={() =>
            openPublicationEvidence(
              "Bài reup",
              "Các dòng bài đăng có Book Task để trống trong khoảng ngày đang lọc",
              stats.classifiedPosts.filter(
                (item) => item.source === "reup",
              ),
            )
          }
        />
        <PostingKpi
          label="Bài đăng dùng media"
          value={stats.media}
          note={`${formatNumber(stats.video)} bài video · ${formatNumber(stats.graphic)} bài hình · từ ${formatNumber(stats.uniqueMediaTasks)} task gốc`}
          onClick={() =>
            openPublicationEvidence(
              "Bài đăng dùng media",
              "Các dòng bài đăng sử dụng ấn phẩm Video hoặc Hình ảnh trong khoảng ngày đang lọc",
              stats.classifiedPosts.filter(
                (item) =>
                  item.source === "video" ||
                  item.source === "graphic",
              ),
            )
          }
        />
        <PostingKpi
          label="Chưa lên lịch"
          value={stats.unscheduledTasks.length}
          note={`${formatNumber(stats.unscheduledVideoTasks.length)} video · ${formatNumber(stats.unscheduledGraphicTasks.length)} hình`}
          tooltip={
            <>
              <b>BẮT ĐẦU TỪ 01/07/2026</b>
              <strong>
                {formatNumber(stats.recentUnscheduledTasks.length)} task
              </strong>
              <small>
                {formatNumber(stats.recentUnscheduledVideoTasks.length)} video
                {" · "}
                {formatNumber(stats.recentUnscheduledGraphicTasks.length)} hình
              </small>
            </>
          }
          onClick={() =>
            onOpenDetail({
              title: "Ấn phẩm chưa lên lịch từ 01/07/2026",
              subtitle:
                "Task thành phẩm cuối có Ngày Bắt Đầu từ 01/07/2026 và cột 2.7 Đăng Bài để trống",
              tasks: stats.recentUnscheduledTasks,
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
          onSelect={(label) => {
            const source = sourceFromChartLabel(label);
            openPublicationEvidence(
              label,
              "Các dòng bài đăng tạo nên lát biểu đồ trong khoảng ngày đang lọc",
              stats.classifiedPosts.filter(
                (item) => item.source === source,
              ),
            );
          }}
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
        <PieChart
          className="postingPlatformMix"
          title="Bài đăng theo nền tảng"
          data={stats.platformRows.map((row) => ({
            label: row.label,
            value: row.total,
          }))}
          totalLabel="Bài đăng"
          onSelect={openPlatformEvidence}
          help={{
            title: "Bài đăng theo nền tảng",
            purpose:
              "Cho biết tỷ trọng bài đăng của từng nền tảng trong khoảng ngày đang lọc.",
            objective:
              "Giúp so sánh nhanh khối lượng phân phối nội dung giữa các kênh.",
            calculation:
              "Mỗi dòng ở bảng 2.7 Đăng Bài được tính là một bài cho Nền Tảng của dòng đó. Các nền tảng có tên giống nhau được cộng lại.",
            example:
              "Một task có hai dòng Facebook và TikTok sẽ đóng góp một bài cho mỗi lát nền tảng.",
            note:
              "Nhấn từng lát hoặc chú thích để mở bảng dẫn chứng.",
          }}
        />
      </div>

      <PlatformMixChart
        rows={stats.platformRows}
        onSelect={openPlatformEvidence}
      />

      <div className="postingAssetStatusGrid">
        <PieChart
          className="postingAssetStatus"
          title="Tình trạng lên lịch ấn phẩm"
          data={stats.assetScheduleMix}
          totalLabel="Task ấn phẩm"
          hoverChart={(label) =>
            label === "Đã lên lịch"
              ? {
                  title: "Tình trạng đăng của task đã lên lịch",
                  data: stats.scheduledPostStatusMix,
                  totalLabel: "Task",
                }
              : null
          }
          onSelect={(label) =>
            onOpenDetail({
              title: label,
              subtitle:
                label === "Đã lên lịch"
                  ? "Task thành phẩm cuối đã có liên kết ở cột 2.7 Đăng Bài"
                  : "Task thành phẩm cuối chưa có liên kết ở cột 2.7 Đăng Bài",
              tasks:
                label === "Đã lên lịch"
                  ? stats.assetScheduledTasks
                  : stats.assetUnscheduledTasks,
            })
          }
          onHoverChartSelect={(_, label) =>
            onOpenDetail({
              title: `Ấn phẩm đã lên lịch · ${label}`,
              subtitle:
                label === "Đã đăng"
                  ? "Task đã lên lịch và có ít nhất một bài liên kết đã đăng"
                  : "Task đã lên lịch nhưng chưa có bài liên kết nào đã đăng",
              tasks:
                label === "Đã đăng"
                  ? stats.assetScheduledPostedTasks
                  : stats.assetScheduledUnpostedTasks,
            })
          }
          help={{
            title: "Tình trạng lên lịch ấn phẩm",
            purpose:
              "Theo dõi task đủ điều kiện là ấn phẩm cuối có Ngày Bắt Đầu nằm trong khoảng ngày đang lọc.",
            objective:
              "Cho biết bao nhiêu ấn phẩm đã được book lịch và bao nhiêu ấn phẩm vẫn chưa có lịch đăng.",
            calculation:
              "Đầu tiên lọc task theo Ngày Bắt Đầu. Ấn phẩm Video là task có Format Type chứa Video và Công đoạn Edit; ấn phẩm Hình ảnh là task có Format Type không phải Video và Công đoạn Graphic Design. Task có Nền Tảng = Không Đăng Social được loại khỏi thống kê đăng bài. Với các task còn lại, cột 2.7 Đăng Bài có mã là Đã lên lịch, để trống là Chưa lên lịch. Khi rê vào Đã lên lịch, task được tính Đã đăng nếu có ít nhất một bài liên kết có Đã Đăng = 1.",
            example:
              "Một task video có lịch Facebook và TikTok vẫn chỉ là một ấn phẩm; nếu Facebook đã đăng thì task đó được xếp vào Đã đăng.",
            note:
              "Nhấn vào từng hạng mục để mở danh sách task dẫn chứng.",
          }}
        />
      </div>

      {stats.unknown > 0 && (
        <button
          type="button"
          className="postingDataAlert interactive"
          onClick={() =>
            onOpenDetail({
              title: "Bài đăng cần kiểm tra dữ liệu",
              subtitle:
                "Book Task có giá trị nhưng task liên kết chưa khớp quy tắc phân loại ấn phẩm cuối",
              publicationEvidence: stats.unknownPostDetails,
            })
          }
        >
          <strong>{formatNumber(stats.unknown)} bài cần kiểm tra dữ liệu</strong>
          <span>
            Có Book Task nhưng task liên kết không khớp quy tắc Video–Edit
            hoặc Hình ảnh–Graphic Design.
          </span>
          <small>Nhấn để xem dẫn chứng</small>
        </button>
      )}

      <PostingDailyLineChart
        rows={filteredDailyRows}
        platforms={dailyPlatformOptions}
        selectedPlatforms={selectedDailyPlatforms}
        onSelectedPlatformsChange={setSelectedDailyPlatforms}
        onSelect={(date, series) => {
          const selected = dailyClassifiedPosts.filter(
            (item) =>
              (series === "total" || item.post.posted) &&
              (!date ||
                (item.post.scheduledAt &&
                  dateKey(item.post.scheduledAt) ===
                    dateKey(date))),
          );
          openPublicationEvidence(
            `${series === "posted" ? "Đã đăng" : "Tổng bài"}${
              date ? ` ngày ${formatDate(date)}` : " trong kỳ"
            }`,
            date
              ? series === "posted"
                ? "Các dòng bài đăng trong ngày đã được đánh dấu Đã Đăng"
                : "Toàn bộ dòng bài đăng được lên lịch trong ngày"
              : series === "posted"
                ? "Các dòng bài đăng trong khoảng ngày lọc đã được đánh dấu Đã Đăng"
                : "Toàn bộ dòng bài đăng trong khoảng ngày đang lọc",
            selected,
          );
        }}
      />
    </section>
  );
}
