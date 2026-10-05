import { useMemo, useState } from "react";
import { calculatePublicationDailyRows, calculatePublicationStats, calculatePostingNormDailyTarget, publicationBelongsToPlatform } from "../analytics/calculatePublicationStats";
import type { ClassifiedPublication, PublicationNormPerformance, PublicationSource } from "../analytics/calculatePublicationStats";
import { calculateCollectionPosting } from "../analytics/calculateCollectionPosting";
import type { CollectionPostingScope } from "../analytics/calculateCollectionPosting";
import { PieChart } from "../components/PieChart";
import { HelpButton } from "../components/HelpButton";
import type { DateWindow, DetailView, PublicationPost, PostingNorm, Task } from "../model/types";
import { formatDate, formatNumber, formatPercent } from "@/shared/formatting/format";
import { dateKey } from "@/shared/date/dateUtils";
import { publicationSourceLabels, sourceFromChartLabel, publicationEvidence, formatNormValue } from "./posting/postingShared";
import { PostingKpi } from "./posting/PostingKpi";
import { MediaPostingResponseChart } from "./posting/MediaPostingResponseChart";
import { PlatformMixChart } from "./posting/PlatformMixChart";
import { PostingDailyLineChart } from "./posting/PostingDailyLineChart";
import { CollectionPostingPanel } from "./posting/CollectionPostingPanel";


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
