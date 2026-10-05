import type { ShootSession, Task } from "../../model/types";
import { assigneeNames, normalize, normalizedKey } from "../../model/taskUtils";
import type { ShootStaffContributionRow, ShootStaffContributionStats, ShootStaffTaskMinutesRow, ShootSessionTaskMinutes } from "./types";

export function shootSessionStaffCount(session: ShootSession) {
  if (session.staffCount && session.staffCount > 0) {
    return session.staffCount;
  }
  return new Set(session.staffNames ?? []).size;
}

export function uniqueShootStaffCount(sessions: ShootSession[]) {
  const names = new Set<string>();
  let unnamedStaffCount = 0;
  for (const session of sessions) {
    const sessionNames = new Set(
      (session.staffNames ?? [])
        .map(normalizedKey)
        .filter(Boolean),
    );
    for (const name of sessionNames) names.add(name);
    unnamedStaffCount = Math.max(
      unnamedStaffCount,
      Math.max(0, shootSessionStaffCount(session) - sessionNames.size),
    );
  }
  return names.size + unnamedStaffCount;
}

function compactSearchKey(value: unknown) {
  return normalizedKey(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "");
}

function mannequinTaskKind(task: Task) {
  const identity = compactSearchKey(
    `${task.formatType} ${task.title} ${task.type}`,
  );
  const isMannequin =
    identity.includes("manocanh") || identity.includes("mannequin");
  if (!isMannequin) return null;

  const format = compactSearchKey(task.formatType);
  const stage = compactSearchKey(task.stage);
  if (format.includes("video") || stage === "quay") return "video";
  if (
    format.includes("anh") ||
    format.includes("hinh") ||
    format.includes("photo") ||
    stage === "chup"
  ) {
    return "photo";
  }
  return null;
}

function sessionKeys(task: Task) {
  return normalize(task.shootSession)
    .split(/\s*[|,;\n]\s*/)
    .map(normalizedKey)
    .filter(Boolean);
}

function linkedTasksForSession(
  session: ShootSession,
  tasks: Task[],
  taskByCode: Map<string, Task>,
) {
  const linkedTasks = new Map<string, Task>();
  for (const taskCode of session.taskCodes) {
    const task = taskByCode.get(normalizedKey(taskCode));
    if (task) linkedTasks.set(normalizedKey(task.code), task);
  }
  const sessionKey = normalizedKey(session.id);
  for (const task of tasks) {
    if (sessionKeys(task).includes(sessionKey)) {
      linkedTasks.set(normalizedKey(task.code), task);
    }
  }
  return Array.from(linkedTasks.values());
}

/**
 * Reconciles the declared session total with task evidence. An image and a
 * video mannequin task in the same session and for the same product are one
 * unit of shooting work, while both source rows remain available as evidence.
 */
export function reconcileShootSessionTaskCounts(
  sessions: ShootSession[],
  tasks: Task[],
) {
  const taskByCode = new Map(
    tasks
      .map((task) => [normalizedKey(task.code), task] as const)
      .filter(([code]) => Boolean(code)),
  );

  return sessions.map((session) => {
    const linkedTasks = linkedTasksForSession(session, tasks, taskByCode);
    const mannequinByProduct = new Map<
      string,
      { label: string; photos: Task[]; videos: Task[] }
    >();

    for (const task of linkedTasks) {
      const kind = mannequinTaskKind(task);
      const productKey = normalizedKey(task.productCode);
      if (!kind || !productKey) continue;
      const bucket = mannequinByProduct.get(productKey) ?? {
        label: normalize(task.productCode),
        photos: [],
        videos: [],
      };
      bucket[kind === "photo" ? "photos" : "videos"].push(task);
      mannequinByProduct.set(productKey, bucket);
    }

    const pairedGroupByTask = new Map<Task, {
      id: string;
      label: string;
      productCode: string;
      countedTaskCount: number;
      isMannequinPair: boolean;
      tasks: Task[];
    }>();
    let mannequinPairCount = 0;
    for (const [productKey, bucket] of mannequinByProduct) {
      const pairCount = Math.min(bucket.photos.length, bucket.videos.length);
      for (let index = 0; index < pairCount; index += 1) {
        const group = {
          id: `mannequin-${productKey}-${index + 1}`,
          label: `Manocanh · ${bucket.label}`,
          productCode: bucket.label,
          countedTaskCount: 1,
          isMannequinPair: true,
          tasks: [bucket.photos[index], bucket.videos[index]],
        };
        for (const task of group.tasks) pairedGroupByTask.set(task, group);
        mannequinPairCount += 1;
      }
    }

    const emittedGroups = new Set<string>();
    const taskGroups = linkedTasks.flatMap((task, index) => {
      const pairedGroup = pairedGroupByTask.get(task);
      if (pairedGroup) {
        if (emittedGroups.has(pairedGroup.id)) return [];
        emittedGroups.add(pairedGroup.id);
        return [pairedGroup];
      }
      return [{
        id: `task-${normalizedKey(task.code) || index + 1}`,
        label: normalize(task.productCode) || "Task riêng",
        productCode: normalize(task.productCode),
        countedTaskCount: 1,
        isMannequinPair: false,
        tasks: [task],
      }];
    });
    const rawTaskCount = session.rawTaskCount ?? session.taskCount;

    return {
      ...session,
      rawTaskCount,
      taskCount: Math.max(0, rawTaskCount - mannequinPairCount),
      mannequinPairCount,
      taskGroups,
    };
  });
}

