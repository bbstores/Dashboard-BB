import { useMemo, useState } from "react";
import { inputDate } from "@/shared/date/dateUtils";
import {
  calculateMediaCapacity,
  calculateMediaTrendSeries,
  calculateShootTypeBaselinePlan,
  type MediaCapacityStats,
} from "../../analytics/calculateMediaCapacity";
import type { DashboardData } from "../../model/types";
import {
  flowRangeFromGlobal,
  presetStart,
  toInputDate,
  trendGranularityFor,
  typeRangeFromGlobal,
  type TrendPreset,
} from "./capacityRanges";

type InputRange = { from: string; to: string };

/**
 * Khoảng ngày riêng của một biểu đồ: người dùng chỉnh được, nhưng tự quay về
 * khoảng mặc định mỗi khi khoảng mặc định (thường theo bộ lọc tổng) thay đổi.
 */
function useOverridableRange(defaultRange: InputRange) {
  const sourceKey = `${defaultRange.from}|${defaultRange.to}`;
  const [input, setInput] = useState(() => ({ sourceKey, ...defaultRange }));
  const range = input.sourceKey === sourceKey ? input : defaultRange;
  return {
    from: range.from,
    to: range.to,
    setFrom: (from: string) => setInput({ sourceKey, from, to: range.to }),
    setTo: (to: string) => setInput({ sourceKey, from: range.from, to }),
    reset: () => setInput({ sourceKey, ...defaultRange }),
  };
}

// Memo theo chuỗi ngày: Date mới mỗi lần render sẽ làm các useMemo phía sau
// luôn tính lại (calculateMediaCapacity rất nặng).
function useRangeBounds(range: InputRange) {
  const start = useMemo(() => inputDate(range.from), [range.from]);
  const end = useMemo(() => inputDate(range.to, true), [range.to]);
  return { start, end };
}

export function useFlowRange(
  data: DashboardData,
  viewModel: MediaCapacityStats,
  globalDateFrom: string,
  globalDateTo: string,
) {
  const defaultRange = useMemo(
    () => flowRangeFromGlobal(globalDateFrom, globalDateTo),
    [globalDateFrom, globalDateTo],
  );
  const range = useOverridableRange(defaultRange);
  const { start, end } = useRangeBounds(range);
  const invalid = Boolean(start && end && start > end);
  const flowViewModel = useMemo(
    () =>
      !invalid && start && end
        ? calculateMediaCapacity(data, end, new Date(), { from: start, to: end })
        : viewModel,
    [data, end, start, invalid, viewModel],
  );
  return { range, invalid, viewModel: flowViewModel };
}

export function useShootTypeRange(
  viewModel: MediaCapacityStats,
  officialBaseline: MediaCapacityStats["officialBaseline"],
  globalDateFrom: string,
  globalDateTo: string,
) {
  const baselineDateFrom = toInputDate(
    officialBaseline.weeks[0]?.start ?? null,
  );
  const baselineDateTo = toInputDate(
    officialBaseline.weeks.at(-1)?.end ?? null,
  );
  const sessionDates = useMemo(
    () =>
      viewModel.shootTypeSessions
        .flatMap((session) => (session.date ? [session.date] : []))
        .sort((left, right) => left.getTime() - right.getTime()),
    [viewModel.shootTypeSessions],
  );
  const dataDateFrom = toInputDate(sessionDates[0] ?? null);
  const dataDateTo = toInputDate(sessionDates.at(-1) ?? null);
  const defaultRange = useMemo(
    () =>
      typeRangeFromGlobal({
        globalDateFrom,
        globalDateTo,
        baselineDateFrom,
        baselineDateTo,
        dataDateFrom,
        dataDateTo,
      }),
    [
      globalDateFrom,
      globalDateTo,
      baselineDateFrom,
      baselineDateTo,
      dataDateFrom,
      dataDateTo,
    ],
  );
  const range = useOverridableRange(defaultRange);
  const { start, end } = useRangeBounds(range);
  const invalid = Boolean(start && end && start > end);
  const plan = useMemo(
    () =>
      invalid
        ? calculateShootTypeBaselinePlan([], null, null)
        : calculateShootTypeBaselinePlan(viewModel.shootTypeSessions, start, end),
    [invalid, end, start, viewModel.shootTypeSessions],
  );
  const sessionUnits = plan.rows.reduce(
    (total, row) => total + row.sessionUnits,
    0,
  );
  return { range, start, end, invalid, plan, sessionUnits };
}

export function useTrendRange(
  viewModel: MediaCapacityStats,
  globalDateFrom: string,
  globalDateTo: string,
) {
  const trendDataFrom = toInputDate(viewModel.trendDateRange.from);
  const trendDataTo = toInputDate(viewModel.trendDateRange.to);
  const anchor = useMemo(
    () => inputDate(globalDateTo || trendDataTo) ?? new Date(),
    [globalDateTo, trendDataTo],
  );
  const allStart = useMemo(
    () => inputDate(trendDataFrom) ?? anchor,
    [anchor, trendDataFrom],
  );
  const [preset, setPreset] = useState<TrendPreset>("3m");
  const defaultCustomRange = useMemo(
    () => ({
      from: globalDateFrom || trendDataFrom,
      to: globalDateTo || trendDataTo,
    }),
    [globalDateFrom, globalDateTo, trendDataFrom, trendDataTo],
  );
  const custom = useOverridableRange(defaultCustomRange);
  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: custom.from, to: custom.to };
    }
    return {
      from: toInputDate(presetStart(preset, anchor, allStart)),
      to: toInputDate(anchor),
    };
  }, [allStart, anchor, custom.from, custom.to, preset]);
  const { start, end } = useRangeBounds(range);
  const invalid = Boolean(!start || !end || start > end);
  const granularity =
    start && end ? trendGranularityFor(preset, start, end) : "week";
  const series = useMemo(
    () =>
      invalid
        ? calculateMediaTrendSeries([], null, null, granularity)
        : calculateMediaTrendSeries(viewModel.trendEvents, start, end, granularity),
    [invalid, granularity, end, start, viewModel.trendEvents],
  );
  return {
    preset,
    setPreset,
    range,
    setCustomFrom: custom.setFrom,
    setCustomTo: custom.setTo,
    invalid,
    granularity,
    series,
  };
}
