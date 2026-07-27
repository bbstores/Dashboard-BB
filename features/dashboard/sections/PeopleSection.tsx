import {
  formatDate,
  formatHours,
  formatMinutes,
  formatWorkDays,
} from "@/shared/formatting/format";
import type { DashboardStats } from "../analytics/calculateDashboardStats";
import type { calculateDailyTaskChart } from "../analytics/calculateDailyTaskChart";
import { DailyTaskChart } from "../components/DailyTaskChart";
import { HorizontalBars } from "../components/HorizontalBars";
import { StaffColumns } from "../components/StaffColumns";
import { assigneeNames } from "../model/taskUtils";
import type {
  DetailView,
  LeaderboardUnit,
} from "../model/types";

type PeopleViewModel = {
  leaderboard: DashboardStats["leaderboard"];
  staffRows: DashboardStats["staffRows"];
  selectedFeedback: DashboardStats["selectedFeedback"];
  taskByCode: DashboardStats["taskByCode"];
  dailyTaskChart: ReturnType<typeof calculateDailyTaskChart>;
};

export type PeopleSectionProps = {
  viewModel: PeopleViewModel;
  leaderboardUnit: LeaderboardUnit;
  dailyAssignee: string;
  onLeaderboardUnitChange: (unit: LeaderboardUnit) => void;
  onDailyAssigneeChange: (assignee: string) => void;
  onOpenDetail: (detail: DetailView) => void;
};

export function PeopleSection({
  viewModel,
  leaderboardUnit,
  dailyAssignee,
  onLeaderboardUnitChange,
  onDailyAssigneeChange,
  onOpenDetail,
}: PeopleSectionProps) {
  return (
    <>
      <header className="dashboardGroupHeader peopleHeader">
        <span>02</span>
        <div>
          <p>NHÂN SỰ &amp; KHỐI LƯỢNG</p>
          <h2>Thời gian, số task &amp; phản hồi</h2>
        </div>
      </header>

      <HorizontalBars
        title="Leaderboard thời gian"
        subtitle="TỔNG PHÚT DỰ KIẾN THEO ASSIGNEE"
        rows={viewModel.leaderboard}
        className="groupPeople leaderboardCard"
        format={
          leaderboardUnit === "minutes"
            ? formatMinutes
            : leaderboardUnit === "hours"
              ? formatHours
              : formatWorkDays
        }
        headerAction={
          <label className="unitSelector">
            Đơn vị
            <select
              value={leaderboardUnit}
              onChange={(event) =>
                onLeaderboardUnitChange(
                  event.target.value as LeaderboardUnit,
                )
              }
              aria-label="Đơn vị thời gian leaderboard"
            >
              <option value="minutes">Phút</option>
              <option value="hours">Giờ</option>
              <option value="days">Ngày công (8 giờ)</option>
            </select>
          </label>
        }
        onSelect={(label, metric = "total") => {
          const row = viewModel.leaderboard.find(
            (item) => item.label === label,
          );
          if (!row) return;
          const titleMap = {
            total: "Tổng thời gian",
            started: "Task trong kỳ",
            carried: "Carry-in bàn giao",
            waiting: "To Do / Pending-Cancel",
          };
          const taskMap = {
            total: row.tasks,
            started: row.startedTasks,
            carried: row.carriedTasks,
            waiting: row.waitingTasks,
          };
          onOpenDetail({
            title: `${titleMap[metric]} · ${label}`,
            subtitle: "Các task tạo nên thời gian đã chọn",
            tasks: taskMap[metric],
          });
        }}
      />

      <DailyTaskChart
        rows={viewModel.dailyTaskChart.rows}
        assignees={viewModel.dailyTaskChart.assignees}
        assignee={dailyAssignee}
        onAssigneeChange={onDailyAssigneeChange}
        onSelect={(type, row) => {
          const titleMap = {
            assigned: "Được giao",
            handedSameDay: "Bàn giao · Task trong ngày",
            handedBacklog: "Bàn giao · Xử lý task tồn",
            backlog: "Tồn cuối ngày",
          };
          const taskMap = {
            assigned: row.assignedTasks,
            handedSameDay: row.handedSameDayTasks,
            handedBacklog: row.handedBacklogTasks,
            backlog: row.backlogTasks,
          };
          onOpenDetail({
            title: titleMap[type],
            subtitle: formatDate(row.date),
            tasks: taskMap[type],
          });
        }}
      />

      <StaffColumns
        rows={viewModel.staffRows}
        className="groupPeople"
        onSelect={(name, metric) => {
          if (metric === "feedback") {
            onOpenDetail({
              title: `Lần trả về · ${name}`,
              subtitle:
                "Dữ liệu từ sheet 2.9 Lịch sử phản hồi Task trong bộ lọc",
              feedback: viewModel.selectedFeedback
                .filter((item) =>
                  assigneeNames(
                    item.assignee ||
                      viewModel.taskByCode.get(item.taskCode)?.assignee ||
                      "",
                  ).includes(name),
                )
                .map((item) => ({
                  ...item,
                  task: viewModel.taskByCode.get(item.taskCode),
                })),
            });
            return;
          }
          const row = viewModel.staffRows.find(
            (item) => item.name === name,
          );
          if (!row) return;
          const labels = {
            total: "Tổng task",
            started: "Bắt đầu trong kỳ",
            inspectionCarry: "Carry-in bàn giao",
            completionCarry: "Carry-in hoàn thành",
          };
          const taskMap = {
            total: row.totalTasks,
            started: row.startedTasks,
            inspectionCarry: row.inspectionCarryTasks,
            completionCarry: row.completionCarryTasks,
          };
          onOpenDetail({
            title: `${labels[metric]} · ${name}`,
            subtitle: "Các task tạo nên cột đã chọn",
            tasks: taskMap[metric],
          });
        }}
      />
    </>
  );
}
