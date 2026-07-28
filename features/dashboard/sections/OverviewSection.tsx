import { formatDate } from "@/shared/formatting/format";
import type { DashboardStats } from "../analytics/calculateDashboardStats";
import type { PieMetricSet } from "../analytics/types";
import { HorizontalBars } from "../components/HorizontalBars";
import { CostMetricCard } from "../components/CostMetricCard";
import { PieChart } from "../components/PieChart";
import {
  evaluateHandoff,
  evaluateOverall,
} from "../model/slaUtils";
import {
  matchesGroup,
  outsourceName,
} from "../model/taskUtils";
import type {
  DetailView,
  PieScope,
} from "../model/types";

type OverviewViewModel = {
  reportingDate: Date;
  types: DashboardStats["types"];
  costs: DashboardStats["costs"];
  selectedTasks: DashboardStats["selectedTasks"];
  metrics: {
    status: PieMetricSet;
    handoff: PieMetricSet;
    overall: PieMetricSet;
    stages: PieMetricSet;
    outsource: PieMetricSet;
  };
};

export type OverviewSectionProps = {
  viewModel: OverviewViewModel;
  scopes: Record<string, PieScope>;
  excludeOutsource: Record<string, boolean>;
  onScopeChange: (key: string, scope: PieScope) => void;
  onExcludeOutsourceChange: (key: string, checked: boolean) => void;
  onOpenDetail: (detail: DetailView) => void;
};

export function OverviewSection({
  viewModel,
  scopes,
  excludeOutsource,
  onScopeChange,
  onExcludeOutsourceChange,
  onOpenDetail,
}: OverviewSectionProps) {
  const { costs, metrics, reportingDate, selectedTasks, types } = viewModel;

  return (
    <>
      <header className="dashboardGroupHeader overviewHeader">
        <span>01</span>
        <div>
          <p>TỔNG QUAN VẬN HÀNH</p>
          <h2>Trạng thái, chất lượng &amp; phân bổ task</h2>
        </div>
      </header>

      <div className="triplePie fullWidth groupOverview">
        <PieChart
          title="Tình trạng task"
          data={metrics.status.status}
          compact
          scope={scopes.status}
          onScopeChange={(scope) => onScopeChange("status", scope)}
          excludeOutsource={Boolean(excludeOutsource.status)}
          onExcludeOutsourceChange={(checked) =>
            onExcludeOutsourceChange("status", checked)
          }
          onSelect={(label) =>
            onOpenDetail({
              title: `Tình trạng · ${label}`,
              subtitle: "Task trong bộ lọc có cùng trạng thái",
              tasks: metrics.status.tasks.filter((task) =>
                matchesGroup(task.status, label),
              ),
            })
          }
        />
        <PieChart
          title="Tuân thủ ngày bàn giao"
          data={metrics.handoff.handoff}
          compact
          scope={scopes.handoff}
          onScopeChange={(scope) => onScopeChange("handoff", scope)}
          excludeOutsource={Boolean(excludeOutsource.handoff)}
          onExcludeOutsourceChange={(checked) =>
            onExcludeOutsourceChange("handoff", checked)
          }
          onSelect={(label) =>
            onOpenDetail({
              title: `Tuân thủ bàn giao · ${label}`,
              subtitle: `Đánh giá tại mốc ${formatDate(reportingDate)}`,
              tasks: metrics.handoff.tasks.filter(
                (task) =>
                  evaluateHandoff(task, reportingDate).label === label,
              ),
            })
          }
        />
        <PieChart
          title="Tuân thủ hạn hoàn thành"
          data={metrics.overall.overall}
          compact
          scope={scopes.overall}
          onScopeChange={(scope) => onScopeChange("overall", scope)}
          excludeOutsource={Boolean(excludeOutsource.overall)}
          onExcludeOutsourceChange={(checked) =>
            onExcludeOutsourceChange("overall", checked)
          }
          onSelect={(label) =>
            onOpenDetail({
              title: `Tuân thủ hoàn thành · ${label}`,
              subtitle: `Hạn là cuối ngày làm việc kế tiếp · đánh giá tại ${formatDate(reportingDate)}`,
              tasks: metrics.overall.tasks.filter(
                (task) =>
                  evaluateOverall(task, reportingDate).label === label,
              ),
            })
          }
        />
      </div>

      <HorizontalBars
        title="Task theo Type"
        subtitle="COLUMN TYPE"
        rows={types}
        className="groupOverview"
        onSelect={(label) =>
          onOpenDetail({
            title: `Type · ${label}`,
            subtitle: "Task trong bộ lọc có cùng Type",
            tasks: selectedTasks.filter((task) =>
              matchesGroup(task.type, label),
            ),
          })
        }
      />
      <PieChart
        title="Task theo công đoạn"
        className="groupOverview"
        data={metrics.stages.stages}
        scope={scopes.stages}
        onScopeChange={(scope) => onScopeChange("stages", scope)}
        excludeOutsource={Boolean(excludeOutsource.stages)}
        onExcludeOutsourceChange={(checked) =>
          onExcludeOutsourceChange("stages", checked)
        }
        onSelect={(label) =>
          onOpenDetail({
            title: `Công đoạn · ${label}`,
            subtitle: "Task trong bộ lọc có cùng công đoạn",
            tasks: metrics.stages.tasks.filter((task) =>
              matchesGroup(task.stage, label),
            ),
          })
        }
      />
      <PieChart
        title="Task Outsource"
        className="groupOverview"
        data={metrics.outsource.outsource}
        scope={scopes.outsource}
        onScopeChange={(scope) => onScopeChange("outsource", scope)}
        onSelect={(label) =>
          onOpenDetail({
            title: `Outsource · ${label}`,
            subtitle: "Các task có cùng tên trong cột Outsource",
            tasks: metrics.outsource.tasks.filter((task) =>
              matchesGroup(outsourceName(task), label),
            ),
          })
        }
      />
      <CostMetricCard
        costs={costs}
        onClick={() =>
          onOpenDetail({
            title: "Chi phí task trong khoảng lọc",
            subtitle: "Phân bổ từ các phiếu có Link Approval, đã thanh toán; task được chọn theo Ngày Bắt Đầu",
            costAllocations: costs.selectedAllocations,
          })
        }
      />
    </>
  );
}
