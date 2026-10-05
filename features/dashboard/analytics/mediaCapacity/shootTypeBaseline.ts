import { addDays, endOfDay, percentile, startOfDay, startOfWeek } from "@/shared/date/dateUtils";
import type { ShootSession } from "../../model/types";
import { normalizedKey } from "../../model/taskUtils";
import type { ShootTypeBaseline, ShootTypeBaselinePlanRow, ShootTypeBaselinePlan } from "./types";
import { shootSessionStaffCount } from "./shootSessions";
import { endOfWeek } from "./calendar";

function shootTypeLabel(value: string) {
  const types = value
    .split(",")
    .map(normalizedKey)
    .filter(Boolean);
  if (types.length > 1) return "Hỗn hợp";
  const type = types[0] ?? "";
  if (type.includes("bộ sưu tập")) return "Bộ Sưu Tập";
  if (type.includes("order lại")) return "Order Lại";
  if (type.includes("marketing plan")) return "Marketing Plan";
  return value.trim() || "Khác";
}

function weightedSessionPercentile(
  sessions: ShootSession[],
  valueForSession: (session: ShootSession) => number,
  ratio: number,
) {
  const rows = sessions
    .filter((session) => session.sessionUnits > 0)
    .map((session) => ({
      value: valueForSession(session),
      weight: session.sessionUnits,
    }))
    .filter(
      (row) =>
        Number.isFinite(row.value) &&
        Number.isFinite(row.weight) &&
        row.weight > 0,
    )
    .sort((left, right) => left.value - right.value);
  if (!rows.length) return 0;
  const totalWeight = rows.reduce(
    (total, row) => total + row.weight,
    0,
  );
  const threshold = Math.max(0, Math.min(1, ratio)) * totalWeight;
  let cumulativeWeight = 0;
  for (const row of rows) {
    cumulativeWeight += row.weight;
    if (cumulativeWeight >= threshold) return row.value;
  }
  return rows.at(-1)?.value ?? 0;
}

export function calculateShootTypeBaselines(
  sessions: ShootSession[],
  from: Date | null = null,
  to: Date | null = null,
) {
  const groups = new Map<string, ShootSession[]>();
  const rangeStart = from ? startOfDay(from) : null;
  const rangeEnd = to ? endOfDay(to) : null;
  for (const session of sessions) {
    if (
      !session.date ||
      (rangeStart && session.date < rangeStart) ||
      (rangeEnd && session.date > rangeEnd)
    ) {
      continue;
    }
    if (session.sessionUnits <= 0) continue;
    const type = shootTypeLabel(session.type);
    groups.set(type, [...(groups.get(type) ?? []), session]);
  }
  return Array.from(groups, ([type, sessions]): ShootTypeBaseline => {
    const sessionsWithStaff = sessions.filter(
      (session) => shootSessionStaffCount(session) > 0,
    );
    return {
      type,
      sessions,
      sessionUnits: sessions.reduce(
        (total, session) => total + session.sessionUnits,
        0,
      ),
      taskPerSessionP50: weightedSessionPercentile(
        sessions,
        (session) => session.taskCount / session.sessionUnits,
        0.5,
      ),
      productPerSessionP50: weightedSessionPercentile(
        sessions,
        (session) => session.productCount / session.sessionUnits,
        0.5,
      ),
      staffPerSessionP50: weightedSessionPercentile(
        sessionsWithStaff,
        shootSessionStaffCount,
        0.5,
      ),
      taskPerStaffSessionP50: weightedSessionPercentile(
        sessionsWithStaff,
        (session) =>
          session.taskCount /
          (session.sessionUnits * shootSessionStaffCount(session)),
        0.5,
      ),
      productPerStaffSessionP50: weightedSessionPercentile(
        sessionsWithStaff,
        (session) =>
          session.productCount /
          (session.sessionUnits * shootSessionStaffCount(session)),
        0.5,
      ),
      staffDataSessionUnits: sessionsWithStaff.reduce(
        (total, session) => total + session.sessionUnits,
        0,
      ),
    };
  }).sort((left, right) => right.sessionUnits - left.sessionUnits);
}

