import {
  collectionMonths,
  collectionNames,
  isCollectionDone,
} from "../model/taskUtils";
import type { Task } from "../model/types";

export function calculateCollections(
  tasks: Task[],
  collectionMonth: string,
) {
  const months = Array.from(new Set(tasks.flatMap(collectionMonths))).sort(
    (a, b) => {
      const [am, ay] = a.split(".").map(Number);
      const [bm, by] = b.split(".").map(Number);
      return by - ay || bm - am;
    },
  );
  const collectionTasks = collectionMonth
    ? tasks.filter((task) =>
        collectionMonths(task).includes(collectionMonth),
      )
    : [];
  const collectionDone = collectionTasks.filter(isCollectionDone);
  const childCollectionMap = new Map<string, Task[]>();
  for (const task of collectionTasks) {
    for (const name of collectionNames(task, collectionMonth)) {
      const rows = childCollectionMap.get(name) ?? [];
      rows.push(task);
      childCollectionMap.set(name, rows);
    }
  }
  const childCollections = Array.from(childCollectionMap.entries())
    .map(([name, childTasks]) => {
      const doneTasks = childTasks.filter(isCollectionDone);
      return {
        name,
        tasks: childTasks,
        doneTasks,
        taskTotal: childTasks.length,
        taskDone: doneTasks.length,
        minuteTotal: childTasks.reduce(
          (sum, task) => sum + task.expectedMinutes,
          0,
        ),
        minuteDone: doneTasks.reduce(
          (sum, task) => sum + task.expectedMinutes,
          0,
        ),
      };
    })
    .sort((a, b) => b.taskTotal - a.taskTotal);

  return {
    months,
    collectionTasks,
    collectionDone,
    childCollections,
    collection: {
      taskDone: collectionDone.length,
      taskTotal: collectionTasks.length,
      minuteDone: collectionDone.reduce(
        (sum, task) => sum + task.expectedMinutes,
        0,
      ),
      minuteTotal: collectionTasks.reduce(
        (sum, task) => sum + task.expectedMinutes,
        0,
      ),
    },
  };
}
