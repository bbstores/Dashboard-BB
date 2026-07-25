import type { ChildCollection } from "../types";
import { formatNumber } from "../format";
import { MiniProgressDonut } from "./ProgressDonut";

export function CollectionChildrenPanel({
  month,
  metric,
  rows,
  onSelect,
}: {
  month: string;
  metric: "tasks" | "minutes";
  rows: ChildCollection[];
  onSelect: (child: ChildCollection) => void;
}) {
  if (!rows.length) return null;
  return (
    <div className="childCollectionPanel">
      <span className="chartKicker">BST CON · {month} · {metric === "tasks" ? "Số task" : "Phút"}</span>
      <div className="childCollectionGrid">
        {rows.map((child) => (
          <button type="button" key={child.name} className="childCard" onClick={() => onSelect(child)}>
            <MiniProgressDonut
              label={child.name}
              done={metric === "tasks" ? child.taskDone : child.minuteDone}
              total={metric === "tasks" ? child.taskTotal : child.minuteTotal}
            />
            <small>
              {formatNumber(metric === "tasks" ? child.taskDone : child.minuteDone)} /{" "}
              {formatNumber(metric === "tasks" ? child.taskTotal : child.minuteTotal)}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}