export function calculateShootTypeBaselinePlan(
  sessions: ShootSession[],
  from: Date | null = null,
  to: Date | null = null,
): ShootTypeBaselinePlan {
  const rows = calculateShootTypeBaselines(sessions, from, to);
  const validSessions = rows.flatMap((row) => row.sessions);
  const totalSessionUnits = rows.reduce(
    (total, row) => total + row.sessionUnits,
    0,
  );
  const overallTaskPerSessionP50 = weightedSessionPercentile(
    validSessions,
    (session) => session.taskCount / session.sessionUnits,
    0.5,
  );
  const overallProductPerSessionP50 = weightedSessionPercentile(
    validSessions,
    (session) => session.productCount / session.sessionUnits,
    0.5,
  );
  const sessionsWithStaff = validSessions.filter(
    (session) => shootSessionStaffCount(session) > 0,
  );
  const overallStaffPerSessionP50 = weightedSessionPercentile(
    sessionsWithStaff,
    shootSessionStaffCount,
    0.5,
  );
  const overallTaskPerStaffSessionP50 = weightedSessionPercentile(
    sessionsWithStaff,
    (session) =>
      session.taskCount /
      (session.sessionUnits * shootSessionStaffCount(session)),
    0.5,
  );
  const overallProductPerStaffSessionP50 = weightedSessionPercentile(
    sessionsWithStaff,
    (session) =>
      session.productCount /
      (session.sessionUnits * shootSessionStaffCount(session)),
    0.5,
  );
  const staffDataSessionUnits = sessionsWithStaff.reduce(
    (total, session) => total + session.sessionUnits,
    0,
  );
  const validDates = validSessions
    .flatMap((session) => (session.date ? [session.date] : []))
    .sort((left, right) => left.getTime() - right.getTime());
  const rangeStart = startOfDay(
    from ?? validDates[0] ?? new Date(0),
  );
  const rangeEnd = endOfDay(
    to ?? validDates.at(-1) ?? rangeStart,
  );
  let firstFullWeek = startOfWeek(rangeStart);
  if (firstFullWeek < rangeStart) {
    firstFullWeek = addDays(firstFullWeek, 7);
  }
  const fullWeekStarts: Date[] = [];
  for (
    let cursor = firstFullWeek;
    endOfWeek(cursor) <= rangeEnd;
    cursor = addDays(cursor, 7)
  ) {
    fullWeekStarts.push(cursor);
  }
  const usesPartialRange = fullWeekStarts.length === 0;
  const weekRanges = usesPartialRange
    ? [{ start: rangeStart, end: rangeEnd }]
    : fullWeekStarts.map((start) => ({
        start,
        end: endOfWeek(start),
      }));
  const weeklySessionP50 = percentile(
    weekRanges.map(({ start, end }) =>
      validSessions.reduce(
        (total, session) =>
          session.date &&
          session.date >= start &&
          session.date <= end
            ? total + session.sessionUnits
            : total,
        0,
      ),
    ),
    0.5,
  );
  const observedWeeklyTaskP50 = percentile(
    weekRanges.map(({ start, end }) =>
      validSessions.reduce(
        (total, session) =>
          session.date &&
          session.date >= start &&
          session.date <= end
            ? total + session.taskCount
            : total,
        0,
      ),
    ),
    0.5,
  );
  const observedWeeklyProductP50 = percentile(
    weekRanges.map(({ start, end }) => {
      const productCodes = new Set(
        validSessions
          .filter(
            (session) =>
              session.date &&
              session.date >= start &&
              session.date <= end,
          )
          .flatMap((session) => session.productCodes),
      );
      return productCodes.size;
    }),
    0.5,
  );
  const planRows = rows.map(
    (row): ShootTypeBaselinePlanRow => {
      const mixPercentage = totalSessionUnits
        ? (row.sessionUnits / totalSessionUnits) * 100
        : 0;
      return {
        ...row,
        confidence: "stable",
        mixPercentage,
        expectedWeeklySessions:
          weeklySessionP50 * (mixPercentage / 100),
        planningTaskPerSession: row.taskPerSessionP50,
        planningProductPerSession: row.productPerSessionP50,
        usesOverallFallback: false,
      };
    },
  );
  const weeklyTaskBaseline = planRows.reduce(
    (total, row) =>
      total +
      row.expectedWeeklySessions * row.planningTaskPerSession,
    0,
  );
  const weeklyProductBaseline = planRows.reduce(
    (total, row) =>
      total +
      row.expectedWeeklySessions * row.planningProductPerSession,
    0,
  );
  return {
    rows: planRows,
    sessions: validSessions,
    weekCount: weekRanges.length,
    usesPartialRange,
    overallTaskPerSessionP50,
    overallProductPerSessionP50,
    overallStaffPerSessionP50,
    overallTaskPerStaffSessionP50,
    overallProductPerStaffSessionP50,
    staffCoveragePercentage: totalSessionUnits
      ? (staffDataSessionUnits / totalSessionUnits) * 100
      : 0,
    weeklySessionP50,
    weeklyTaskBaseline,
    weeklyProductBaseline,
    observedWeeklyTaskP50,
    observedWeeklyProductP50,
    modelToObservedPercentage: observedWeeklyTaskP50
      ? (weeklyTaskBaseline / observedWeeklyTaskP50) * 100
      : 0,
    fallbackTypeCount: planRows.filter(
      (row) => row.usesOverallFallback,
    ).length,
  };
}
