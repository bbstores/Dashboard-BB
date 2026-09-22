import { endOfDay } from "@/shared/date/dateUtils";
import {
  collectionMonths,
  isNoSocialPublicationTask,
  isPendingCancelTask,
  isVideoPublication,
  normalize,
  normalizedKey,
} from "../model/taskUtils";
import type {
  DateWindow,
  PublicationPost,
  Task,
} from "../model/types";
import {
  selectEligiblePosts,
  taskPlatformNames,
} from "./calculatePublicationStats";

/**
 * Media giao bao nhiêu ấn phẩm Bộ Sưu Tập thì Digital phải đăng bấy nhiêu.
 *
 * Đơn vị của phần "Media trả ra" là TASK ấn phẩm, không phải dòng đăng bài:
 * một task đăng nhiều kênh sinh nhiều dòng, và task chưa được lên lịch thì
 * chưa có dòng nào — đếm theo dòng sẽ vừa nhân đôi vừa bỏ sót.
 *
 * Ngược lại, phần "BST chiếm bao nhiêu sản lượng" vẫn đếm theo dòng, vì nó so
 * với tổng bài kênh đã đăng, trong đó có cả nội dung Digital tự có nguồn
 * (Book Task trống).
 *
 * Quy ước nhãn khác nhau giữa các kênh: Facebook ghi `Reels`, TikTok ghi
 * `Video` cho cùng loại nội dung, nên phạm vi mặc định gộp cả hai.
 */
export type CollectionPostingScope = "reels" | "video";

/** Ba trạng thái của một ấn phẩm trong phễu Media → Digital. */
type CollectionAssetState =
  | "posted"
  | "scheduled"
  | "notScheduled";

export type CollectionAsset = {
  task: Task;
  /** Dòng đăng bài nối về task này. */
  posts: PublicationPost[];
  /** Kênh phải đăng, lấy từ cột Nền Tảng trên task. */
  platforms: string[];
  state: CollectionAssetState;
};

const REEL_TYPES = new Set(["reels"]);
const VIDEO_TYPES = new Set(["reels", "video"]);

export function isReelPost(post: PublicationPost) {
  return REEL_TYPES.has(normalizedKey(post.postType));
}

function isVideoPost(post: PublicationPost) {
  return VIDEO_TYPES.has(normalizedKey(post.postType));
}

/** Bốn tập dòng đăng bài dùng làm mẫu số của chỉ số cơ cấu. */
export type PostingBuckets = {
  reels: PublicationPost[];
  postedReels: PublicationPost[];
  videos: PublicationPost[];
  postedVideos: PublicationPost[];
};

