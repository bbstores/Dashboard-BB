import {
  groupCount,
  normalizedKey,
  normMinutesFor,
} from "../model/taskUtils";
import type { Task, WorkNorm } from "../model/types";
import type { NormRow } from "./types";

const NORM_STAGES = new Set([
  "quay",
  "chụp",
  "edit",
  "graphic design",
  "viết content",
]);

export function calculateNormMetrics(
  selectedTasks: Task[],
  norms: WorkNorm[],
) {
  const normMap = new Map(
    norms.map((norm) => [normalizedKey(norm.formatType), norm]),
  );
  const normRows: NormRow[] = selectedTasks
    .filter((task) => NORM_STAGES.has(normalizedKey(task.stage)))
    .map((task) => {
      const normMinutes = normMinutesFor(task, normMap);
      const label =
        normMinutes === null
          ? "Không map được định mức"
          : Math.abs(task.expectedMinutes - normMinutes) < 0.01
            ? "Phút dự kiến bằng chuẩn"
            : task.expectedMinutes > normMinutes
              ? "Phút dự kiến cao hơn chuẩn"
              : "Phút dự kiến thấp hơn chuẩn";
      return { task, normMinutes, label };
    });
  const mappedNormRows = normRows.filter(
    (
      row,
    ): row is {
      task: Task;
      normMinutes: number;
      label: string;
    } => row.normMinutes !== null,
  );

  return {
    normRows,
    normDistribution: groupCount(normRows, (row) => row.label),
    normCoverage: normRows.length
      ? (mappedNormRows.length / normRows.length) * 100
      : 0,
    normMapped: mappedNormRows.length,
    normEligible: normRows.length,
    normExpectedMinutes: mappedNormRows.reduce(
      (sum, row) => sum + row.task.expectedMinutes,
      0,
    ),
    normStandardMinutes: mappedNormRows.reduce(
      (sum, row) => sum + row.normMinutes,
      0,
    ),
  };
}
