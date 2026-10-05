import { endOfDay, startOfWeek } from "@/shared/date/dateUtils";

export function endOfWeek(value: Date) {
  const result = startOfWeek(value);
  result.setDate(result.getDate() + 6);
  return endOfDay(result);
}

export function weekLabel(start: Date, end: Date) {
  return `${dayLabel(start)}–${dayLabel(end)}`;
}

export function dayLabel(value: Date) {
  return `${String(value.getDate()).padStart(2, "0")}/${String(
    value.getMonth() + 1,
  ).padStart(2, "0")}`;
}

export function monthLabel(value: Date) {
  return `${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
}

export function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function endOfMonth(value: Date) {
  return endOfDay(
    new Date(value.getFullYear(), value.getMonth() + 1, 0),
  );
}
