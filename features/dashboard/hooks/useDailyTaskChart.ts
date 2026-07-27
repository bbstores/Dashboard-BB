import { useMemo } from "react";
import { calculateDailyTaskChart } from "../analytics/calculateDailyTaskChart";
import type {
  DashboardData,
  DateWindow,
} from "../model/types";

export function useDailyTaskChart(
  data: DashboardData | null,
  dailyAssignee: string,
  dateWindow: DateWindow,
) {
  return useMemo(
    () =>
      data
        ? calculateDailyTaskChart(data, dailyAssignee, dateWindow)
        : { rows: [], assignees: [] },
    [data, dailyAssignee, dateWindow],
  );
}
