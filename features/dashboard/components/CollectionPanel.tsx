import type { ChildCollection } from "../model/types";
import { formatNumber } from "@/shared/formatting/format";
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
    <div className="metricChildren">
      <div className="metricChildrenHeader">
        <span className="chartKicker">BST CON · {month} · {metric === "tasks" ? "Số task" : "Phút"}</span>
      </div>
      <div className="metricChildrenGrid">
        {rows.map((child) => (
          <button type="button" key={child.name} className="metricChild" onClick={() => onSelect(child)}>
            <MiniProgressDonut
              label={child.name}
              done={metric === "tasks" ? child.taskDone : child.minuteDone}
              total={metric === "tasks" ? child.taskTotal : child.minuteTotal}
            />
            <strong>
              {formatNumber(metric === "tasks" ? child.taskDone : child.minuteDone)} /{" "}
              {formatNumber(metric === "tasks" ? child.taskTotal : child.minuteTotal)}
            </strong>
          </button>
        ))}
      </div>
    </div>
  );
}
