import { endOfDay } from "@/shared/date/dateUtils";
import {
  collectionMonths,
  normalize,
  normalizedKey,
} from "../model/taskUtils";
import type {
  DateWindow,
  PublicationPost,
  Task,
} from "../model/types";
import { selectEligiblePosts } from "./calculatePublicationStats";

/**
 * Mức độ team Digital đăng hết số ấn phẩm Bộ Sưu Tập mà Media đã trả ra.
 *
 * Quy ước nhãn khác nhau giữa các kênh: Facebook ghi `Reels`, TikTok ghi
 * `Video` cho cùng loại nội dung. Vì vậy phạm vi mặc định gộp cả hai để so
 * sánh được giữa các kênh; phạm vi `reels` giữ đúng nghĩa đen của cột Loại Bài
 * Đăng và trên thực tế chỉ có dữ liệu ở nhóm Facebook.
 */
export type CollectionPostingScope = "reels" | "video";

const REEL_TYPES = new Set(["reels"]);
const VIDEO_TYPES = new Set(["reels", "video"]);

export function isReelPost(post: PublicationPost) {
  return REEL_TYPES.has(normalizedKey(post.postType));
}

export function isVideoPost(post: PublicationPost) {
  return VIDEO_TYPES.has(normalizedKey(post.postType));
}

export function isCollectionPost(post: PublicationPost) {
  return normalizedKey(post.postCategory) === "bộ sưu tập";
}

function inScope(post: PublicationPost, scope: CollectionPostingScope) {
  return scope === "reels" ? isReelPost(post) : isVideoPost(post);
}

/** Bốn tập dùng làm tử số và mẫu số, giữ nguyên post để drill-down. */
export type PostingBuckets = {
  /** Reels, gồm cả chưa đăng. */
  reels: PublicationPost[];
  /** Reels đã đăng. */
  postedReels: PublicationPost[];
  /** Reels + Video, gồm cả chưa đăng. */
  videos: PublicationPost[];
  /** Reels + Video đã đăng. */
  postedVideos: PublicationPost[];
};

export type CollectionPostingRow = {
  platform: string;
  /** Ấn phẩm BST trong phạm vi mà Media đã trả ra. */
  produced: PublicationPost[];
  posted: PublicationPost[];
  pending: PublicationPost[];
  /** Chưa đăng và đã qua Ngày Đăng — phần Digital đang nợ. */
  overdue: PublicationPost[];
  /** Chưa đăng nhưng lịch đăng còn ở tương lai. */
  notYetDue: PublicationPost[];
  buckets: PostingBuckets;
};

export type CollectionPostingFulfillment = {
  scope: CollectionPostingScope;
  /** Các tháng BST có mặt trong kỳ, mới nhất trước. */
  months: string[];
  collectionMonth: string;
  buckets: PostingBuckets;
  produced: PublicationPost[];
  posted: PublicationPost[];
  pending: PublicationPost[];
  overdue: PublicationPost[];
  notYetDue: PublicationPost[];
  /** Mốc dùng để chia quá hạn và chưa tới lịch. */
  asOf: Date;
  /** Dòng đăng bài trong phạm vi nhưng chưa điền Loại Post. */
  uncategorized: PublicationPost[];
  /** Ấn phẩm BST không nối được về task nên không lọc được theo tháng. */
  unlinked: PublicationPost[];
  rows: CollectionPostingRow[];
};

function bucketsOf(posts: PublicationPost[]): PostingBuckets {
  const reels = posts.filter(isReelPost);
  const videos = posts.filter(isVideoPost);
  return {
    reels,
    postedReels: reels.filter((post) => post.posted),
    videos,
    postedVideos: videos.filter((post) => post.posted),
  };
}

export function calculateCollectionPosting(
  tasks: Task[],
  publications: PublicationPost[],
  dateWindow: DateWindow,
  scope: CollectionPostingScope = "video",
  collectionMonth = "",
  asOf: Date = new Date(),
): CollectionPostingFulfillment {
  // Ấn phẩm có lịch đăng ở tương lai chưa phải là việc trễ; nếu gộp chung thì
  // tỷ lệ đăng của cả kỳ bị kéo xuống bởi bộ sưu tập chưa tới lượt.
  const dueCutoff = endOfDay(asOf);
  const isOverdue = (post: PublicationPost) =>
    !post.posted &&
    Boolean(post.scheduledAt) &&
    post.scheduledAt! <= dueCutoff;
  const { posts, taskByCode } = selectEligiblePosts(
    tasks,
    publications,
    dateWindow,
  );

  const taskFor = (post: PublicationPost) =>
    taskByCode.get(normalize(post.bookTaskCode));
  const monthsFor = (post: PublicationPost) => {
    const task = taskFor(post);
    return task ? collectionMonths(task) : [];
  };

  const months = Array.from(
    new Set(posts.filter(isCollectionPost).flatMap(monthsFor)),
  ).sort((left, right) => {
    const [leftMonth, leftYear] = left.split(".").map(Number);
    const [rightMonth, rightYear] = right.split(".").map(Number);
    return rightYear - leftYear || rightMonth - leftMonth;
  });

  // Lọc BST chỉ thu hẹp tử số (ấn phẩm BST). Mẫu số giữ toàn bộ sản lượng của
  // kênh, vì câu hỏi là "BST chiếm bao nhiêu trong những gì kênh đã đăng".
  const matchesMonth = (post: PublicationPost) =>
    !collectionMonth || monthsFor(post).includes(collectionMonth);

  const selected = posts.filter(
    (post) =>
      isCollectionPost(post) && inScope(post, scope) && matchesMonth(post),
  );

  const platforms = Array.from(
    new Map(
      posts
        .filter(isVideoPost)
        .map((post) => [
          normalizedKey(post.platform),
          normalize(post.platform) || "Chưa xác định",
        ]),
    ).values(),
  );

  const rows = platforms
    .map((platform): CollectionPostingRow => {
      const onPlatform = (post: PublicationPost) =>
        (normalize(post.platform) || "Chưa xác định") === platform;
      const produced = selected.filter(onPlatform);
      const pending = produced.filter((post) => !post.posted);
      return {
        platform,
        produced,
        posted: produced.filter((post) => post.posted),
        pending,
        overdue: pending.filter(isOverdue),
        notYetDue: pending.filter((post) => !isOverdue(post)),
        buckets: bucketsOf(posts.filter(onPlatform)),
      };
    })
    .filter(
      (row) => row.produced.length > 0 || row.buckets.postedVideos.length > 0,
    )
    .sort(
      (left, right) =>
        right.produced.length - left.produced.length ||
        right.buckets.postedVideos.length - left.buckets.postedVideos.length,
    );

  return {
    scope,
    months,
    collectionMonth,
    buckets: bucketsOf(posts),
    produced: selected,
    posted: selected.filter((post) => post.posted),
    pending: selected.filter((post) => !post.posted),
    overdue: selected.filter(isOverdue),
    notYetDue: selected.filter(
      (post) => !post.posted && !isOverdue(post),
    ),
    asOf: dueCutoff,
    uncategorized: posts.filter(
      (post) => inScope(post, scope) && !normalize(post.postCategory),
    ),
    unlinked: posts.filter(
      (post) =>
        isCollectionPost(post) && inScope(post, scope) && !taskFor(post),
    ),
    rows,
  };
}
