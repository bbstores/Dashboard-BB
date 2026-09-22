/**
 * Ngày nghỉ dùng cho mọi phép tính giờ làm việc và hạn SLA.
 *
 * Nguồn chuẩn là sheet `Table` cột `Ngày Nghỉ` trong workbook Lark; danh sách đó
 * nhìn về phía trước nên các ngày nghỉ đã qua được giữ lại ở BASELINE.
 * `registerHolidays` được gọi một lần sau khi đọc workbook.
 */
const BASELINE_HOLIDAY_KEYS = [
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-04-27",
  "2026-04-30",
  "2026-05-01",
  "2026-09-01",
  "2026-09-02",
] as const;

let holidayKeys = new Set<string>(BASELINE_HOLIDAY_KEYS);
let registeredCount = 0;

export function registerHolidays(keys: Iterable<string>) {
  const incoming = Array.from(keys).filter(Boolean);
  holidayKeys = new Set([...BASELINE_HOLIDAY_KEYS, ...incoming]);
  registeredCount = incoming.length;
}

export function isHolidayKey(key: string) {
  return holidayKeys.has(key);
}

/** Số ngày nghỉ đọc được từ workbook; 0 nghĩa là đang dùng danh sách mặc định. */
export function registeredHolidayCount() {
  return registeredCount;
}

/** Các năm có dữ liệu ngày nghỉ, để cảnh báo khi báo cáo nằm ngoài phạm vi. */
export function holidayYears() {
  return Array.from(
    new Set(Array.from(holidayKeys, (key) => key.slice(0, 4))),
  ).sort();
}
