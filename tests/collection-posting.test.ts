import assert from "node:assert/strict";
import test from "node:test";
import { calculateCollectionPosting } from "../features/dashboard/analytics/calculateCollectionPosting";
import type {
  PublicationPost,
  Task,
} from "../features/dashboard/model/types";

const AS_OF = new Date(2026, 8, 22);
const ALL_DATES = { from: null, to: null, hasFilter: false };

function post(overrides: Partial<PublicationPost> = {}): PublicationPost {
  return {
    id: "POST-1",
    scheduledAt: new Date(2026, 8, 10),
    platform: "Facebook BBStore",
    posted: false,
    postType: "Reels",
    postCategory: "Bộ Sưu Tập",
    title: "Anonymous post",
    bookTaskCode: "TSK-1",
    ...overrides,
  };
}

/** Ấn phẩm cuối: Format Type video + Công đoạn Edit + có ô Bộ Sưu Tập. */
function asset(overrides: Partial<Task> = {}): Task {
  return {
    code: "TSK-1",
    title: "Anonymous task",
    stage: "Edit",
    formatType: "Video Trend",
    productCode: "",
    collection: "BST 09.2026",
    expectedMinutes: 60,
    status: "Done",
    assignee: "Nhân sự A",
    startDate: new Date(2026, 8, 1),
    completedDate: null,
    inspectionDate: null,
    businessApprovalDate: null,
    handoffRating: "",
    overallRating: "",
    type: "Social",
    outsource: "",
    platform: "Facebook BBStore",
    plannedPublishDate: new Date(2026, 8, 10),
    ...overrides,
  };
}

test("counts one asset per task even when it posts to several platforms", () => {
  const tasks = [
    asset({ code: "T1", platform: "Facebook BBStore, Tiktok BB Store" }),
  ];
  // Một task ba nền tảng sinh ba dòng ở bảng Đăng Bài.
  const posts = [
    post({ id: "P-FB", bookTaskCode: "T1", posted: true }),
    post({
      id: "P-TT",
      bookTaskCode: "T1",
      platform: "Tiktok BB Store",
      postType: "Video",
      posted: false,
    }),
  ];
  const result = calculateCollectionPosting(
    tasks,
    posts,
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );

  assert.equal(result.produced.length, 1, "một task là một ấn phẩm");
  assert.equal(result.posted.length, 1, "đăng được một kênh là đã đăng");

  assert.equal(
    result.pending.length,
    0,
    "đăng được một kênh là hết nợ ở mức ấn phẩm",
  );
});

test("sees assets Media finished but Digital never scheduled", () => {
  const tasks = [
    asset({ code: "T-POSTED" }),
    asset({ code: "T-SCHEDULED" }),
    asset({ code: "T-NONE" }),
  ];
  const posts = [
    post({ id: "P1", bookTaskCode: "T-POSTED", posted: true }),
    post({
      id: "P2",
      bookTaskCode: "T-SCHEDULED",
      posted: false,
      scheduledAt: new Date(2026, 8, 30),
    }),
  ];
  const result = calculateCollectionPosting(
    tasks,
    posts,
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );

  assert.equal(result.produced.length, 3);
  assert.deepEqual(
    result.posted.map((item) => item.task.code),
    ["T-POSTED"],
  );
  assert.deepEqual(
    result.scheduled.map((item) => item.task.code),
    ["T-SCHEDULED"],
  );
  // Đếm theo dòng đăng bài sẽ không bao giờ thấy ấn phẩm này.
  assert.deepEqual(
    result.notScheduled.map((item) => item.task.code),
    ["T-NONE"],
  );
});

test("marks a scheduled asset overdue only after its posting date", () => {
  const tasks = [asset({ code: "T-LATE" }), asset({ code: "T-FUTURE" })];
  const posts = [
    post({
      id: "P-LATE",
      bookTaskCode: "T-LATE",
      posted: false,
      scheduledAt: new Date(2026, 8, 12),
    }),
    post({
      id: "P-FUTURE",
      bookTaskCode: "T-FUTURE",
      posted: false,
      scheduledAt: new Date(2026, 9, 5),
    }),
  ];
  const result = calculateCollectionPosting(
    tasks,
    posts,
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );

  assert.equal(result.scheduled.length, 2);
  assert.deepEqual(
    result.overdue.map((item) => item.task.code),
    ["T-LATE"],
    "bài có lịch ở tương lai chưa phải là trễ",
  );
});

test("scope changes the content mix, never the delivery funnel", () => {
  const tasks = [
    asset({ code: "T-FB" }),
    asset({ code: "T-TT", platform: "Tiktok BB Store" }),
  ];
  const posts = [
    post({ id: "P-FB", bookTaskCode: "T-FB", posted: true }),
    post({
      id: "P-TT",
      bookTaskCode: "T-TT",
      platform: "Tiktok BB Store",
      // TikTok ghi Video cho cùng loại nội dung mà Facebook gọi là Reels.
      postType: "Video",
      posted: true,
    }),
  ];

  const wide = calculateCollectionPosting(
    tasks,
    posts,
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );
  const reelsOnly = calculateCollectionPosting(
    tasks,
    posts,
    ALL_DATES,
    "reels",
    "",
    AS_OF,
  );

  // Phễu giao nhận không đổi: cả hai ấn phẩm đều đã được đăng.
  assert.equal(wide.posted.length, 2);
  assert.equal(reelsOnly.posted.length, 2);
  assert.equal(reelsOnly.notScheduled.length, 0);

  // Chỉ phần cơ cấu đếm theo dòng mới thu hẹp về Reels của Facebook.
  assert.equal(wide.buckets.postedVideos.length, 2);
  assert.equal(reelsOnly.buckets.reels.length, 1);
  assert.equal(reelsOnly.postedCollectionPosts.length, 1);
});

