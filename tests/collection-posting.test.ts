import assert from "node:assert/strict";
import test from "node:test";
import { calculateCollectionPosting } from "../features/dashboard/analytics/calculateCollectionPosting";
import type {
  PublicationPost,
  Task,
} from "../features/dashboard/model/types";

const WINDOW = { from: null, to: null, hasFilter: false };

function post(overrides: Partial<PublicationPost> = {}): PublicationPost {
  return {
    id: "POST-1",
    scheduledAt: new Date(2026, 6, 10),
    platform: "Facebook BBStore",
    posted: false,
    postType: "Reels",
    postCategory: "Bộ Sưu Tập",
    title: "Anonymous post",
    bookTaskCode: "TSK-1",
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    code: "TSK-1",
    title: "Anonymous task",
    stage: "Edit",
    formatType: "Video",
    productCode: "",
    collection: "BST 07.2026",
    expectedMinutes: 60,
    status: "Done",
    assignee: "Nhân sự A",
    startDate: new Date(2026, 6, 1),
    completedDate: null,
    inspectionDate: null,
    businessApprovalDate: null,
    handoffRating: "",
    overallRating: "",
    type: "Social",
    outsource: "",
    ...overrides,
  };
}

test("measures how much of the Media collection output Digital posted", () => {
  const posts = [
    post({ id: "P1", posted: true }),
    post({ id: "P2", posted: true }),
    post({ id: "P3", posted: false }),
    post({ id: "P4", posted: false }),
    // Video ngoài BST vẫn vào mẫu số sản lượng.
    post({ id: "P5", posted: true, postCategory: "Khác" }),
    post({ id: "P6", posted: true, postType: "Video", postCategory: "Khác" }),
    // Ảnh không thuộc phạm vi video.
    post({ id: "P7", posted: true, postType: "Ảnh Post" }),
  ];
  const result = calculateCollectionPosting([task()], posts, WINDOW, "video");

  // [1] Reels đã đăng 3 trên tổng video đã đăng 4, hoặc trên tổng Reels 5.
  assert.equal(result.buckets.postedReels.length, 3);
  assert.equal(result.buckets.postedVideos.length, 4);
  assert.equal(result.buckets.reels.length, 5);

  // [2] BST đã đăng 2 trên 4 Media trả ra.
  assert.equal(result.produced.length, 4);
  assert.equal(result.posted.length, 2);
  assert.equal(result.pending.length, 2);
});

test("keeps TikTok in the picture by counting Video as the reel equivalent", () => {
  const posts = [
    post({ id: "FB1", posted: true }),
    post({
      id: "TT1",
      platform: "Tiktok BB Store",
      postType: "Video",
      posted: true,
    }),
    post({
      id: "TT2",
      platform: "Tiktok BB Store",
      postType: "Video",
      posted: false,
    }),
  ];

  const wide = calculateCollectionPosting([task()], posts, WINDOW, "video");
  const tiktok = wide.rows.find((row) => row.platform === "Tiktok BB Store");
  assert.equal(tiktok?.produced.length, 2);
  assert.equal(tiktok?.posted.length, 1);

  // Nghĩa đen "Reels" bỏ sót TikTok vì kênh này ghi loại bài là Video.
  const reelsOnly = calculateCollectionPosting([task()], posts, WINDOW, "reels");
  assert.equal(
    reelsOnly.rows.find((row) => row.platform === "Tiktok BB Store")?.produced
      .length,
    0,
  );
  assert.equal(reelsOnly.produced.length, 1);
  // Mẫu số "tổng Reels" cũng chỉ còn Facebook — đây là cái bẫy cần nhãn rõ.
  assert.equal(reelsOnly.buckets.reels.length, 1);
  assert.equal(reelsOnly.buckets.videos.length, 3);
});