export function calculateShootStaffContributions(
  sessions: ShootSession[],
): ShootStaffContributionStats {
  const staffRows = new Map<
    string,
    Omit<
      ShootStaffContributionRow,
      "timePercentage" | "taskPercentage" | "productPercentage"
    >
  >();
  let namedSessionCount = 0;
  let attributedSessionUnits = 0;
  let attributedTaskCount = 0;
  let attributedProductCount = 0;

  for (const session of sessions) {
    const sessionStaff = new Map<string, string>();
    for (const rawName of session.staffNames ?? []) {
      const staffName = normalize(rawName);
      const key = normalizedKey(staffName);
      if (key && !sessionStaff.has(key)) {
        sessionStaff.set(key, staffName);
      }
    }
    if (!sessionStaff.size) continue;
    namedSessionCount += 1;
    attributedSessionUnits += session.sessionUnits;
    attributedTaskCount += session.taskCount;
    attributedProductCount += session.productCount;
    const staffCount = Math.max(
      sessionStaff.size,
      shootSessionStaffCount(session),
    );

    for (const [key, staffName] of sessionStaff) {
      const row = staffRows.get(key) ?? {
        staffName,
        sessions: [],
        sessionCount: 0,
        participatedSessionUnits: 0,
        timeValue: 0,
        taskValue: 0,
        productValue: 0,
      };
      row.sessions.push(session);
      row.sessionCount += 1;
      row.participatedSessionUnits += session.sessionUnits;
      row.timeValue += session.sessionUnits / staffCount;
      row.taskValue += session.taskCount / staffCount;
      row.productValue += session.productCount / staffCount;
      staffRows.set(key, row);
    }
  }

  const totalSessionUnits = sessions.reduce(
    (total, session) => total + session.sessionUnits,
    0,
  );
  return {
    rows: Array.from(staffRows.values()).map((row) => ({
      ...row,
      timePercentage: attributedSessionUnits
        ? (row.timeValue / attributedSessionUnits) * 100
        : 0,
      taskPercentage: attributedTaskCount
        ? (row.taskValue / attributedTaskCount) * 100
        : 0,
      productPercentage: attributedProductCount
        ? (row.productValue / attributedProductCount) * 100
        : 0,
    })),
    sessionCount: sessions.length,
    namedSessionCount,
    coveragePercentage: totalSessionUnits
      ? (attributedSessionUnits / totalSessionUnits) * 100
      : sessions.length
        ? (namedSessionCount / sessions.length) * 100
        : 0,
    totalSessionUnits,
    attributedSessionUnits,
    attributedTaskCount,
    attributedProductCount,
  };
}

export function calculateShootTaskMinutesByStaff(
  sessions: ShootSession[],
  tasks: Task[],
): ShootSessionTaskMinutes[] {
  const taskByCode = new Map(
    tasks.map((task) => [normalizedKey(task.code), task]),
  );

  return sessions.map((session) => {
    const linkedTasks = linkedTasksForSession(session, tasks, taskByCode);

    const staffRows = new Map<string, ShootStaffTaskMinutesRow>();
    for (const task of linkedTasks) {
      const workloadOwner = normalize(task.outsource) || task.assignee;
      for (const staffName of assigneeNames(workloadOwner)) {
        const key = normalizedKey(staffName);
        const row = staffRows.get(key) ?? {
          staffName,
          tasks: [],
          minutes: 0,
        };
        row.tasks.push(task);
        row.minutes += task.expectedMinutes;
        staffRows.set(key, row);
      }
    }

    const rows = Array.from(staffRows.values()).sort((left, right) =>
      left.staffName.localeCompare(right.staffName, "vi"),
    );
    return {
      session,
      linkedTasks,
      staffRows: rows,
      totalMinutes: rows.reduce((total, row) => total + row.minutes, 0),
    };
  });
}
