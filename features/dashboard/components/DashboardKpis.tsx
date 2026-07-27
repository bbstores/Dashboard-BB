import { inputDate } from "@/shared/date/dateUtils";
import {
  formatDate,
  formatNumber,
} from "@/shared/formatting/format";
import type { DashboardStats } from "../analytics/calculateDashboardStats";
import { dashboardHelp } from "../help/helpContent";
import type { DetailView, Task } from "../model/types";
import { KpiCard } from "./KpiCard";

type DashboardKpisViewModel = Pick<
  DashboardStats,
  | "selectedTasks"
  | "startedInWindow"
  | "inspectionCarryIntoWindow"
  | "completionCarryIntoWindow"
  | "missingEither"
  | "missingStartOnly"
  | "missingAssigneeOnly"
  | "missingBoth"
  | "backlogTasks"
  | "backlogAttentionTasks"
  | "backlogTotal"
>;

export type DashboardKpisProps = {
  viewModel: DashboardKpisViewModel;
  allTasks: Task[];
  backlogDate: string;
  onOpenDetail: (detail: DetailView) => void;
};

export function DashboardKpis({
  viewModel,
  allTasks,
  backlogDate,
  onOpenDetail,
}: DashboardKpisProps) {
  return (
    <section className="kpiGrid">
      <KpiCard
        label="Task trong kỳ"
        value={formatNumber(viewModel.selectedTasks.length)}
        help={dashboardHelp("Task trong kỳ")}
        variant="dark"
        onClick={() =>
          onOpenDetail({
            title: "Task trong kỳ",
            subtitle:
              "Hợp khử trùng của task bắt đầu, carry-in bàn giao và carry-in hoàn thành",
            tasks: viewModel.selectedTasks,
          })
        }
      >
        <b>{formatNumber(viewModel.startedInWindow.length)}</b> bắt đầu trong
        kỳ{" · "}
        <b>{formatNumber(viewModel.inspectionCarryIntoWindow.length)}</b>{" "}
        carry-in bàn giao{" · "}
        <b>{formatNumber(viewModel.completionCarryIntoWindow.length)}</b>{" "}
        carry-in hoàn thành
        <br />
        <em>Hai mốc carry-in có thể giao nhau; tổng đã khử trùng.</em>
      </KpiCard>

      <KpiCard
        label="Thiếu ngày bắt đầu hoặc assignee"
        value={formatNumber(viewModel.missingEither)}
        help={dashboardHelp("Task thiếu thông tin")}
        onClick={() =>
          onOpenDetail({
            title: "Task thiếu thông tin",
            subtitle: "Chưa có Ngày Bắt Đầu hoặc chưa có Assignee",
            tasks: allTasks.filter(
              (task) => !task.startDate || !task.assignee,
            ),
          })
        }
      >
        <b>{viewModel.missingStartOnly}</b> chỉ thiếu ngày ·{" "}
        <b>{viewModel.missingAssigneeOnly}</b> chỉ thiếu assignee
        <br />
        <b>{viewModel.missingBoth}</b> thiếu cả hai
      </KpiCard>

      <KpiCard
        label="Task tồn tại mốc chọn"
        value={formatNumber(viewModel.backlogTotal)}
        help={dashboardHelp("Task tồn tại mốc chọn")}
        variant="lime"
        onClick={() =>
          onOpenDetail({
            title: "Task tồn tại mốc chọn",
            subtitle: `Các task tồn bắt đầu trước ${formatDate(inputDate(backlogDate))}`,
            tasks: viewModel.backlogTasks,
          })
        }
      >
        Chưa kiểm duyệt và chưa Done, hoặc vẫn In Progress
      </KpiCard>

      <KpiCard
        label="Dữ liệu cần lưu ý"
        value={formatNumber(viewModel.backlogAttentionTasks.length)}
        help={dashboardHelp("Dữ liệu cần lưu ý")}
        variant="warning"
        onClick={() =>
          onOpenDetail({
            title: "Dữ liệu cần lưu ý",
            subtitle: `Task Done có Ngày Bắt Đầu sau Ngày Kiểm Duyệt tính đến ${formatDate(inputDate(backlogDate))}`,
            tasks: viewModel.backlogAttentionTasks,
          })
        }
      >
        Done có Ngày Bắt Đầu sau Ngày Kiểm Duyệt
      </KpiCard>
    </section>
  );
}