test("offers every collection month from the Tasklist, not just scheduled ones", () => {
  const tasks = [
    task({ code: "T6", collection: "BST 06.2026" }),
    task({ code: "T9", collection: "BST 09.2026" }),
    task({ code: "T11", collection: "BST 11.2026" }),
  ];
  // Chỉ tháng 9 có ấn phẩm lên lịch.
  const posts = [post({ id: "S1", bookTaskCode: "T9", posted: true })];

  const windowed = calculateCollectionPosting(
    tasks,
    posts,
    {
      from: new Date(2026, 8, 1),
      to: new Date(2026, 8, 30),
      hasFilter: true,
    },
    "video",
  );

  // Suy danh sách từ ấn phẩm sẽ chỉ ra 09.2026 và giấu mất hai bộ sưu tập
  // chưa có bài nào — đúng trường hợp cần nhìn thấy nhất.
  assert.deepEqual(windowed.months, ["11.2026", "09.2026", "06.2026"]);

  // Bộ lọc ngày không được thu hẹp danh sách lựa chọn.
  const june = calculateCollectionPosting(
    tasks,
    posts,
    {
      from: new Date(2026, 8, 1),
      to: new Date(2026, 8, 30),
      hasFilter: true,
    },
    "video",
    "06.2026",
  );
  assert.equal(june.produced.length, 0);
  assert.equal(june.collectionTaskCount, 1, "vẫn biết BST đó có task");
});

test("narrows only the numerator when filtering by collection month", () => {
  const tasks = [
    task({ code: "T9", collection: "BST 09.2026" }),
    task({ code: "T8", collection: "BST 08.2026" }),
  ];
  const posts = [
    post({ id: "S1", bookTaskCode: "T9", posted: true }),
    post({ id: "S2", bookTaskCode: "T9", posted: false }),
    post({ id: "S3", bookTaskCode: "T8", posted: true }),
    post({ id: "S4", bookTaskCode: "T8", posted: true }),
  ];

  const all = calculateCollectionPosting(tasks, posts, WINDOW, "video");
  assert.deepEqual(all.months, ["09.2026", "08.2026"]);
  assert.equal(all.produced.length, 4);

  const september = calculateCollectionPosting(
    tasks,
    posts,
    WINDOW,
    "video",
    "09.2026",
  );
  assert.equal(september.produced.length, 2, "tử số chỉ còn BST tháng 9");
  assert.equal(september.posted.length, 1);
  // Mẫu số sản lượng giữ nguyên toàn kênh để câu hỏi "BST chiếm bao nhiêu" còn nghĩa.
  assert.equal(
    september.buckets.postedVideos.length,
    all.buckets.postedVideos.length,
  );
});

test("excludes cancelled and no-social work, and flags unusable rows", () => {
  const tasks = [
    task({ code: "TSK-OK" }),
    task({ code: "TSK-CANCEL", status: "Pending / Cancel" }),
    task({ code: "TSK-NOSOCIAL", platform: "Không Đăng Social" }),
  ];
  const posts = [
    post({ id: "P1", posted: true, bookTaskCode: "TSK-OK" }),
    post({ id: "P2", posted: true, bookTaskCode: "TSK-CANCEL" }),
    post({ id: "P3", posted: true, bookTaskCode: "TSK-NOSOCIAL" }),
    post({ id: "P4", posted: true, postCategory: "" }),
    post({ id: "P5", posted: true, bookTaskCode: "" }),
  ];
  const result = calculateCollectionPosting(tasks, posts, WINDOW, "video");

  assert.deepEqual(
    result.produced.map((item) => item.id).sort(),
    ["P1", "P5"],
    "chỉ còn ấn phẩm BST hợp lệ",
  );
  assert.deepEqual(
    result.uncategorized.map((item) => item.id),
    ["P4"],
  );
  assert.deepEqual(
    result.unlinked.map((item) => item.id),
    ["P5"],
    "ấn phẩm BST không có Book Task thì không lọc được theo tháng",
  );
});

test("leaves an empty denominator empty instead of reporting zero", () => {
  const result = calculateCollectionPosting([task()], [], WINDOW, "video");

  assert.deepEqual(result.produced, []);
  assert.deepEqual(result.buckets.postedVideos, []);
  assert.deepEqual(result.rows, []);
  // Tháng vẫn liệt kê được từ Tasklist dù chưa có ấn phẩm nào lên lịch.
  assert.deepEqual(result.months, ["07.2026"]);
});

test("keeps numerator and denominator on the same content class", () => {
  const tasks = [task({ code: "T1" })];
  const posts = [
    // Facebook ghi Reels, TikTok ghi Video — cùng là ấn phẩm BST.
    post({ id: "FB1", posted: true }),
    post({ id: "FB2", posted: true }),
    post({
      id: "TT1",
      platform: "Tiktok BB Store",
      postType: "Video",
      posted: true,
    }),
    post({
      id: "TT2",
      platform: "Tiktok BB Store",
      postType: "Video",
      posted: true,
    }),
  ];
  const result = calculateCollectionPosting(tasks, posts, WINDOW, "video");

  // Mẫu số "tổng Reels" chỉ có 2 dòng Facebook. Nếu tử số vẫn là BST toàn kênh
  // (4 dòng) thì tỷ lệ ra 200% — vô nghĩa. Tử số phải thu về Reels.
  assert.equal(result.buckets.reels.length, 2);
  assert.equal(result.posted.length, 4);

  const reelNumerator = result.posted.filter(
    (item) => item.postType === "Reels",
  );
  assert.equal(reelNumerator.length, 2);
  assert.ok(
    reelNumerator.length <= result.buckets.reels.length,
    "tử số không được vượt mẫu số khi cả hai cùng thu về Reels",
  );
});