test("separates Digital's own sourcing from what Media delivered", () => {
  const tasks = [
    asset({ code: "T-OK" }),
    asset({ code: "T-CANCEL", status: "Pending / Cancel" }),
    asset({ code: "T-NOSOCIAL", platform: "Không Đăng Social" }),
  ];
  const posts = [
    post({ id: "P1", bookTaskCode: "T-OK", posted: true }),
    post({ id: "P2", bookTaskCode: "T-CANCEL", posted: true }),
    // Book Task trống = Digital reup hoặc tự có source, không phải Media giao.
    post({ id: "P3", bookTaskCode: "", posted: true, postCategory: "" }),
  ];
  const result = calculateCollectionPosting(
    tasks,
    posts,
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );

  assert.deepEqual(
    result.produced.map((item) => item.task.code),
    ["T-OK"],
    "task đã hủy và task Không Đăng Social không phải nghĩa vụ đăng",
  );
  assert.deepEqual(
    result.digitalSourced.map((item) => item.id),
    ["P3"],
  );
});

test("offers every collection month and flags operational gaps", () => {
  const tasks = [
    asset({ code: "T6", collection: "BST 06.2026" }),
    asset({ code: "T9", collection: "BST 09.2026" }),
    asset({ code: "T11", collection: "BST 11.2026" }),
  ];
  const result = calculateCollectionPosting(
    tasks,
    [],
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );

  // Danh sách tháng lấy từ Tasklist nên thấy cả BST chưa có bài nào.
  assert.deepEqual(result.months, ["11.2026", "09.2026", "06.2026"]);
});

test("ignores the global date filter and follows only the collection filter", () => {
  const tasks = [
    asset({
      code: "T-SEP",
      collection: "BST 09.2026",
      plannedPublishDate: new Date(2026, 8, 10),
    }),
    asset({
      code: "T-JUL",
      collection: "BST 07.2026",
      plannedPublishDate: new Date(2026, 6, 10),
    }),
    asset({
      code: "T-NODATE",
      collection: "BST 09.2026",
      plannedPublishDate: null,
    }),
  ];

  const all = calculateCollectionPosting(
    tasks,
    [],
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );
  assert.equal(
    all.produced.length,
    3,
    "ấn phẩm thiếu Ngày Đăng Dự Kiến vẫn được tính",
  );

  const september = calculateCollectionPosting(
    tasks,
    [],
    ALL_DATES,
    "video",
    "09.2026",
    AS_OF,
  );
  assert.deepEqual(
    september.produced.map((item) => item.task.code).sort(),
    ["T-NODATE", "T-SEP"],
  );

  // Bộ lọc ngày chỉ chạm vào chỉ số cơ cấu, không đụng phễu giao nhận.
  const narrowWindow = calculateCollectionPosting(
    tasks,
    [],
    { from: new Date(2026, 0, 1), to: new Date(2026, 0, 2), hasFilter: true },
    "video",
    "",
    AS_OF,
  );
  assert.equal(narrowWindow.produced.length, 3, "phễu không bị cắt theo ngày");
  assert.equal(
    narrowWindow.buckets.postedVideos.length,
    0,
    "cơ cấu thì bị cắt theo ngày",
  );
});

test("treats a task as scheduled even when the row has no post type", () => {
  // Shopee, Website và Cửa hàng để trống ô Loại Bài Đăng.
  const tasks = [asset({ code: "T-SHOPEE", platform: "Shopee" })];
  const posts = [
    post({
      id: "P-SHOPEE",
      bookTaskCode: "T-SHOPEE",
      platform: "Shopee",
      postType: "",
      posted: false,
      scheduledAt: new Date(2026, 9, 5),
    }),
  ];
  const result = calculateCollectionPosting(
    tasks,
    posts,
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );

  assert.equal(
    result.notScheduled.length,
    0,
    "dòng đã tồn tại thì không được báo là chưa lên lịch",
  );
  assert.deepEqual(
    result.scheduled.map((item) => item.task.code),
    ["T-SHOPEE"],
  );
});

test("groups every unposted asset into one actionable pending list", () => {
  const tasks = [
    asset({ code: "T-POSTED" }),
    asset({ code: "T-SCHEDULED" }),
    asset({ code: "T-NONE" }),
  ];
  const posts = [
    post({ id: "P1", bookTaskCode: "T-POSTED", posted: true }),
    post({ id: "P2", bookTaskCode: "T-SCHEDULED", posted: false }),
  ];
  const result = calculateCollectionPosting(
    tasks,
    posts,
    ALL_DATES,
    "video",
    "",
    AS_OF,
  );

  assert.deepEqual(
    result.pending.map((item) => item.task.code).sort(),
    ["T-NONE", "T-SCHEDULED"],
    "gồm cả đã lên lịch chưa đăng lẫn chưa lên lịch",
  );
  assert.equal(
    result.pending.length + result.posted.length,
    result.produced.length,
  );
});