export type CollectionPostingFulfillment = {
  scope: CollectionPostingScope;
  months: string[];
  collectionMonth: string;
  asOf: Date;
  /** Toàn bộ ấn phẩm BST Media trả ra trong kỳ. */
  produced: CollectionAsset[];
  posted: CollectionAsset[];
  scheduled: CollectionAsset[];
  notScheduled: CollectionAsset[];
  /** Tất cả ấn phẩm chưa lên sóng — đây là danh sách việc còn nợ. */
  pending: CollectionAsset[];
  overdue: CollectionAsset[];
  /** Mẫu số cơ cấu, đếm theo dòng đăng bài (gồm cả nguồn của Digital). */
  buckets: PostingBuckets;
  /** Dòng đăng bài BST đã đăng của chính các ấn phẩm đang xét — tử số cơ cấu. */
  postedCollectionPosts: PublicationPost[];
  /** Dòng đăng bài Book Task trống: Digital reup hoặc tự có source. */
  digitalSourced: PublicationPost[];
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

/**
 * Hai nhóm chỉ số trong panel chịu hai bộ lọc khác nhau, cố ý:
 *
 * - Phễu giao nhận đếm theo TASK và chỉ theo bộ lọc Bộ Sưu Tập, vì câu hỏi là
 *   "bộ sưu tập này Media giao bao nhiêu, Digital đăng được bao nhiêu".
 * - Chỉ số cơ cấu đếm theo DÒNG đăng bài và chỉ theo bộ lọc ngày, vì câu hỏi
 *   là "trong sản lượng kỳ này, Reels và BST chiếm bao nhiêu".
 */
const ALL_DATES: DateWindow = { from: null, to: null, hasFilter: false };

export function calculateCollectionPosting(
  tasks: Task[],
  publications: PublicationPost[],
  dateWindow: DateWindow,
  scope: CollectionPostingScope = "video",
  collectionMonth = "",
  asOf: Date = new Date(),
): CollectionPostingFulfillment {
  // Phễu: toàn bộ workbook, không cắt theo ngày.
  const { posts: allPosts } = selectEligiblePosts(
    tasks,
    publications,
    ALL_DATES,
  );
  // Cơ cấu: chỉ dòng đăng bài trong khoảng ngày đang lọc.
  const { posts: windowedPosts } = selectEligiblePosts(
    tasks,
    publications,
    dateWindow,
  );
  const dueCutoff = endOfDay(asOf);

  const postsByTask = new Map<string, PublicationPost[]>();
  for (const post of allPosts) {
    const code = normalize(post.bookTaskCode);
    if (!code) continue;
    postsByTask.set(code, [...(postsByTask.get(code) ?? []), post]);
  }

  // Ấn phẩm cuối là task video/reel đã qua Edit và có ô Bộ Sưu Tập.
  const collectionTasks = tasks.filter(
    (task) =>
      !isPendingCancelTask(task) &&
      !isNoSocialPublicationTask(task) &&
      isVideoPublication(task) &&
      Boolean(normalize(task.collection)),
  );

  const months = Array.from(
    new Set(tasks.flatMap(collectionMonths)),
  ).sort((left, right) => {
    const [leftMonth, leftYear] = left.split(".").map(Number);
    const [rightMonth, rightYear] = right.split(".").map(Number);
    return rightYear - leftYear || rightMonth - leftMonth;
  });

  const assets: CollectionAsset[] = collectionTasks
    .filter(
      (task) =>
        !collectionMonth ||
        collectionMonths(task).includes(collectionMonth),
    )
    .map((task) => {
      // Lấy mọi dòng đăng bài của task, không lọc theo loại bài: một task đã
      // được lên lịch thì vẫn là đã lên lịch kể cả khi ô Loại Bài Đăng bỏ
      // trống (Shopee, Website, Cửa hàng đều như vậy). Phạm vi Reels/Video
      // chỉ dùng cho các chỉ số cơ cấu đếm theo dòng.
      const taskPosts = postsByTask.get(normalize(task.code)) ?? [];
      return {
        task,
        posts: taskPosts,
        platforms: taskPlatformNames(task),
        state: !taskPosts.length
          ? ("notScheduled" as const)
          : taskPosts.some((post) => post.posted)
            ? ("posted" as const)
            : ("scheduled" as const),
      };
    });

  const isOverduePost = (post: PublicationPost) =>
    !post.posted &&
    Boolean(post.scheduledAt) &&
    post.scheduledAt! <= dueCutoff;

  return {
    scope,
    months,
    collectionMonth,
    asOf: dueCutoff,
    produced: assets,
    posted: assets.filter((asset) => asset.state === "posted"),
    scheduled: assets.filter((asset) => asset.state === "scheduled"),
    notScheduled: assets.filter((asset) => asset.state === "notScheduled"),
    pending: assets.filter((asset) => asset.state !== "posted"),
    overdue: assets.filter(
      (asset) =>
        asset.state === "scheduled" && asset.posts.some(isOverduePost),
    ),
    buckets: bucketsOf(windowedPosts),
    postedCollectionPosts: (() => {
      // Tử số của chỉ số cơ cấu không theo bộ lọc BST: hỏi BST nói chung
      // chiếm bao nhiêu sản lượng của kỳ.
      const collectionCodes = new Set(
        collectionTasks.map((task) => normalize(task.code)),
      );
      return windowedPosts.filter(
        (post) =>
          post.posted &&
          (scope === "reels" ? isReelPost(post) : isVideoPost(post)) &&
          collectionCodes.has(normalize(post.bookTaskCode)),
      );
    })(),
    digitalSourced: windowedPosts.filter(
      (post) =>
        (scope === "reels" ? isReelPost(post) : isVideoPost(post)) &&
        !normalize(post.bookTaskCode),
    ),
  };
}