test("does not count not-yet-scheduled collections as missed posts", () => {
  const asOf = new Date(2026, 8, 22);
  const tasks = [
    task({ code: "T9", collection: "BST 09.2026" }),
    task({ code: "T10", collection: "BST 10.2026" }),
  ];
  const posts = [
    // Tháng 9: một bài đã đăng, một bài quá hạn.
    post({
      id: "S1",
      bookTaskCode: "T9",
      posted: true,
      scheduledAt: new Date(2026, 8, 10),
    }),
    post({
      id: "S2",
      bookTaskCode: "T9",
      posted: false,
      scheduledAt: new Date(2026, 8, 12),
    }),
    // Tháng 10: chưa tới lịch đăng.
    post({
      id: "S3",
      bookTaskCode: "T10",
      posted: false,
      scheduledAt: new Date(2026, 9, 5),
    }),
    post({
      id: "S4",
      bookTaskCode: "T10",
      posted: false,
      scheduledAt: new Date(2026, 9, 6),
    }),
  ];
  const result = calculateCollectionPosting(
    tasks,
    posts,
    WINDOW,
    "video",
    "",
    asOf,
  );

  assert.equal(result.pending.length, 3);
  assert.deepEqual(
    result.overdue.map((item) => item.id),
    ["S2"],
    "chỉ bài đã qua Ngày Đăng mới là quá hạn",
  );
  assert.deepEqual(
    result.notYetDue.map((item) => item.id).sort(),
    ["S3", "S4"],
  );

  // Tỷ lệ trên phần đã tới lịch là 1/2 = 50%, chứ không phải 1/4 = 25%.
  assert.equal(
    result.posted.length / (result.posted.length + result.overdue.length),
    0.5,
  );
  assert.equal(result.posted.length / result.produced.length, 0.25);
});

test("date filter bounds every card, collection filter only the BST numerator", () => {
  const asOf = new Date(2026, 8, 22);
  const tasks = [
    task({ code: "T9", collection: "BST 09.2026" }),
    task({ code: "T7", collection: "BST 07.2026" }),
  ];
  const posts = [
    // Trong khoảng lọc.
    post({
      id: "IN-BST9",
      bookTaskCode: "T9",
      posted: true,
      scheduledAt: new Date(2026, 8, 10),
    }),
    post({
      id: "IN-OTHER",
      bookTaskCode: "T9",
      posted: true,
      postCategory: "Khác",
      scheduledAt: new Date(2026, 8, 11),
    }),
    // Ngoài khoảng lọc — phải biến mất khỏi mọi card.
    post({
      id: "OUT",
      bookTaskCode: "T7",
      posted: true,
      scheduledAt: new Date(2026, 6, 10),
    }),
  ];
  const september = {
    from: new Date(2026, 8, 1),
    to: new Date(2026, 8, 30),
    hasFilter: true,
  };

  const all = calculateCollectionPosting(tasks, posts, september, "video", "", asOf);
  // Bộ lọc ngày cắt bài tháng 7 khỏi cả tử lẫn mẫu.
  assert.equal(all.buckets.postedVideos.length, 2);
  assert.equal(all.produced.length, 1);

  const july = calculateCollectionPosting(
    tasks,
    posts,
    september,
    "video",
    "07.2026",
    asOf,
  );
  // Lọc BST chỉ thu hẹp tử số; mẫu số sản lượng giữ nguyên để câu hỏi
  // "BST chiếm bao nhiêu trong sản lượng kênh" còn có nghĩa.
  assert.equal(july.produced.length, 0, "không có ấn phẩm BST 07 trong kỳ");
  assert.equal(
    july.buckets.postedVideos.length,
    2,
    "mẫu số không đổi theo bộ lọc BST",
  );
  assert.equal(
    july.buckets.postedReels.length,
    all.buckets.postedReels.length,
    "card Reels trên sản lượng không chịu bộ lọc BST",
  );
});
