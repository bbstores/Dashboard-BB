import { useMemo, useState } from "react";
import {
  calculatePublicationDailyRows,
  calculatePublicationStats,
  calculatePostingNormDailyTarget,
  publicationBelongsToPlatform,
  type ClassifiedPublication,
  type MediaPostingResponseItem,
  type MediaPostingResponsePerformance,
  type PublicationDailyRow,
  type PublicationPlatformRow,
  type PublicationNormPerformance,
  type PublicationSource,
} from "../analytics/calculatePublicationStats";
import {
  calculateCollectionPosting,
  isReelPost,
  type CollectionPostingFulfillment,
  type CollectionPostingRow,
  type CollectionPostingScope,
  type PostingBuckets,
} from "../analytics/calculateCollectionPosting";
import { PieChart } from "../components/PieChart";
import { HelpButton } from "../components/HelpButton";
import type {
  DateWindow,
  DetailView,
  PublicationPost,
  PostingNorm,
  Task,
} from "../model/types";
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

function formatNormValue(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value);
}

// Retained temporarily while the combined posting panel replaces this layout.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PostingNormPanel({
  performance,
  onSelect,
}: {
  performance: PublicationNormPerformance;
  onSelect: (platform: string) => void;
}) {
  return (
    <article className="postingNormPanel">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">ĐỊNH MỨC ĐĂNG BÀI</span>
          <h3>Mức độ hoàn thành theo từng kênh</h3>
          <p className="postingChartNote">
            {performance.from && performance.to
              ? `${formatDate(performance.from)}–${formatDate(performance.to)} · ${formatNumber(performance.days)} ngày lịch`
              : "Chọn khoảng ngày để quy đổi định mức."}
          </p>
        </div>
        <HelpButton
          help={{
            title: "Định mức đăng bài",
            purpose:
              "So sánh số bài đã đăng với bảng Định Mức Đăng Bài theo từng nền tảng.",
            objective:
              "Nhận biết kênh đạt, gần đạt hoặc đang thiếu nhịp đăng trong khoảng ngày được chọn.",
            calculation:
              "Định mức Ngày = Số Bài Đăng × số ngày lịch. Định mức Tuần = Số Bài Đăng × số ngày lịch / 7. Thành tích dùng các dòng có Đã Đăng = 1 và Nền Tảng khớp tên kênh. Riêng Shopee gồm Nền Tảng = Shopee hoặc Nền Tảng TikTok có cột Shopee = 1. Kênh không có Số Bài Đăng được hiển thị là Theo ấn phẩm và không tham gia tỷ lệ tổng.",
            example:
              "Facebook BBStore có định mức 12 bài/ngày; khoảng 7 ngày có mục tiêu 84 bài. Nếu đã đăng 76 bài thì đạt 90,5%.",
            note:
              "Cột Chú Thích chỉ dùng giải thích nghiệp vụ; con số trong cột Số Bài Đăng là nguồn tính chính.",
          }}
        />
      </div>

      {performance.rows.length ? (
        <>
          <div className="postingNormSummary">
            <span>
              <small>Mục tiêu cố định</small>
              <strong>{formatNormValue(performance.expectedTotal)}</strong>
              <em>{performance.fixedChannelCount} kênh</em>
            </span>
            <span>
              <small>Đã đăng</small>
              <strong>{formatNumber(performance.postedTotal)}</strong>
              <em>{formatNumber(performance.scheduledTotal)} bài có lịch</em>
            </span>
            <span className={performance.attainment >= 100 ? "met" : "below"}>
              <small>Mức hoàn thành</small>
              <strong>{formatPercent(performance.postedTotal, performance.expectedTotal)}</strong>
              <em>{performance.flexibleChannelCount} kênh theo ấn phẩm</em>
            </span>
            <span className={performance.unmappedPlatforms.length ? "warning" : "met"}>
              <small>Kênh chưa có định mức</small>
              <strong>{formatNumber(performance.unmappedPlatforms.length)}</strong>
              <em>có phát sinh bài đăng</em>
            </span>
          </div>
          <div className="postingNormTable" role="table" aria-label="Mức độ hoàn thành định mức đăng bài">
            <div className="postingNormTableHeader" role="row">
              <span>Kênh</span>
              <span>Định mức</span>
              <span>Mục tiêu kỳ</span>
              <span>Có lịch</span>
              <span>Đã đăng</span>
              <span>Hoàn thành</span>
            </div>
            {performance.rows.map((row) => (
              <button
                type="button"
                className={`postingNormRow ${row.status}`}
                onClick={() => onSelect(row.platform)}
                key={row.platform}
              >
                <span className="postingNormPlatform">
                  <strong>{row.platform}</strong>
                  <small title={row.note}>{row.note || "Không có chú thích"}</small>
                </span>
                <span>
                  {row.target === null
                    ? "Theo ấn phẩm"
                    : `${formatNormValue(row.target)}/${row.unit.toLocaleLowerCase("vi")}`}
                </span>
                <strong>
                  {row.expected === null
                    ? "—"
                    : formatNormValue(row.expected)}
                </strong>
                <strong>{formatNumber(row.scheduled)}</strong>
                <strong>{formatNumber(row.posted)}</strong>
                <span className="postingNormProgress">
                  {row.attainment === null ? (
                    <em>Linh hoạt</em>
                  ) : (
                    <>
                      <i className={row.attainment > 100 ? "overAttained" : ""}>
                        <b
                          style={{
                            width: `${Math.min(100, (row.attainment / Math.max(100, row.attainment)) * 100)}%`,
                          }}
                        />
                        {row.attainment > 100 && (
                          <u
                            style={{ left: `${(100 / row.attainment) * 100}%` }}
                            aria-hidden="true"
                          />
                        )}
                      </i>
                      <em>{formatPercent(row.posted, row.expected ?? 0)}</em>
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="emptyText">
          Workbook chưa có dữ liệu trong sheet Định Mức Đăng Bài.
        </p>
      )}
    </article>
  );
}

function MediaPostingResponseChart({
  performance,
  onOpenDetail,
}: {
  performance: MediaPostingResponsePerformance;
  onOpenDetail: (detail: DetailView) => void;
}) {
  const notOnTimeItems = performance.items.filter(
    (item) => item.status !== "on-time",
  );
  const responseByPost = new Map(
    performance.items.map((item) => [item.post, item]),
  );
  const openItems = (
    title: string,
    subtitle: string,
    items: MediaPostingResponseItem[],
  ) =>
    onOpenDetail({
      title,
      subtitle,
      publicationEvidence: items.map((item) => ({
        post: item.post,
        task: item.task,
        reason: `${item.reason}${
          item.readyAt ? ` · mốc hoàn tất ${formatDate(item.readyAt)}` : ""
        }`,
      })),
      publicationEvidenceLabel: "Đánh giá đáp ứng",
    });
  const openPosts = (
    title: string,
    subtitle: string,
    posts: PublicationPost[],
    reason: string,
  ) =>
    onOpenDetail({
      title,
      subtitle,
      publicationEvidence: posts.map((post) => ({
        post,
        task: responseByPost.get(post)?.task,
        reason,
      })),
      publicationEvidenceLabel: "Dẫn chứng",
    });

  return (
    <article className="postingMediaResponsePanel">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">KINH DOANH × MEDIA</span>
          <h3>Hiệu quả đăng bài và mức đáp ứng Media</h3>
          <p className="postingChartNote">
            {performance.from && performance.to
              ? `${formatDate(performance.from)}–${formatDate(performance.to)} · ${formatNumber(performance.days)} ngày lịch · `
              : ""}
            đối chiếu định mức, bài có lịch và mức sẵn sàng của Media ·
            không gồm Không Đăng Social, Cửa Hàng và TikTok BBStore’s
          </p>
        </div>
        <HelpButton
          help={{
            title: "Hiệu quả đăng bài và mức đáp ứng Media",
            purpose:
              "Đặt KPI đăng bài và khả năng Media đáp ứng lịch đăng trong cùng một bảng theo từng kênh.",
            objective:
              "Nhìn đồng thời kênh có đạt định mức hay không, tỷ trọng bài dùng Media và phần Media chưa kịp đáp ứng ngày đăng.",
            calculation:
              "Task Pending / Cancel và các dòng Đăng Bài liên kết được loại trước khi tính. Riêng chart này tiếp tục loại các kênh Không Đăng Social, Cửa Hàng và TikTok BBStore’s (nhận cả dấu nháy thẳng và dấu nháy cong); TikTok BB Store vẫn được giữ. KPI kỳ được quy đổi từ bảng Định Mức Đăng Bài. Bài dùng Media là dòng Đăng Bài có Book Task không rỗng. Media đáp ứng đúng ngày khi task đạt mốc hoàn tất không muộn hơn hết ngày đăng. Ấn phẩm thuộc BST hoặc tên task có IG/Instagram dùng mốc Done và Ngày Hoàn Thành; các task còn lại dùng mốc Kinh Doanh Done và Ngày Kinh Doanh Duyệt.",
            example:
              "Một kênh có 20 bài, trong đó 12 bài có Book Task; 9 task hoàn tất đúng ngày đăng. Tỷ trọng Media là 60%, mức đáp ứng đúng hạn là 75%.",
            note:
              "Book Task không tìm thấy trong Tasklist hoặc thiếu ngày hoàn tất vẫn nằm trong mẫu số và được tính là chưa đáp ứng.",
          }}
        />
      </div>

      <div className="postingMediaResponseHeadline">
        <span>
          <small>ĐỊNH MỨC TRONG KỲ</small>
          <strong>{formatNormValue(performance.expectedPosts)}</strong>
          <em>{performance.fixedChannelCount} kênh có KPI cố định</em>
        </span>
        <span>
          <small>BÀI CÓ LỊCH</small>
          <strong>{formatNumber(performance.totalPosts)}</strong>
          <em>{performance.flexibleChannelCount} kênh theo ấn phẩm</em>
        </span>
        <span>
          <small>ĐÃ ĐĂNG</small>
          <strong>{formatNumber(performance.postedPosts)}</strong>
          <em>{formatNormValue(performance.postingAttainment)}% định mức kỳ</em>
        </span>
        <button
          type="button"
          onClick={() =>
            openItems(
              "Bài đăng dùng ấn phẩm Media",
              `${formatNumber(performance.mediaPosts)}/${formatNumber(performance.totalPosts)} bài có Book Task`,
              performance.items,
            )
          }
        >
          <small>BÀI DÙNG ẤN PHẨM MEDIA</small>
          <strong>
            {formatNumber(performance.mediaPosts)}/
            {formatNumber(performance.totalPosts)}
          </strong>
          <em>{formatNormValue(performance.mediaShare)}% tổng bài đăng</em>
        </button>
        <button
          type="button"
          className="primary"
          onClick={() =>
            openItems(
              "Media đáp ứng đúng ngày đăng",
              `${formatNumber(performance.onTimePosts)}/${formatNumber(performance.mediaPosts)} bài dùng Media đã sẵn sàng đúng hạn`,
              performance.items.filter((item) => item.status === "on-time"),
            )
          }
        >
          <small>MEDIA ĐÁP ỨNG ĐÚNG NGÀY</small>
          <strong>{formatNormValue(performance.responseRate)}%</strong>
          <em>
            {formatNumber(performance.onTimePosts)}/
            {formatNumber(performance.mediaPosts)} bài dùng Media
          </em>
        </button>
        <button
          type="button"
          className="attention"
          onClick={() =>
            openItems(
              "Bài Media chưa đáp ứng đúng ngày",
              `Trễ ${formatNumber(performance.latePosts)} · chưa hoàn tất ${formatNumber(performance.incompletePosts)} · không khớp task ${formatNumber(performance.unmatchedPosts)}`,
              notOnTimeItems,
            )
          }
        >
          <small>CHƯA ĐÁP ỨNG ĐÚNG NGÀY</small>
          <strong>{formatNumber(notOnTimeItems.length)}</strong>
          <em>
            Trễ {formatNumber(performance.latePosts)} · chưa xong/thiếu dữ liệu{" "}
            {formatNumber(
              performance.incompletePosts + performance.unmatchedPosts,
            )}
          </em>
        </button>
      </div>

      <div
        className="postingMediaResponseBar"
        role="group"
        aria-label="Tỷ lệ bài Media đáp ứng đúng ngày đăng"
      >
        {performance.mediaPosts > 0 ? (
          <>
            <button
              type="button"
              className="onTime"
              style={{
                width: `${performance.responseRate}%`,
              }}
              aria-label={`Đúng ngày: ${performance.onTimePosts} bài`}
              onClick={() =>
                openItems(
                  "Media đáp ứng đúng ngày đăng",
                  "Task đã đạt mốc hoàn tất trước hoặc trong ngày đăng",
                  performance.items.filter(
                    (item) => item.status === "on-time",
                  ),
                )
              }
            />
            <button
              type="button"
              className="notOnTime"
              style={{
                width: `${100 - performance.responseRate}%`,
              }}
              aria-label={`Chưa đúng ngày: ${notOnTimeItems.length} bài`}
              onClick={() =>
                openItems(
                  "Bài Media chưa đáp ứng đúng ngày",
                  "Task hoàn tất trễ, chưa hoàn tất hoặc không khớp Tasklist",
                  notOnTimeItems,
                )
              }
            />
          </>
        ) : (
          <span>Không có bài đăng gắn Book Task trong kỳ</span>
        )}
      </div>
      <div className="postingMediaResponseLegend">
        <span><i className="onTime" />Đáp ứng đúng ngày</span>
        <span><i className="notOnTime" />Chưa đáp ứng đúng ngày</span>
      </div>

      <div className="postingMediaResponsePlatforms">
        <div className="postingMediaResponsePlatformHeader">
          <strong>Kênh</strong>
          <span>Định mức</span>
          <span>Kế hoạch kỳ</span>
          <span>Có lịch</span>
          <span>Đã đăng</span>
          <span>Dùng Media</span>
          <span>Đúng ngày</span>
        </div>
        {performance.platformRows.map((row) => {
          const unpostedPosts = row.posts.filter((post) => !post.posted);
          const notOnTimeRowItems = row.items.filter(
            (item) => item.status !== "on-time",
          );
          return (
          <div
            className="postingMediaResponsePlatformRow"
            key={row.platform}
          >
            <strong>{row.platform}</strong>
            <span className="postingCombinedMetric norm">
              <strong>
                {row.target === null
                  ? "Theo ấn phẩm"
                  : `${formatNormValue(row.target)}/${row.unit.toLocaleLowerCase("vi")}`}
              </strong>
              <small title={row.note}>{row.note}</small>
            </span>
            <span className="postingCombinedMetric">
              <strong>
                {row.expectedPosts === null
                  ? "—"
                  : formatNormValue(row.expectedPosts)}
              </strong>
              <small>mục tiêu</small>
            </span>
            <button
              type="button"
              className="postingCombinedMetric postingMediaResponseMetricButton"
              aria-label={`Có lịch · ${row.platform}: ${formatNumber(row.totalPosts)} bài`}
              onClick={() =>
                openPosts(
                  `Bài có lịch · ${row.platform}`,
                  `${formatNumber(row.totalPosts)} bài có lịch trong kỳ đang lọc`,
                  row.posts,
                  "Có lịch trong kỳ",
                )
              }
            >
              <strong>{formatNumber(row.totalPosts)}</strong>
              <small>bài</small>
            </button>
            <button
              type="button"
              className="postingCombinedMetric postingMediaResponseMetricButton"
              aria-label={`Đã đăng · ${row.platform}: ${formatNumber(row.postedPosts)} bài; mở ${formatNumber(unpostedPosts.length)} bài chưa đăng`}
              onClick={() =>
                openPosts(
                  `Bài chưa đăng · ${row.platform}`,
                  `${formatNumber(row.postedPosts)} bài đã đăng; còn ${formatNumber(unpostedPosts.length)} bài chưa đăng trong kỳ`,
                  unpostedPosts,
                  "Chưa đăng",
                )
              }
            >
              <strong>{formatNumber(row.postedPosts)}</strong>
              <small>
                {row.postingAttainment === null
                  ? "linh hoạt"
                  : `${formatNormValue(row.postingAttainment)}% KPI`}
              </small>
            </button>
            <button
              type="button"
              className="postingCombinedMetric postingMediaResponseMetricButton"
              aria-label={`Dùng Media · ${row.platform}: ${formatNumber(row.mediaPosts)} task`}
              onClick={() =>
                openItems(
                  `Task Media · ${row.platform}`,
                  `${formatNumber(row.mediaPosts)} bài có Book Task Media trong kỳ`,
                  row.items,
                )
              }
            >
              <strong>
                {formatNumber(row.mediaPosts)}/{formatNumber(row.totalPosts)}
              </strong>
              <small>{formatNormValue(row.mediaShare)}% tổng bài</small>
            </button>
            <button
              type="button"
              className="postingMediaResponseProgress postingMediaResponseMetricButton"
              aria-label={`Đúng ngày · ${row.platform}: ${formatNumber(row.onTimePosts)}/${formatNumber(row.mediaPosts)} task; mở ${formatNumber(notOnTimeRowItems.length)} task trễ hạn`}
              onClick={() =>
                openItems(
                  `Task Media trễ hạn · ${row.platform}`,
                  `${formatNumber(row.onTimePosts)}/${formatNumber(row.mediaPosts)} task đúng ngày; còn ${formatNumber(notOnTimeRowItems.length)} task chưa đáp ứng đúng ngày`,
                  notOnTimeRowItems,
                )
              }
            >
              <i><b style={{ width: `${row.responseRate}%` }} /></i>
              <span>
                <strong>
                  {formatNumber(row.onTimePosts)}/{formatNumber(row.mediaPosts)}
                </strong>
                <em>{formatNormValue(row.responseRate)}%</em>
              </span>
            </button>
          </div>
          );
        })}
      </div>
    </article>
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
        Sau khi loại các dòng liên kết với task Pending / Cancel, mỗi dòng
        trong bảng Đăng Bài được tính là một bài. Một task đăng Facebook
        và TikTok sẽ được tính thành hai bài ở hai nền tảng. Bài chưa xác
        định được xem tại cảnh báo dữ liệu riêng.
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

function formatRate(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function rate(part: number, whole: number) {
  return whole ? (part / whole) * 100 : null;
}

/** Mẫu số của chỉ số cơ cấu: sản lượng đã đăng, hoặc toàn bộ Reels đã lên lịch. */
type ShareBase = "postedVideo" | "allReels";

function baseOf(buckets: PostingBuckets, base: ShareBase) {
  return base === "allReels" ? buckets.reels : buckets.postedVideos;
}

const BASE_LABEL: Record<ShareBase, string> = {
  postedVideo: "tổng video đã đăng",
  allReels: "tổng Reels",
};

/**
 * Media sản xuất bao nhiêu ấn phẩm Bộ Sưu Tập thì Digital phải đăng bấy nhiêu.
 * Panel đo phần đã đăng so với phần Media trả ra, tách theo nền tảng.
 */
function CollectionPostingPanel({
  performance,
  scope,
  onScopeChange,
  collectionMonth,
  onCollectionMonthChange,
  onOpenDetail,
}: {
  performance: CollectionPostingFulfillment;
  scope: CollectionPostingScope;
  onScopeChange: (scope: CollectionPostingScope) => void;
  collectionMonth: string;
  onCollectionMonthChange: (month: string) => void;
  onOpenDetail: (detail: DetailView) => void;
}) {
  const [reelBase, setReelBase] = useState<ShareBase>("postedVideo");
  const [collectionBase, setCollectionBase] =
    useState<ShareBase>("postedVideo");
  const scopeNoun = scope === "reels" ? "Reels" : "Reels + Video";
  const monthNote = collectionMonth
    ? ` · BST ${collectionMonth}`
    : "";

  const openPosts = (
    title: string,
    subtitle: string,
    posts: PublicationPost[],
  ) =>
    onOpenDetail({
      title,
      subtitle,
      publicationEvidence: posts.map((post) => ({
        post,
        reason: post.posted ? "Đã đăng" : "Chưa đăng",
      })),
      publicationEvidenceLabel: "Tình trạng",
    });

  const reelDenominator = baseOf(performance.buckets, reelBase);
  const reelNumerator = performance.buckets.postedReels;
  const collectionDenominator = baseOf(
    performance.buckets,
    collectionBase,
  );
  // Mẫu số "tổng Reels" chỉ có dữ liệu Facebook, nên tử số phải cùng thu về
  // Reels — nếu để nguyên BST toàn kênh thì tỷ lệ trộn hai gốc và có thể vượt
  // 100%.
  const collectionNumerator =
    collectionBase === "allReels"
      ? performance.posted.filter(isReelPost)
      : performance.posted;
  const collectionProduced =
    collectionBase === "allReels"
      ? performance.produced.filter(isReelPost)
      : performance.produced;

  return (
    <article className="postingSubchart postingCollectionPanel">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">MEDIA TRẢ RA → DIGITAL ĐĂNG</span>
          <h3>Ấn phẩm Bộ Sưu Tập đã được đăng tới đâu</h3>
        </div>
        <div className="postingCollectionTools">
          <label className="postingCollectionMonth">
            <span>Bộ Sưu Tập</span>
            <select
              value={collectionMonth}
              onChange={(event) =>
                onCollectionMonthChange(event.target.value)
              }
              aria-label="Lọc theo tháng Bộ Sưu Tập"
            >
              <option value="">Tất cả BST</option>
              {performance.months.map((month) => (
                <option value={month} key={month}>
                  BST {month}
                </option>
              ))}
            </select>
          </label>
          <div
            className="postingScopeSwitch"
            role="group"
            aria-label="Phạm vi loại bài đăng"
          >
            <button
              type="button"
              className={scope === "video" ? "active" : ""}
              onClick={() => onScopeChange("video")}
            >
              Reels + Video
            </button>
            <button
              type="button"
              className={scope === "reels" ? "active" : ""}
              onClick={() => onScopeChange("reels")}
            >
              Chỉ Reels
            </button>
          </div>
          <HelpButton
            help={{
              title: "Ấn phẩm Bộ Sưu Tập đã được đăng tới đâu",
              purpose:
                "Đo phần ấn phẩm Bộ Sưu Tập mà Digital đã đăng so với số Media trả ra, tách theo nền tảng.",
              objective:
                "Task BST Media sản xuất ra là phải đăng, nên tỷ lệ dưới 100% ở một kênh nghĩa là còn tồn ấn phẩm chưa lên bài ở kênh đó.",
              calculation:
                "Ấn phẩm BST là dòng ở 2.7 Đăng Bài có Loại Post = Bộ Sưu Tập; đã loại dòng gắn task Pending / Cancel và task Không Đăng Social, giới hạn theo Ngày Đăng trong bộ lọc. Lọc BST chỉ thu hẹp tử số, mẫu số giữ toàn bộ sản lượng của kênh. Mỗi card in công thức đang dùng ngay dưới con số.",
              example:
                "Một kênh có 231 ấn phẩm BST, đã đăng 184 → tỷ lệ đăng 79,7%; nếu kênh đó đăng tổng 392 video thì BST chiếm 46,9%.",
              note:
                "Facebook ghi loại bài là Reels còn TikTok ghi là Video cho cùng loại nội dung, nên phạm vi mặc định gộp cả hai. Chọn Chỉ Reels, hoặc đổi mẫu số sang tổng Reels, sẽ cho ra con số chỉ của nhóm Facebook.",
            }}
          />
        </div>
      </div>

      <div className="postingCollectionSummary">
        <div className="postingCollectionMetric">
          <button
            type="button"
            onClick={() =>
              openPosts(
                "Reels đã đăng",
                `Trên ${formatNumber(reelDenominator.length)} bài ${BASE_LABEL[reelBase]}`,
                reelNumerator,
              )
            }
          >
            <small>Reels trên sản lượng</small>
            <strong>
              {formatRate(
                rate(reelNumerator.length, reelDenominator.length),
              )}
            </strong>
            <em>
              {formatNumber(reelNumerator.length)} /{" "}
              {formatNumber(reelDenominator.length)} bài
            </em>
          </button>
          <p className="postingCollectionFormula">
            Reels đã đăng ÷ {BASE_LABEL[reelBase]}
            {reelBase === "postedVideo"
              ? " — gồm toàn bộ Reels và Video đã đăng của mọi kênh, mọi loại nội dung"
              : " — chỉ Reels nên là con số của riêng nhóm Facebook"}
          </p>
          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={reelBase === "allReels"}
              onChange={(event) =>
                setReelBase(
                  event.target.checked ? "allReels" : "postedVideo",
                )
              }
            />
            Mẫu số là tổng Reels (thành tỷ lệ đã đăng)
          </label>
        </div>

        <div className="postingCollectionMetric">
          <button
            type="button"
            className={performance.overdue.length ? "below" : "met"}
            onClick={() =>
              openPosts(
                "Ấn phẩm BST quá hạn đăng",
                `${formatNumber(performance.overdue.length)} ấn phẩm đã qua Ngày Đăng mà chưa lên bài · ${scopeNoun}${monthNote}`,
                performance.overdue,
              )
            }
          >
            <small>BST đã đăng trên BST đã tới lịch</small>
            <strong>
              {formatRate(
                rate(
                  performance.posted.length,
                  performance.posted.length + performance.overdue.length,
                ),
              )}
            </strong>
            <em>
              {formatNumber(performance.posted.length)} đã đăng ·{" "}
              {formatNumber(performance.overdue.length)} quá hạn
            </em>
          </button>
          <p className="postingCollectionFormula">
            BST đã đăng ÷ (đã đăng + quá hạn) — {scopeNoun}
            {monthNote}. Tính tới {formatDate(performance.asOf)}, còn{" "}
            {formatNumber(performance.notYetDue.length)} ấn phẩm chưa tới lịch
            đăng nên không nằm trong mẫu số.
          </p>
          <button
            type="button"
            className="postingCollectionSubLink"
            onClick={() =>
              openPosts(
                "Toàn bộ ấn phẩm BST chưa đăng",
                `${formatNumber(performance.overdue.length)} quá hạn và ${formatNumber(performance.notYetDue.length)} chưa tới lịch · ${scopeNoun}${monthNote}`,
                performance.pending,
              )
            }
          >
            Xem cả {formatNumber(performance.pending.length)} ấn phẩm chưa đăng
            · tỷ lệ trên tổng Media trả ra{" "}
            {formatRate(
              rate(performance.posted.length, performance.produced.length),
            )}
          </button>
        </div>

        <div className="postingCollectionMetric">
          <button
            type="button"
            onClick={() =>
              openPosts(
                "Ấn phẩm BST đã đăng",
                `Trên ${formatNumber(collectionDenominator.length)} bài ${BASE_LABEL[collectionBase]} · ${scopeNoun}${monthNote}`,
                collectionNumerator,
              )
            }
          >
            <small>BST chiếm bao nhiêu sản lượng</small>
            <strong>
              {formatRate(
                rate(
                  collectionNumerator.length,
                  collectionDenominator.length,
                ),
              )}
            </strong>
            <em>
              {formatRate(
                rate(
                  collectionProduced.length,
                  collectionDenominator.length,
                ),
              )}{" "}
              nếu tính cả BST chưa đăng
            </em>
          </button>
          <p className="postingCollectionFormula">
            {collectionBase === "postedVideo"
              ? "BST đã đăng ÷ tổng video đã đăng — gồm toàn bộ Reels và Video đã đăng của mọi kênh, mọi loại nội dung"
              : "BST Reels đã đăng ÷ tổng Reels — cả tử và mẫu đều thu về Reels nên là con số của riêng nhóm Facebook"}
          </p>
          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={collectionBase === "allReels"}
              onChange={(event) =>
                setCollectionBase(
                  event.target.checked ? "allReels" : "postedVideo",
                )
              }
            />
            Mẫu số là tổng Reels
          </label>
        </div>
      </div>

      <div
        className="postingCollectionTable"
        role="table"
        aria-label="Ấn phẩm Bộ Sưu Tập theo nền tảng"
      >
        <div className="postingCollectionHeader" role="row">
          <span>Nền tảng</span>
          <span>Media trả ra</span>
          <span>Đã đăng</span>
          <span>Quá hạn</span>
          <span>Tỷ lệ đăng</span>
          <span>{BASE_LABEL[collectionBase]}</span>
          <span>BST chiếm</span>
        </div>
        {performance.rows.map((row) => (
          <CollectionPostingTableRow
            key={row.platform}
            row={row}
            base={collectionBase}
            scopeNoun={`${scopeNoun}${monthNote}`}
            onOpenPosts={openPosts}
          />
        ))}
        {!performance.rows.length && (
          <p className="emptyText">
            Không có dòng đăng bài nào trong khoảng lọc.
          </p>
        )}
      </div>

      {(performance.uncategorized.length > 0 ||
        performance.unlinked.length > 0) && (
        <div className="postingCollectionWarnings">
          {performance.uncategorized.length > 0 && (
            <button
              type="button"
              className="postingCollectionWarning"
              onClick={() =>
                openPosts(
                  "Bài đăng chưa điền Loại Post",
                  "Không quy được về Bộ Sưu Tập nên không nằm trong tử số lẫn mẫu số của tỷ lệ đăng",
                  performance.uncategorized,
                )
              }
            >
              {formatNumber(performance.uncategorized.length)} bài {scopeNoun}{" "}
              chưa điền Loại Post nên chưa tính được là BST hay không.
            </button>
          )}
          {performance.unlinked.length > 0 && (
            <button
              type="button"
              className="postingCollectionWarning"
              onClick={() =>
                openPosts(
                  "Ấn phẩm BST chưa nối được về task",
                  "Cột Book Task trống nên không tra được BST thuộc tháng nào; các ấn phẩm này biến mất khi lọc theo tháng",
                  performance.unlinked,
                )
              }
            >
              {formatNumber(performance.unlinked.length)} ấn phẩm BST không có
              Book Task nên không lọc được theo tháng.
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function CollectionPostingTableRow({
  row,
  base,
  scopeNoun,
  onOpenPosts,
}: {
  row: CollectionPostingRow;
  base: ShareBase;
  scopeNoun: string;
  onOpenPosts: (
    title: string,
    subtitle: string,
    posts: PublicationPost[],
  ) => void;
}) {
  const fulfillment = rate(
    row.posted.length,
    row.posted.length + row.overdue.length,
  );
  const denominator = baseOf(row.buckets, base);
  const shareNumerator =
    base === "allReels" ? row.posted.filter(isReelPost) : row.posted;
  const status =
    fulfillment === null
      ? "flexible"
      : fulfillment >= 100
        ? "met"
        : fulfillment >= 80
          ? "near"
          : "below";
  return (
    <div className={`postingCollectionRow ${status}`} role="row">
      <strong className="postingCollectionPlatform">{row.platform}</strong>
      <button
        type="button"
        onClick={() =>
          onOpenPosts(
            `${row.platform} · ấn phẩm BST Media trả ra`,
            `${scopeNoun} có Loại Post = Bộ Sưu Tập`,
            row.produced,
          )
        }
      >
        {formatNumber(row.produced.length)}
      </button>
      <button
        type="button"
        onClick={() =>
          onOpenPosts(
            `${row.platform} · ấn phẩm BST đã đăng`,
            `${scopeNoun} · Đã Đăng = 1`,
            row.posted,
          )
        }
      >
        {formatNumber(row.posted.length)}
      </button>
      <button
        type="button"
        className={row.overdue.length ? "postingCollectionOverdue" : undefined}
        onClick={() =>
          onOpenPosts(
            `${row.platform} · ấn phẩm BST quá hạn đăng`,
            `${scopeNoun} · đã qua Ngày Đăng mà chưa lên bài`,
            row.overdue,
          )
        }
      >
        {formatNumber(row.overdue.length)}
      </button>
      <span className="postingCollectionRate">
        <i>
          <b style={{ width: `${Math.min(100, fulfillment ?? 0)}%` }} />
        </i>
        <em>{formatRate(fulfillment)}</em>
      </span>
      <button
        type="button"
        onClick={() =>
          onOpenPosts(
            `${row.platform} · ${BASE_LABEL[base]}`,
            base === "allReels"
              ? "Toàn bộ dòng Reels của kênh, gồm cả chưa đăng"
              : "Toàn bộ dòng Reels + Video có Đã Đăng = 1 của kênh",
            denominator,
          )
        }
      >
        {formatNumber(denominator.length)}
      </button>
      <span className="postingCollectionShare">
        {formatRate(rate(shareNumerator.length, denominator.length))}
      </span>
    </div>
  );
}

export function PostingSection({
  tasks,
  publications,
  postingNorms = [],
  dateWindow,
  onOpenDetail,
}: {
  tasks: Task[];
  publications: PublicationPost[];
  postingNorms?: PostingNorm[];
  dateWindow: DateWindow;
  onOpenDetail: (detail: DetailView) => void;
}) {
  const stats = useMemo(
    () =>
      calculatePublicationStats(
        tasks,
        publications,
        dateWindow,
        postingNorms,
      ),
    [tasks, publications, dateWindow, postingNorms],
  );
  const [collectionScope, setCollectionScope] =
    useState<CollectionPostingScope>("video");
  const [collectionMonth, setCollectionMonth] = useState("");
  const collectionPosting = useMemo(
    () =>
      calculateCollectionPosting(
        tasks,
        publications,
        dateWindow,
        collectionScope,
        collectionMonth,
      ),
    [tasks, publications, dateWindow, collectionScope, collectionMonth],
  );
  const [selectedDailyPlatforms, setSelectedDailyPlatforms] =
    useState<string[]>([]);
  const dailyPlatformOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...stats.platformRows.map((row) => row.label),
          ...postingNorms.map((norm) => norm.platform),
        ]),
      ),
    [postingNorms, stats.platformRows],
  );
  const dailyClassifiedPosts = useMemo(
    () =>
      selectedDailyPlatforms.length
        ? stats.classifiedPosts.filter((item) =>
            selectedDailyPlatforms.some((platform) =>
              publicationBelongsToPlatform(item.post, platform),
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
  const dailyNormTarget = useMemo(
    () =>
      calculatePostingNormDailyTarget(
        postingNorms,
        selectedDailyPlatforms,
      ),
    [postingNorms, selectedDailyPlatforms],
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
      (item) => publicationBelongsToPlatform(item.post, platform),
    );
    openPublicationEvidence(
      source
        ? `${platform} · ${publicationSourceLabels[source]}`
        : `${platform} · Tất cả bài đăng`,
      source
        ? "Các dòng bài đăng thuộc đúng nền tảng và nhóm nội dung đã chọn"
        : platform === "Shopee"
          ? "Gồm bài có Nền Tảng = Shopee và bài TikTok được tích cột Shopee"
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
            là Không Đăng Social. Toàn bộ task Pending / Cancel và các
            dòng Đăng Bài liên kết đều được loại khỏi báo cáo.
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
          label="Bài đã đăng dùng Media"
          value={stats.postedMedia}
          note={`${formatNumber(stats.postedVideo)} bài video · ${formatNumber(stats.postedGraphic)} bài hình · từ ${formatNumber(stats.uniquePostedMediaTasks)} task gốc`}
          onClick={() =>
            openPublicationEvidence(
              "Bài đã đăng dùng Media",
              "Các dòng trong khoảng ngày đang lọc có Đã Đăng và sử dụng ấn phẩm Video hoặc Hình ảnh",
              stats.postedMediaEvidence,
            )
          }
        />
        <PieChart
          compact
          className="postingUnscheduledBreakdown"
          title="Ấn phẩm chưa lên lịch"
          data={stats.unscheduledBreakdown}
          totalLabel="Task"
          onSelect={(label) => {
            const groups = {
              "Ấn phẩm cũ": {
                tasks: stats.oldAssets,
                subtitle:
                  "Ấn phẩm chưa lên lịch có ngày sẵn sàng trước 01/07/2026",
              },
              "Bắt đầu từ 01/07": {
                tasks: stats.recentUnscheduledTasks,
                subtitle:
                  "Ấn phẩm chưa lên lịch có Ngày Bắt Đầu từ 01/07/2026",
              },
              "Ấn phẩm chuyển tiếp": {
                tasks: stats.transitionUnscheduledTasks,
                subtitle:
                  "Bắt đầu trước 01/07 nhưng đạt mốc sẵn sàng từ 01/07/2026",
              },
              "Chưa đủ mốc ngày": {
                tasks: stats.undatedUnscheduledTasks,
                subtitle:
                  "Ấn phẩm chưa lên lịch không có đủ mốc ngày để xếp vào ba nhóm còn lại",
              },
            } as const;
            const group = groups[label as keyof typeof groups];
            if (!group) return;
            onOpenDetail({
              title: `Ấn phẩm chưa lên lịch · ${label}`,
              subtitle: group.subtitle,
              tasks: group.tasks,
            });
          }}
          help={{
            title: "Ấn phẩm chưa lên lịch",
            purpose:
              "Phân rã toàn bộ task thành phẩm chưa có liên kết Đăng Bài để tổng luôn đối soát được.",
            objective:
              "Tách rõ tồn cũ, ấn phẩm mới, ấn phẩm chuyển tiếp và task thiếu mốc ngày.",
            calculation:
              "Đầu tiên loại task Pending / Cancel. Sau đó lấy task Video/Xào Source–Edit hoặc Hình ảnh–Graphic Design, loại Nền Tảng = Không Đăng Social và chỉ giữ task chưa có liên kết 2.7 Đăng Bài. Ấn phẩm cũ có ngày sẵn sàng trước 01/07; Bắt đầu từ 01/07 dùng Ngày Bắt Đầu; Chuyển tiếp bắt đầu trước mốc nhưng sẵn sàng từ mốc; phần còn lại là Chưa đủ mốc ngày.",
            example:
              "703 task được tách thành 508 cũ + 43 bắt đầu mới + 3 chuyển tiếp + 149 thiếu mốc ngày.",
            note:
              "Bốn lát loại trừ nhau và luôn cộng đúng bằng tổng ở giữa donut.",
          }}
        />
        <PostingKpi
          label="Dữ liệu cần kiểm tra · Không Đăng Social"
          value={stats.noSocialPostDetails.length}
          note="Có dòng Đăng Bài liên kết sai quy tắc"
          variant="warning"
          onClick={() =>
            onOpenDetail({
              title:
                "Dữ liệu cần kiểm tra · Không Đăng Social",
              subtitle:
                "Dòng Đăng Bài có Book Task liên kết tới task được đánh dấu Không Đăng Social",
              publicationEvidence: stats.noSocialPostDetails,
              publicationEvidenceLabel: "Lý do kiểm tra",
            })
          }
        />
      </div>

      <MediaPostingResponseChart
        performance={stats.mediaPostingResponse}
        onOpenDetail={onOpenDetail}
      />

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
              "Loại task Pending / Cancel và dòng Đăng Bài liên kết với chúng trước khi tính. Book Task trống là Reup. Book Task nối tới task Edit có Format Type chứa Video hoặc Xào Source là Media Video; nối tới task Graphic Design không thuộc hai nhóm trên là Media Hình ảnh. Mỗi dòng đăng ở một nền tảng được tính là một bài.",
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
              "Sau khi loại các dòng liên kết với task Pending / Cancel, mỗi dòng ở bảng 2.7 Đăng Bài được tính là một bài cho Nền Tảng của dòng đó. Các nền tảng có tên giống nhau được cộng lại.",
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

      <CollectionPostingPanel
        performance={collectionPosting}
        scope={collectionScope}
        onScopeChange={setCollectionScope}
        collectionMonth={collectionMonth}
        onCollectionMonthChange={setCollectionMonth}
        onOpenDetail={onOpenDetail}
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
              "Đầu tiên loại task Pending / Cancel rồi lọc theo Ngày Bắt Đầu. Ấn phẩm Video là task Edit có Format Type chứa Video hoặc Xào Source; ấn phẩm Hình ảnh là task Graphic Design không thuộc hai nhóm trên. Task có Nền Tảng = Không Đăng Social được loại khỏi thống kê đăng bài. Với các task còn lại, cột 2.7 Đăng Bài có mã là Đã lên lịch, để trống là Chưa lên lịch. Khi rê vào Đã lên lịch, task được tính Đã đăng nếu có ít nhất một bài liên kết có Đã Đăng = 1.",
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
            Có Book Task nhưng task liên kết không khớp quy tắc
            Video/Xào Source–Edit hoặc Hình ảnh–Graphic Design.
          </span>
          <small>Nhấn để xem dẫn chứng</small>
        </button>
      )}

      <PostingDailyLineChart
        rows={filteredDailyRows}
        dailyNormTarget={dailyNormTarget}
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
