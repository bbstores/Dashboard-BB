import { endOfDay } from "@/shared/date/dateUtils";
import {
  collectionMonths,
  inWindow,
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
export type CollectionAssetState =
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

export function isVideoPost(post: PublicationPost) {
  return VIDEO_TYPES.has(normalizedKey(post.postType));
}

export function isCollectionPost(post: PublicationPost) {
  return normalizedKey(post.postCategory) === "bộ sưu tập";
}

/** Bốn tập dòng đăng bài dùng làm mẫu số của chỉ số cơ cấu. */
export type PostingBuckets = {
  reels: PublicationPost[];
  postedReels: PublicationPost[];
  videos: PublicationPost[];
  postedVideos: PublicationPost[];
};

export type CollectionPostingRow = {
  platform: string;
  /** Ấn phẩm phải đăng ở kênh này. */
  owed: CollectionAsset[];
  scheduled: CollectionAsset[];
  posted: CollectionAsset[];
  /** Đã lên lịch, chưa đăng, và đã qua Ngày Đăng. */
  overdue: CollectionAsset[];
  /** Chưa có dòng đăng bài nào cho kênh này. */
  notScheduled: CollectionAsset[];
  buckets: PostingBuckets;
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
  overdue: CollectionAsset[];
  /** Mẫu số cơ cấu, đếm theo dòng đăng bài (gồm cả nguồn của Digital). */
  buckets: PostingBuckets;
  /** Dòng đăng bài BST đã đăng của chính các ấn phẩm đang xét — tử số cơ cấu. */
  postedCollectionPosts: PublicationPost[];
  /** Dòng đăng bài Book Task trống: Digital reup hoặc tự có source. */
  digitalSourced: PublicationPost[];
  /** Lỗi vận hành cần team bổ sung, không tham gia phép tính theo kênh. */
  missingPlatform: CollectionAsset[];
  missingPlannedDate: number;
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
  const { posts } = selectEligiblePosts(tasks, publications, dateWindow);
  const dueCutoff = endOfDay(asOf);

  const postsByTask = new Map<string, PublicationPost[]>();
  for (const post of publications) {
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

  const missingPlannedDate = collectionTasks.filter(
    (task) => !task.plannedPublishDate,
  ).length;

  const assets: CollectionAsset[] = collectionTasks
    .filter(
      (task) =>
        // Không lọc ngày thì lấy hết; có lọc thì xếp theo Ngày Đăng Dự Kiến.
        (!dateWindow.hasFilter ||
          inWindow(task.plannedPublishDate ?? null, dateWindow)) &&
        (!collectionMonth ||
          collectionMonths(task).includes(collectionMonth)),
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

  const platforms = Array.from(
    new Map([
      ...assets.flatMap((asset) =>
        asset.platforms.map(
          (platform) =>
            [normalizedKey(platform), platform] as [string, string],
        ),
      ),
      ...posts
        .filter(isVideoPost)
        .map(
          (post) =>
            [
              normalizedKey(post.platform),
              normalize(post.platform) || "Chưa xác định",
            ] as [string, string],
        ),
    ]).values(),
  );

  const rows = platforms
    .map((platform): CollectionPostingRow => {
      const key = normalizedKey(platform);
      const owed = assets.filter((asset) =>
        asset.platforms.some((name) => normalizedKey(name) === key),
      );
      const postsFor = (asset: CollectionAsset) =>
        asset.posts.filter(
          (post) => normalizedKey(post.platform) === key,
        );
      const scheduled = owed.filter((asset) => postsFor(asset).length);
      return {
        platform,
        owed,
        scheduled,
        posted: scheduled.filter((asset) =>
          postsFor(asset).some((post) => post.posted),
        ),
        overdue: scheduled.filter(
          (asset) =>
            !postsFor(asset).some((post) => post.posted) &&
            postsFor(asset).some(isOverduePost),
        ),
        notScheduled: owed.filter((asset) => !postsFor(asset).length),
        buckets: bucketsOf(
          posts.filter(
            (post) => normalizedKey(post.platform) === key,
          ),
        ),
      };
    })
    .filter(
      (row) => row.owed.length > 0 || row.buckets.postedVideos.length > 0,
    )
    .sort(
      (left, right) =>
        right.owed.length - left.owed.length ||
        right.buckets.postedVideos.length - left.buckets.postedVideos.length,
    );

  return {
    scope,
    months,
    collectionMonth,
    asOf: dueCutoff,
    produced: assets,
    posted: assets.filter((asset) => asset.state === "posted"),
    scheduled: assets.filter((asset) => asset.state === "scheduled"),
    notScheduled: assets.filter((asset) => asset.state === "notScheduled"),
    overdue: assets.filter(
      (asset) =>
        asset.state === "scheduled" && asset.posts.some(isOverduePost),
    ),
    buckets: bucketsOf(posts),
    postedCollectionPosts: (() => {
      const codes = new Set(
        assets.map((asset) => normalize(asset.task.code)),
      );
      return posts.filter(
        (post) =>
          post.posted &&
          (scope === "reels" ? isReelPost(post) : isVideoPost(post)) &&
          codes.has(normalize(post.bookTaskCode)),
      );
    })(),
    digitalSourced: posts.filter(
      (post) =>
        (scope === "reels" ? isReelPost(post) : isVideoPost(post)) &&
        !normalize(post.bookTaskCode),
    ),
    missingPlatform: assets.filter((asset) => !asset.platforms.length),
    missingPlannedDate,
    rows,
  };
}
