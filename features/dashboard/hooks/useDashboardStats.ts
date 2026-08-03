import { useMemo } from "react";
import { endOfDay } from "@/shared/date/dateUtils";
import { calculateDashboardStats } from "../analytics/calculateDashboardStats";
import { calculateMediaCapacity } from "../analytics/calculateMediaCapacity";
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
  const reportingDate = useMemo(
    () => dateWindow.to ?? endOfDay(new Date()),
    [dateWindow.to],
  );
  const mediaCapacity = useMemo(
    () =>
      data ? calculateMediaCapacity(data, reportingDate) : null,
    [data, reportingDate],
  );
  return useMemo(
    () =>
      data && mediaCapacity
        ? calculateDashboardStats(data, {
            dateWindow,
            collectionMonth,
            backlogDate,
          }, mediaCapacity)
        : null,
    [
      backlogDate,
      collectionMonth,
      data,
      dateWindow,
      mediaCapacity,
    ],
  );
}
