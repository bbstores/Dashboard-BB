import assert from "node:assert/strict";
import test from "node:test";
import {
  flowRangeFromGlobal,
  presetStart,
  toInputDate,
  trendGranularityFor,
  typeRangeFromGlobal,
} from "../features/dashboard/sections/capacity/capacityRanges";
import {
  dayLabel,
  weekLabel,
} from "../features/dashboard/analytics/mediaCapacity/calendar";

const day = (year: number, month: number, date: number) =>
  new Date(year, month - 1, date, 15, 30);

function localKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

test("toInputDate formats local dates and maps null to an empty string", () => {
  assert.equal(toInputDate(null), "");
  assert.equal(toInputDate(day(2026, 1, 5)), "2026-01-05");
  assert.equal(toInputDate(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

test("flow range keeps explicit global dates", () => {
  assert.deepEqual(flowRangeFromGlobal("2026-09-01", "2026-09-30"), {
    from: "2026-09-01",
    to: "2026-09-30",
  });
});

test("flow range starts on the Monday of the global end date", () => {
  // 30/9/2026 là thứ Tư; 4/10/2026 là Chủ nhật nhưng vẫn thuộc tuần 28/9.
  assert.equal(flowRangeFromGlobal("", "2026-09-30").from, "2026-09-28");
  assert.equal(flowRangeFromGlobal("", "2026-10-04").from, "2026-09-28");
  assert.equal(flowRangeFromGlobal("", "2026-10-05").from, "2026-10-05");
  // Tuần vắt qua năm.
  assert.equal(flowRangeFromGlobal("", "2027-01-01").from, "2026-12-28");
});

test("flow range without an end date runs to today or a future start", () => {
  assert.deepEqual(flowRangeFromGlobal("2099-01-07", ""), {
    from: "2099-01-07",
    to: "2099-01-07",
  });
  assert.deepEqual(flowRangeFromGlobal("2020-01-07", ""), {
    from: "2020-01-07",
    to: localKey(new Date()),
  });
});

test("flow range defaults to the current Monday–Sunday week", () => {
  const today = new Date();
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7),
  );
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
  );
  assert.deepEqual(flowRangeFromGlobal("", ""), {
    from: localKey(monday),
    to: localKey(sunday),
  });
});

test("type range prefers global dates, then data, then baseline", () => {
  const sources = {
    baselineDateFrom: "2026-05-04",
    baselineDateTo: "2026-07-26",
    dataDateFrom: "2026-01-02",
    dataDateTo: "2026-10-22",
  };
  assert.deepEqual(
    typeRangeFromGlobal({ ...sources, globalDateFrom: "", globalDateTo: "" }),
    { from: "2026-05-04", to: "2026-07-26" },
  );
  assert.deepEqual(
    typeRangeFromGlobal({
      ...sources,
      globalDateFrom: "2026-09-01",
      globalDateTo: "",
    }),
    { from: "2026-09-01", to: "2026-10-22" },
  );
  assert.deepEqual(
    typeRangeFromGlobal({
      ...sources,
      baselineDateFrom: "",
      baselineDateTo: "",
      globalDateFrom: "",
      globalDateTo: "",
    }),
    { from: "2026-01-02", to: "2026-10-22" },
  );
});

test("trend granularity follows presets and custom span length", () => {
  const from = day(2026, 1, 1);
  assert.equal(trendGranularityFor("1w", from, day(2026, 12, 31)), "day");
  assert.equal(trendGranularityFor("1m", from, from), "week");
  assert.equal(trendGranularityFor("3m", from, from), "week");
  assert.equal(trendGranularityFor("1y", from, from), "month");
  assert.equal(trendGranularityFor("custom", from, day(2026, 1, 14)), "day");
  assert.equal(trendGranularityFor("custom", from, day(2026, 1, 15)), "week");
  assert.equal(trendGranularityFor("custom", from, day(2026, 4, 10)), "week");
  assert.equal(trendGranularityFor("custom", from, day(2026, 4, 11)), "month");
});

test("trend presets count back inclusive calendar days", () => {
  const anchor = day(2026, 3, 1);
  const allStart = day(2025, 6, 1);
  assert.equal(localKey(presetStart("1w", anchor, allStart)), "2026-02-23");
  assert.equal(localKey(presetStart("1m", anchor, allStart)), "2026-01-31");
  assert.equal(localKey(presetStart("3m", anchor, allStart)), "2025-12-02");
  assert.equal(localKey(presetStart("1y", anchor, allStart)), "2025-03-02");
  assert.equal(presetStart("all", anchor, allStart), allStart);
  assert.equal(presetStart("custom", anchor, allStart), allStart);
});

test("calendar labels use two-digit day and month", () => {
  assert.equal(dayLabel(day(2026, 3, 7)), "07/03");
  assert.equal(weekLabel(day(2026, 9, 28), day(2026, 10, 4)), "28/09–04/10");
});
