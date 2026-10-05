import type { MediaPostingResponseItem, MediaPostingResponsePerformance } from "../../analytics/calculatePublicationStats";
import { HelpButton } from "../../components/HelpButton";
import type { DetailView, PublicationPost } from "../../model/types";
import { formatDate, formatNumber } from "@/shared/formatting/format";
import { formatNormValue } from "./postingShared";

export function MediaPostingResponseChart({
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
