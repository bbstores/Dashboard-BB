import {
  inputDate,
  operationalMinute,
  percentile,
} from "@/shared/date/dateUtils";
import {
  formatDate,
  formatNumber,
  formatOperationalTime,
  formatSlaMinutes,
  formatWorkDays,
} from "@/shared/formatting/format";
import type { DashboardStats } from "../analytics/calculateDashboardStats";
import { HelpButton } from "../components/HelpButton";
import { HorizontalBars } from "../components/HorizontalBars";
import { PieChart } from "../components/PieChart";
import { SlaMetricCard } from "../components/SlaMetricCard";
import { StaffTimeOfDayChart } from "../components/StaffTimeOfDayChart";
import { dashboardHelp } from "../help/helpContent";
import {
  handoffLateMinutes,
  lateMinuteBucket,
} from "../model/slaUtils";
import {
  agingBucket,
  cycleBucket,
  groupCount,
  matchesGroup,
} from "../model/taskUtils";
import type {
  DetailView,
  PercentileDetail,
} from "../model/types";

type SlaViewModel = {
  sla: DashboardStats["sla"];
  reportingDate: DashboardStats["reportingDate"];
  backlog: DashboardStats["backlog"];
  backlogTasks: DashboardStats["backlogTasks"];
};

export type SlaSectionProps = {
  viewModel: SlaViewModel;
  backlogDate: string;
  onOpenDetail: (detail: DetailView) => void;
  onOpenPercentile: (detail: PercentileDetail) => void;
};

