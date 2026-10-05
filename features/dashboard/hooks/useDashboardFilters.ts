import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import { inputDate } from "@/shared/date/dateUtils";
import type {
  DateWindow,
  LeaderboardUnit,
  PieScope,
  SavedReportFilters,
} from "../model/types";

export function useDashboardFilters() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dailyAssignee, setDailyAssignee] = useState("");
  const [collectionMonth, setCollectionMonth] = useState("");
  const [leaderboardUnit, setLeaderboardUnit] =
    useState<LeaderboardUnit>("minutes");
  const [pieScopes, setPieScopes] = useState<Record<string, PieScope>>({});
  const [pieExcludeOutsource, setPieExcludeOutsource] = useState<
    Record<string, boolean>
  >({});
  const [backlogDate, setBacklogDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  // Ô nhập dùng giá trị tức thời; phần tính toán dùng bản trì hoãn để gõ ngày
  // không bị khựng trong lúc dashboard tính lại.
  const appliedDateFrom = useDeferredValue(dateFrom);
  const appliedDateTo = useDeferredValue(dateTo);
  const appliedBacklogDate = useDeferredValue(backlogDate);
  const applyingFilters =
    appliedDateFrom !== dateFrom ||
    appliedDateTo !== dateTo ||
    appliedBacklogDate !== backlogDate;

  const dateWindow = useMemo<DateWindow>(
    () => ({
      from: inputDate(appliedDateFrom),
      to: inputDate(appliedDateTo, true),
      hasFilter: Boolean(appliedDateFrom || appliedDateTo),
    }),
    [appliedDateFrom, appliedDateTo],
  );

  const savedReportFilters = useMemo<SavedReportFilters>(
    () => ({
      dateFrom,
      dateTo,
      backlogDate,
      collectionMonth,
      leaderboardUnit,
      pieScopes,
      pieExcludeOutsource,
    }),
    [
      dateFrom,
      dateTo,
      backlogDate,
      collectionMonth,
      leaderboardUnit,
      pieScopes,
      pieExcludeOutsource,
    ],
  );

  const clearDateWindow = useCallback(() => {
    setDateFrom("");
    setDateTo("");
  }, []);

  const resetWorkbookFilters = useCallback(() => {
    setCollectionMonth("");
    setDailyAssignee("");
  }, []);

  const applySavedReportFilters = useCallback(
    (filters: SavedReportFilters) => {
      setDateFrom(filters.dateFrom);
      setDateTo(filters.dateTo);
      setBacklogDate(filters.backlogDate);
      setCollectionMonth(filters.collectionMonth);
      setLeaderboardUnit(filters.leaderboardUnit);
      setPieScopes(filters.pieScopes);
      setPieExcludeOutsource(filters.pieExcludeOutsource);
    },
    [],
  );

  const chartScope = useCallback(
    (key: string): PieScope => pieScopes[key] ?? "combined",
    [pieScopes],
  );

  const setChartScope = useCallback((key: string, scope: PieScope) => {
    setPieScopes((current) => ({ ...current, [key]: scope }));
  }, []);

  const setChartExcludeOutsource = useCallback(
    (key: string, checked: boolean) => {
      setPieExcludeOutsource((current) => ({
        ...current,
        [key]: checked,
      }));
    },
    [],
  );

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    dailyAssignee,
    setDailyAssignee,
    collectionMonth,
    setCollectionMonth,
    leaderboardUnit,
    setLeaderboardUnit,
    pieExcludeOutsource,
    backlogDate,
    setBacklogDate,
    appliedDateFrom,
    appliedDateTo,
    appliedBacklogDate,
    applyingFilters,
    dateWindow,
    savedReportFilters,
    clearDateWindow,
    resetWorkbookFilters,
    applySavedReportFilters,
    chartScope,
    setChartScope,
    setChartExcludeOutsource,
  };
}
