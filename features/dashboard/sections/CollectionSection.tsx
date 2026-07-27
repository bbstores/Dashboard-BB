import type { DashboardStats } from "../analytics/calculateDashboardStats";
import { CollectionChildrenPanel } from "../components/CollectionPanel";
import { HelpButton } from "../components/HelpButton";
import { ProgressDonut } from "../components/ProgressDonut";
import { dashboardHelp } from "../help/helpContent";
import type { DetailView } from "../model/types";

type CollectionViewModel = Pick<
  DashboardStats,
  | "months"
  | "collection"
  | "collectionDone"
  | "collectionTasks"
  | "childCollections"
>;

export type CollectionSectionProps = {
  viewModel: CollectionViewModel;
  collectionMonth: string;
  onCollectionMonthChange: (month: string) => void;
  onOpenDetail: (detail: DetailView) => void;
};

export function CollectionSection({
  viewModel,
  collectionMonth,
  onCollectionMonthChange,
  onOpenDetail,
}: CollectionSectionProps) {
  return (
    <>
      <header className="dashboardGroupHeader productionHeader">
        <span>03</span>
        <div>
          <p>BỘ SƯU TẬP &amp; SẢN LƯỢNG</p>
          <h2>Tiến độ BST, Video &amp; Graphic</h2>
        </div>
      </header>

      <article className="chartCard collectionCard fullWidth groupProduction">
        <div className="chartTitle">
          <div>
            <span className="chartKicker">BỘ SƯU TẬP</span>
            <h3>Tiến độ hoàn thành</h3>
          </div>
          <div className="chartHeaderTools">
            <select
              value={collectionMonth}
              onChange={(event) =>
                onCollectionMonthChange(event.target.value)
              }
              aria-label="Chọn tháng bộ sưu tập"
            >
              <option value="">Chọn tháng bắt buộc</option>
              {viewModel.months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <HelpButton help={dashboardHelp("Tiến độ hoàn thành")} />
          </div>
        </div>
        {collectionMonth ? (
          <div className="collectionProgressArea">
            <div className="progressGrid">
              <div className="metricHoverGroup tasks">
                <ProgressDonut
                  title="THEO SỐ TASK"
                  done={viewModel.collection.taskDone}
                  total={viewModel.collection.taskTotal}
                  unit="task"
                  onSelect={(scope) =>
                    onOpenDetail({
                      title:
                        scope === "done"
                          ? `Task Done · ${collectionMonth}`
                          : `Tất cả task · ${collectionMonth}`,
                      subtitle: "Tiến độ Bộ Sưu Tập theo số lượng task",
                      tasks:
                        scope === "done"
                          ? viewModel.collectionDone
                          : viewModel.collectionTasks,
                    })
                  }
                />
                <CollectionChildrenPanel
                  month={collectionMonth}
                  metric="tasks"
                  rows={viewModel.childCollections}
                  onSelect={(child) =>
                    onOpenDetail({
                      title: `${child.name} · Số task`,
                      subtitle: "Các task thuộc BST con đã chọn",
                      tasks: child.tasks,
                    })
                  }
                />
              </div>
              <div className="metricHoverGroup minutes">
                <ProgressDonut
                  title="THEO TỔNG PHÚT"
                  done={viewModel.collection.minuteDone}
                  total={viewModel.collection.minuteTotal}
                  unit="phút"
                  onSelect={(scope) =>
                    onOpenDetail({
                      title:
                        scope === "done"
                          ? `Phút đã Done · ${collectionMonth}`
                          : `Tổng phút · ${collectionMonth}`,
                      subtitle:
                        "Danh sách task tạo nên tổng số phút dự kiến",
                      tasks:
                        scope === "done"
                          ? viewModel.collectionDone
                          : viewModel.collectionTasks,
                    })
                  }
                />
                <CollectionChildrenPanel
                  month={collectionMonth}
                  metric="minutes"
                  rows={viewModel.childCollections}
                  onSelect={(child) =>
                    onOpenDetail({
                      title: `${child.name} · Tổng phút`,
                      subtitle: "Các task tạo nên số phút của BST con",
                      tasks: child.tasks,
                    })
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="selectPrompt">
            <span>01</span>
            <p>
              Chọn tháng để tính tiến độ từ các task thuộc Bộ Sưu Tập của
              tháng đó.
            </p>
          </div>
        )}
      </article>
    </>
  );
}