export function SlaSection({
  viewModel,
  backlogDate,
  onOpenDetail,
  onOpenPercentile,
}: SlaSectionProps) {
  const { sla, reportingDate, backlog, backlogTasks } = viewModel;

  return (
    <>
      <header className="dashboardGroupHeader slaGroupHeader">
        <span>04</span>
        <div>
          <p>SLA &amp; ĐỊNH MỨC</p>
          <h2>Nhịp xử lý, aging &amp; tải công việc</h2>
        </div>
      </header>

      <section className="slaSection fullWidth groupSla">
        <div className="slaHeader">
          <div>
            <span className="chartKicker">SLA · KHÁM PHÁ DỮ LIỆU</span>
            <h2>Nhịp xử lý &amp; định mức</h2>
            <p>
              Giờ làm việc: Thứ Hai–Thứ Bảy, 08:30–12:00 và
              13:00–17:30; đã loại lịch nghỉ lễ Việt Nam 2026.
            </p>
          </div>
          <span className="slaMode">CHƯA GẮN NGƯỠNG ĐẠT / VI PHẠM</span>
        </div>

        <section className="handoffSlaBlock">
          <div className="handoffSlaHeader">
            <div>
              <span className="chartKicker">TUÂN THỦ MỐC BÀN GIAO</span>
              <h3>Bàn giao trong ngày &amp; mức độ trễ</h3>
              <p>
                Cùng ngày luôn được tính đúng hạn. Khi sang ngày khác, phút
                trễ chỉ tính từ 08:30 trong giờ làm việc.
              </p>
            </div>
            <HelpButton help={dashboardHelp("Tuân thủ ngày bàn giao")} />
          </div>
          <div className="handoffKpis">
            <SlaMetricCard
              kicker="TỶ LỆ ĐÚNG NGÀY"
              title="Task đã bàn giao đủ dữ liệu"
              value={`${Math.round(sla.handoffOnTimeRate)}%`}
              note={`${formatNumber(sla.onTimeHandoffs.length)} / ${formatNumber(sla.handedForKpi.length)} task bàn giao đúng ngày`}
              help={dashboardHelp("Tuân thủ ngày bàn giao")}
              onClick={() =>
                onOpenDetail({
                  title: "Bàn giao đúng ngày",
                  subtitle: "Ngày Kiểm Duyệt cùng ngày Ngày Bắt Đầu",
                  tasks: sla.onTimeHandoffs.map((row) => row.task),
                })
              }
            />
            <SlaMetricCard
              kicker="CHƯA BÀN GIAO"
              title="Quá hạn tại ngày báo cáo"
              value={formatNumber(sla.overdueHandoffs.length)}
              note={`Đánh giá tại ${formatDate(reportingDate)}`}
              help={dashboardHelp("Tuân thủ ngày bàn giao")}
              onClick={() =>
                onOpenDetail({
                  title: "Quá hạn chưa bàn giao",
                  subtitle:
                    "Đã qua ngày bắt đầu nhưng chưa có Ngày Kiểm Duyệt",
                  tasks: sla.overdueHandoffs.map((row) => row.task),
                })
              }
            />
            <SlaMetricCard
              kicker="MỨC TRỄ ĐIỂN HÌNH"
              title="P50 của task bàn giao trễ ngày"
              value={formatSlaMinutes(sla.handoffLateP50)}
              note={`${formatNumber(sla.lateHandoffs.length)} task trễ ngày · chỉ tính giờ làm việc`}
              help={{
                title: "P50 phút trễ bàn giao",
                purpose:
                  "Mức phút trễ điển hình của riêng các task đã bàn giao sang ngày khác.",
                objective:
                  "Phân biệt task chỉ trễ qua ngày nhưng bàn giao trước ca với task chiếm nhiều giờ làm việc của ngày kế tiếp.",
                calculation:
                  "Bắt đầu tính từ 08:30 của ngày làm việc kế tiếp; loại ngoài giờ, nghỉ trưa, Chủ nhật và ngày lễ. P50 là trung vị.",
                example:
                  "Bàn giao 07:00 hôm sau → 0 phút làm việc. Bàn giao 09:30 → 60 phút.",
              }}
              onExpand={() =>
                onOpenPercentile({
                  title: "Mức trễ bàn giao",
                  subtitle:
                    "Phân vị số phút trễ của các task bàn giao sang ngày khác, chỉ tính trong giờ làm việc.",
                  metricLabel: "Số phút trễ",
                  observations: sla.lateHandoffs.map((row) => ({
                    task: row.task,
                    value: row.minutes,
                  })),
                  unit: "minutes",
                })
              }
              onClick={() =>
                onOpenDetail({
                  title: "Task bàn giao trễ ngày",
                  subtitle:
                    "Các task tạo nên P50 và phân bổ mức độ trễ",
                  tasks: sla.lateHandoffs.map((row) => row.task),
                  taskMetric: {
                    label: "Số phút trễ",
                    value: handoffLateMinutes,
                    format: formatSlaMinutes,
                    describe: lateMinuteBucket,
                  },
                })
              }
            />
          </div>
          <HorizontalBars
            title="Mức độ trễ bàn giao"
            subtitle="PHÚT TRỄ TRONG GIỜ LÀM VIỆC"
            rows={sla.handoffLateDistribution}
            className="handoffLateChart"
            help={{
              title: "Mức độ trễ bàn giao",
              purpose:
                "Phân nhóm các task bàn giao sang ngày khác theo số phút làm việc bị trễ.",
              objective:
                "Nhận diện trễ chỉ mang tính qua ngày và các trường hợp thực sự chiếm thời gian của ca kế tiếp.",
              calculation:
                "Phút trễ tính từ 08:30 ngày làm việc kế tiếp, loại ngoài giờ, nghỉ trưa, Chủ nhật và ngày lễ.",
              example:
                "Task kiểm duyệt 07:00 hôm sau thuộc nhóm 0 phút; 10:00 thuộc nhóm 61–120 phút.",
            }}
            onSelect={(label) =>
              onOpenDetail({
                title: `Mức trễ · ${label}`,
                subtitle: "Task bàn giao trễ ngày trong cùng khoảng phút",
                tasks: sla.lateHandoffs
                  .filter(
                    (row) => lateMinuteBucket(row.minutes) === label,
                  )
                  .map((row) => row.task),
                taskMetric: {
                  label: "Số phút trễ",
                  value: handoffLateMinutes,
                  format: formatSlaMinutes,
                  describe: lateMinuteBucket,
                },
              })
            }
          />
        </section>

        <StaffTimeOfDayChart
          rows={sla.staffTimeOfDayRows}
          onSelect={(row, metric, tasks, context) => {
            const isInspection = metric === "inspection";
            const values = tasks
              .map((task) =>
                isInspection ? task.inspectionDate : task.completedDate,
              )
              .filter((value): value is Date => Boolean(value))
              .map(operationalMinute);
            onOpenDetail({
              title: `${isInspection ? "Giờ bàn giao" : "Giờ hoàn thành"} · ${row.name}`,
              subtitle: `${context} · P50 ${values.length ? formatOperationalTime(percentile(values, 0.5), true) : "—"} theo ngày vận hành 08:30–08:30`,
              tasks,
            });
          }}
        />

        <div className="slaMetrics">
          <SlaMetricCard
            kicker="CYCLE TIME"
            title="P50 hoàn thành"
            value={`${sla.cycleP50} ngày`}
            note={`P90: ${sla.cycleP90} ngày · ${formatNumber(sla.cycleRows.length)} task đủ ngày`}
            onExpand={() =>
              onOpenPercentile({
                title: "Cycle time hoàn thành",
                subtitle:
                  "Phân vị số ngày lịch từ Ngày Bắt Đầu đến Ngày Hoàn Thành.",
                metricLabel: "Cycle time",
                observations: sla.cycleRows.map((row) => ({
                  task: row.task,
                  value: row.days,
                })),
                unit: "days",
              })
            }
            onClick={() =>
              onOpenDetail({
                title: "Task có dữ liệu Cycle time",
                subtitle: "Hoàn thành trong kỳ và có Ngày Bắt Đầu",
                tasks: sla.cycleRows.map((row) => row.task),
              })
            }
          />
          <SlaMetricCard
            kicker="ĐỊNH MỨC 1.7"
            title="Độ phủ định mức tham chiếu"
            value={`${Math.round(sla.normCoverage)}%`}
            note={`${formatNumber(sla.normMapped)} / ${formatNumber(sla.normEligible)} task map được`}
            onClick={() =>
              onOpenDetail({
                title: "Task chưa có định mức",
                subtitle:
                  "Không tìm thấy Format Type/Công đoạn phù hợp trong sheet 1.7",
                tasks: sla.normRows
                  .filter((row) => row.normMinutes === null)
                  .map((row) => row.task),
              })
            }
          />
        </div>

        <div className="slaChartGrid cycleChartRow">
          <PieChart
            title="Cycle time theo ngày"
            data={sla.cycleDistribution}
            compact
            onSelect={(label) =>
              onOpenDetail({
                title: `Cycle time · ${label}`,
                subtitle: "Task hoàn thành trong kỳ",
                tasks: sla.cycleRows
                  .filter((row) => cycleBucket(row.days) === label)
                  .map((row) => row.task),
              })
            }
          />
        </div>

        <div className="slaChartGrid agingBacklogRow">
          <PieChart
            title="Aging task đang mở"
            data={sla.agingDistribution}
            compact
            hoverBreakdown={(label) => {
              const rows = sla.openAgingRows.filter(
                (row) => agingBucket(row.days) === label,
              );
              return {
                title: `${label} · phân bổ theo trạng thái`,
                data: groupCount(rows, (row) => row.task.status),
              };
            }}
            onSelect={(label) =>
              onOpenDetail({
                title: `Aging · ${label}`,
                subtitle: `Task đang mở tính đến mốc ${formatDate(inputDate(backlogDate))}`,
                tasks: sla.openAgingRows
                  .filter((row) => agingBucket(row.days) === label)
                  .map((row) => row.task),
              })
            }
          />
          <PieChart
            title="Trạng thái task tồn"
            data={backlog}
            compact
            hoverBreakdown={(label) => {
              const rows = sla.openAgingRows.filter((row) =>
                matchesGroup(row.task.status, label),
              );
              return {
                title: `${label} · phân bổ theo Aging`,
                data: groupCount(rows, (row) => agingBucket(row.days)),
              };
            }}
            help={{
              ...dashboardHelp("Trạng thái task tồn"),
              note: `Mốc task tồn đang chọn: ${formatDate(inputDate(backlogDate))}. Task chưa có ngày bắt đầu không nằm trong chỉ số này; trạng thái dùng là trạng thái hiện tại.`,
            }}
            onSelect={(label) =>
              onOpenDetail({
                title: `Task tồn · ${label}`,
                subtitle: `Task tồn trước mốc ${formatDate(inputDate(backlogDate))}`,
                tasks: backlogTasks.filter((task) =>
                  matchesGroup(task.status, label),
                ),
              })
            }
          />
        </div>

        <article className="checkingCard">
          <div className="checkingHeader">
            <div>
              <span className="chartKicker">CHECKING / REVIEWING</span>
              <h3>Tốc độ tiếp nhận và kiểm duyệt task</h3>
            </div>
            <small>
              Chỉ giữ luồng Checking → Done. Số phút tính trong giờ làm việc;
              P50 là trung vị và P90 là mức 90% task không vượt quá.
            </small>
            <HelpButton help={dashboardHelp("Checking → Done · P50")} />
          </div>
          <div className="checkingMetrics">
            <SlaMetricCard
              kicker="TOÀN BỘ THỜI GIAN KIỂM DUYỆT"
              title="Từ chuyển Checking đến hoàn thành"
              value={formatSlaMinutes(sla.checkingToDoneP50)}
              note={`50% task không vượt quá mức trên · 90% không vượt quá ${formatSlaMinutes(sla.checkingToDoneP90)} · Mẫu ${formatNumber(sla.checkingToDoneRows.length)} task`}
              help={dashboardHelp("Checking → Done · P50")}
              onExpand={() =>
                onOpenPercentile({
                  title: "Checking → hoàn thành",
                  subtitle:
                    "Toàn bộ thời gian kiểm duyệt trong giờ làm việc.",
                  metricLabel: "Thời gian Checking → Done",
                  observations: sla.checkingToDoneRows.map((row) => ({
                    task: row.task,
                    value: row.minutes,
                  })),
                  unit: "minutes",
                })
              }
              onClick={() =>
                onOpenDetail({
                  title: "Checking → Done",
                  subtitle: "Task hoàn thành trong kỳ có đủ hai mốc",
                  tasks: sla.checkingToDoneRows.map((row) => row.task),
                })
              }
            />
          </div>
        </article>

        <div className="slaChartGrid">
          <PieChart
            title="Đối chiếu kế hoạch với định mức 1.7"
            data={sla.normDistribution}
            compact
            onSelect={(label) =>
              onOpenDetail({
                title: `Kế hoạch phút · ${label}`,
                subtitle:
                  "Đối chiếu phút dự kiến với chuẩn tham chiếu theo Format Type/Công đoạn; không phải thời gian làm thực tế",
                tasks: sla.normRows
                  .filter((row) => row.label === label)
                  .map((row) => row.task),
              })
            }
          />
          <article className="normSummary">
            <HelpButton
              help={dashboardHelp(
                "Đối chiếu kế hoạch với định mức 1.7",
              )}
            />
            <span className="chartKicker">ĐỐI CHIẾU KẾ HOẠCH</span>
            <h3>Phút dự kiến và phút chuẩn tham chiếu</h3>
            <div className="normDisclaimer">
              <strong>Không phải đánh giá năng suất thực tế</strong>
              <span>
                Chưa có thời điểm bắt đầu và hoàn thành công việc thực tế, nên
                các số liệu dưới đây chỉ so sánh kế hoạch nhập trên Tasklist
                với bảng chuẩn 1.7.
              </span>
            </div>
            <div>
              <span>
                <small>PHÚT DỰ KIẾN TRÊN TASKLIST</small>
                <strong>{formatNumber(sla.normExpectedMinutes)}</strong>
                <em>{formatWorkDays(sla.normExpectedMinutes)}</em>
              </span>
              <span>
                <small>PHÚT CHUẨN THAM CHIẾU 1.7</small>
                <strong>{formatNumber(sla.normStandardMinutes)}</strong>
                <em>{formatWorkDays(sla.normStandardMinutes)}</em>
              </span>
            </div>
            <p>
              Chỉ đối chiếu các task map được Format Type và Công đoạn. Quy
              đổi 480 phút bằng một ngày công chỉ để dễ đọc tổng tải kế hoạch,
              không phải số ngày làm thực tế.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
