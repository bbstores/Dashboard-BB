import { useState } from "react";
import { isReelPost } from "../../analytics/calculateCollectionPosting";
import type { CollectionPostingFulfillment, CollectionAsset, CollectionPostingScope, PostingBuckets } from "../../analytics/calculateCollectionPosting";
import { HelpButton } from "../../components/HelpButton";
import type { DetailView, PublicationPost } from "../../model/types";
import { formatNumber } from "@/shared/formatting/format";

function formatRate(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function rate(part: number, whole: number) {
  return whole ? (part / whole) * 100 : null;
}

/** Ghi rõ card đang chịu bộ lọc nào — ba card trong panel không giống nhau. */
function ScopeChips({
  month,
  unit,
}: {
  month: string;
  /** Quyết định luôn bộ lọc: chỉ số theo task chạy theo BST, theo bài chạy theo ngày. */
  unit: "task" | "post";
}) {
  return (
    <span className="postingScopeChips">
      <i className="unit">
        {unit === "task" ? "Đếm theo ấn phẩm (task)" : "Đếm theo bài đăng"}
      </i>
      {unit === "task" ? (
        <i>{month ? `BST ${month}` : "Tất cả BST"}</i>
      ) : (
        <i>Theo khoảng ngày đang lọc</i>
      )}
      <i className="muted">
        {unit === "task"
          ? "Không theo bộ lọc ngày"
          : "Không theo bộ lọc BST"}
      </i>
    </span>
  );
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
 * Media giao bao nhiêu ấn phẩm Bộ Sưu Tập thì Digital phải đăng bấy nhiêu.
 * Phần phễu đếm theo task; phần cơ cấu đếm theo dòng đăng bài.
 */
export function CollectionPostingPanel({
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
  const monthNote = collectionMonth ? ` · BST ${collectionMonth}` : "";

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

  const openAssets = (
    title: string,
    subtitle: string,
    assets: CollectionAsset[],
  ) =>
    onOpenDetail({
      title,
      subtitle,
      tasks: assets.map((asset) => asset.task),
    });

  const reelDenominator = baseOf(performance.buckets, reelBase);
  const reelNumerator = performance.buckets.postedReels;
  const collectionDenominator = baseOf(performance.buckets, collectionBase);
  const collectionNumerator =
    collectionBase === "allReels"
      ? performance.postedCollectionPosts.filter(isReelPost)
      : performance.postedCollectionPosts;

  return (
    <article className="postingSubchart postingCollectionPanel">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">MEDIA TRẢ RA → DIGITAL ĐĂNG</span>
          <h3>Ấn phẩm Bộ Sưu Tập đã được đăng tới đâu</h3>
          <p className="postingChartNote">
            Hai card trái đo cơ cấu sản lượng, đếm theo bài đăng và chạy theo
            bộ lọc ngày ở trên. Card phải đo phần Media giao cho Digital, đếm
            theo ấn phẩm (task) và chạy theo bộ lọc Bộ Sưu Tập. Một task đăng
            ba nền tảng sinh ba dòng đăng bài nhưng vẫn là một ấn phẩm.
          </p>
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
                "Task BST Media sản xuất ra là phải đăng, nên mỗi ấn phẩm chưa lên lịch hoặc quá hạn là một việc còn nợ.",
              calculation:
                "Ấn phẩm Media trả ra là TASK có Format Type video, Công đoạn Edit và có ô Bộ Sưu Tập; đã loại task Pending / Cancel và Không Đăng Social. Một task đăng nhiều nền tảng sinh nhiều dòng ở bảng Đăng Bài nhưng vẫn tính là một ấn phẩm. Nghĩa vụ theo kênh lấy từ cột Nền Tảng trên task. Chỉ số cơ cấu ở hai card ngoài đếm theo dòng đăng bài vì so với tổng sản lượng kênh.",
              example:
                "Task đăng Facebook và TikTok là một ấn phẩm, nhưng là hai nghĩa vụ ở hai kênh; đăng Facebook rồi mà chưa đăng TikTok thì kênh TikTok vẫn còn nợ.",
              note:
                "Bài có Book Task trống là nội dung Digital tự có nguồn hoặc reup, tính vào sản lượng kênh nhưng không phải ấn phẩm Media giao. Facebook ghi loại bài là Reels còn TikTok ghi là Video cho cùng loại nội dung.",
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
              {formatRate(rate(reelNumerator.length, reelDenominator.length))}
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
                setReelBase(event.target.checked ? "allReels" : "postedVideo")
              }
            />
            Mẫu số là tổng Reels (thành tỷ lệ đã đăng)
          </label>
          <ScopeChips month={collectionMonth} unit="post" />
        </div>

        <div className="postingCollectionMetric">
          <button
            type="button"
            onClick={() =>
              openPosts(
                "Bài đăng BST đã lên sóng",
                `Trên ${formatNumber(collectionDenominator.length)} bài ${BASE_LABEL[collectionBase]} · ${scopeNoun} · toàn bộ BST trong kỳ`,
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
              {formatNumber(collectionNumerator.length)} /{" "}
              {formatNumber(collectionDenominator.length)} bài
            </em>
          </button>
          <p className="postingCollectionFormula">
            {collectionBase === "postedVideo"
              ? "Bài đăng BST ÷ tổng video đã đăng — gồm cả nội dung Digital tự có nguồn"
              : "Bài đăng BST dạng Reels ÷ tổng Reels — cả tử và mẫu đều thu về Reels nên là con số của riêng nhóm Facebook"}
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
          <ScopeChips month={collectionMonth} unit="post" />
        </div>
        <div className="postingCollectionMetric">
          <button
            type="button"
            className={
              performance.notScheduled.length || performance.overdue.length
                ? "below"
                : "met"
            }
            onClick={() =>
              openAssets(
                "Ấn phẩm BST chưa đăng đủ kênh",
                `${formatNumber(performance.pending.length)} ấn phẩm còn nợ · ${formatNumber(performance.partial.length)} đăng một phần, ${formatNumber(performance.scheduled.length)} chưa đăng kênh nào, ${formatNumber(performance.notScheduled.length)} chưa lên lịch · ${scopeNoun}${monthNote}`,
                performance.pending,
              )
            }
          >
            <small>Ấn phẩm BST đã đăng đủ kênh</small>
            <strong>
              {formatRate(
                rate(
                  performance.posted.length,
                  performance.evaluated.length,
                ),
              )}
            </strong>
            <em>
              {formatNumber(performance.posted.length)} /{" "}
              {formatNumber(performance.evaluated.length)} ấn phẩm ·{" "}
              {performance.pending.length
                ? `bấm để xem ${formatNumber(performance.pending.length)} ấn phẩm còn nợ`
                : "không còn ấn phẩm nào chưa xong"}
            </em>
          </button>
          <p className="postingCollectionFormula">
            Ấn phẩm có mọi nền tảng đã khai đều đã đăng ÷ tổng ấn phẩm có khai
            nền tảng — {scopeNoun}
            {monthNote}. Cột Shopee tích trên dòng kênh khác cũng tính là đã
            đăng Shopee.
          </p>
          <div className="postingFunnelStates">
            <button
              type="button"
              className="partial"
              onClick={() =>
                openAssets(
                  "Đăng một phần, chưa đủ kênh",
                  performance.missingPlatformTally.length
                    ? `Kênh còn thiếu: ${performance.missingPlatformTally
                        .map(
                          (item) =>
                            `${item.platform} ${formatNumber(item.count)}`,
                        )
                        .join(" · ")}`
                    : "Đã đăng vài kênh nhưng chưa đủ mọi nền tảng đã khai",
                  performance.partial,
                )
              }
            >
              <b>{formatNumber(performance.partial.length)}</b>
              <span>đăng một phần</span>
            </button>
            <button
              type="button"
              className="scheduled"
              onClick={() =>
                openAssets(
                  "Chưa đăng kênh nào",
                  `Đã có dòng trong bảng Đăng Bài nhưng chưa kênh nào lên sóng · ${formatNumber(performance.overdue.length)} đã qua Ngày Đăng`,
                  performance.scheduled,
                )
              }
            >
              <b>{formatNumber(performance.scheduled.length)}</b>
              <span>chưa đăng kênh nào</span>
            </button>
            <button
              type="button"
              className="notScheduled"
              onClick={() =>
                openAssets(
                  "Chưa lên lịch bài nào",
                  "Media đã làm xong nhưng chưa có dòng nào trong bảng Đăng Bài",
                  performance.notScheduled,
                )
              }
            >
              <b>{formatNumber(performance.notScheduled.length)}</b>
              <span>chưa lên lịch</span>
            </button>
          </div>
          <ScopeChips month={collectionMonth} unit="task" />
        </div>

      </div>

      {collectionMonth && !performance.produced.length && (
        <p className="postingCollectionEmpty">
          <strong>
            BST {collectionMonth} chưa có ấn phẩm video nào trong Tasklist.
          </strong>{" "}
          Chọn Tất cả BST để xem toàn bộ.
        </p>
      )}

      {performance.missingPlatform.length > 0 && (
        <button
          type="button"
          className="postingCollectionWarning"
          onClick={() =>
            openAssets(
              "Ấn phẩm chưa khai Nền Tảng",
              "Không biết phải đăng ở đâu nên không kết luận được đạt hay trượt — nằm ngoài mẫu số",
              performance.missingPlatform,
            )
          }
        >
          {formatNumber(performance.missingPlatform.length)} ấn phẩm BST chưa
          khai cột Nền Tảng nên chưa đánh giá được.
        </button>
      )}

      {performance.digitalSourced.length > 0 && (
        <button
          type="button"
          className="postingCollectionWarning neutral"
          onClick={() =>
            openPosts(
              "Bài đăng do Digital tự có nguồn",
              "Cột Book Task trống nên không đến từ ấn phẩm Media giao — reup hoặc Digital tự có source",
              performance.digitalSourced,
            )
          }
        >
          {formatNumber(performance.digitalSourced.length)} bài {scopeNoun} do
          Digital tự có nguồn (Book Task trống) — tính vào sản lượng kênh nhưng
          không phải ấn phẩm Media giao.
        </button>
      )}
    </article>
  );
}
