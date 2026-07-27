import { useMemo } from "react";
import { calculateDashboardStats } from "../analytics/calculateDashboardStats";
import type {
  DashboardData,
  DateWindow,
} from "../model/types";

export function useDashboardStats(
  data: DashboardData | null,
  dateWindow: DateWindow,
  collectionMonth: string,
  backlogDate: string,
) {
  return useMemo(
    () =>
      data
        ? calculateDashboardStats(data, {
            dateWindow,
            collectionMonth,
            backlogDate,
          })
        : null,
    [data, dateWindow, collectionMonth, backlogDate],
  );
}
