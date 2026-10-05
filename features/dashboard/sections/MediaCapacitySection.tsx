import { useMemo, useState } from "react";
import { inputDate } from "@/shared/date/dateUtils";
import { formatDate, formatHours, formatNumber } from "@/shared/formatting/format";
import type { MediaCapacityStats } from "../analytics/calculateMediaCapacity";
import { calculateMediaCapacity, calculateMediaTrendSeries, calculateShootTypeBaselinePlan } from "../analytics/calculateMediaCapacity";
import type { DashboardData, DetailView, Task } from "../model/types";
import { capacityHelp } from "./capacity/capacityHelp";
import { detailWithStandardMinutes, formatRate, formatMetric, granularityLabel, uniqueTasks } from "./capacity/capacityFormat";
import { toInputDate, flowRangeFromGlobal, trendGranularityFor, presetStart, typeRangeFromGlobal } from "./capacity/capacityRanges";
import type { TrendPreset } from "./capacity/capacityRanges";
import { FlowBreakdownButton, CapacityFlowCard } from "./capacity/CapacityFlowCard";
import { ShootTypeBaselineChart } from "./capacity/ShootTypeBaselineChart";
import { StaffParticipationChart } from "./capacity/StaffParticipationChart";
import { CapacityTrend } from "./capacity/CapacityTrend";


type MediaCapacitySectionProps = {
  data: DashboardData;
  viewModel: MediaCapacityStats;
  globalDateFrom: string;
  globalDateTo: string;
  onOpenDetail: (detail: DetailView) => void;
};

export function MediaCapacitySection({
  data,
  viewModel,
  globalDateFrom,
  globalDateTo,
  onOpenDetail,
}: MediaCapacitySectionProps) {
  const commonFlowRange = useMemo(
    () => flowRangeFromGlobal(globalDateFrom, globalDateTo),
    [globalDateFrom, globalDateTo],
  );
  const flowRangeKey = `${commonFlowRange.from}|${commonFlowRange.to}`;
  const [flowRangeInput, setFlowRangeInput] = useState(() => ({
    sourceKey: flowRangeKey,
    ...commonFlowRange,
  }));
  const activeFlowRange =
    flowRangeInput.sourceKey === flowRangeKey
      ? flowRangeInput
      : commonFlowRange;
  const flowDateFrom = activeFlowRange.from;
  const flowDateTo = activeFlowRange.to;
  // Memo theo chuỗi ngày: Date mới mỗi lần render sẽ làm các useMemo bên dưới
  // luôn tính lại (calculateMediaCapacity rất nặng).
  const flowRangeStart = useMemo(() => inputDate(flowDateFrom), [flowDateFrom]);
  const flowRangeEnd = useMemo(() => inputDate(flowDateTo, true), [flowDateTo]);
  const invalidFlowRange = Boolean(
    flowRangeStart &&
      flowRangeEnd &&
      flowRangeStart > flowRangeEnd,
  );
  const flowViewModel = useMemo(
    () =>
      !invalidFlowRange && flowRangeStart && flowRangeEnd
        ? calculateMediaCapacity(
            data,
            flowRangeEnd,
            new Date(),
            { from: flowRangeStart, to: flowRangeEnd },
          )
        : viewModel,
    [
      data,
      flowRangeEnd,
      flowRangeStart,
      invalidFlowRange,
      viewModel,
    ],
  );
  const {
    focusWeek,
    focusFullWeek,
    officialBaseline,
    forecastOutputCount,
    isCompleteWeek,
    standardMinutes,
  } = flowViewModel;
  const baselineDateFrom = toInputDate(
    officialBaseline.weeks[0]?.start ?? null,
  );
  const baselineDateTo = toInputDate(
    officialBaseline.weeks.at(-1)?.end ?? null,
  );
  const sessionDates = useMemo(
    () =>
      viewModel.shootTypeSessions
        .flatMap((session) => (session.date ? [session.date] : []))
        .sort((left, right) => left.getTime() - right.getTime()),
    [viewModel.shootTypeSessions],
  );
  const dataDateFrom = toInputDate(sessionDates[0] ?? null);
  const dataDateTo = toInputDate(sessionDates.at(-1) ?? null);
  const commonTypeRange = useMemo(
    () =>
      typeRangeFromGlobal({
        globalDateFrom,
        globalDateTo,
        baselineDateFrom,
        baselineDateTo,
        dataDateFrom,
        dataDateTo,
      }),
    [
      globalDateFrom,
      globalDateTo,
      baselineDateFrom,
      baselineDateTo,
      dataDateFrom,
      dataDateTo,
    ],
  );
  const typeRangeKey = `${commonTypeRange.from}|${commonTypeRange.to}`;
  const [typeRangeInput, setTypeRangeInput] = useState(() => ({
    sourceKey: typeRangeKey,
    ...commonTypeRange,
  }));
  const activeTypeRange =
    typeRangeInput.sourceKey === typeRangeKey
      ? typeRangeInput
      : commonTypeRange;
  const typeDateFrom = activeTypeRange.from;
  const typeDateTo = activeTypeRange.to;
  const setTypeDateFrom = (from: string) =>
    setTypeRangeInput({ sourceKey: typeRangeKey, from, to: typeDateTo });
  const setTypeDateTo = (to: string) =>
    setTypeRangeInput({ sourceKey: typeRangeKey, from: typeDateFrom, to });
  const typeRangeStart = useMemo(() => inputDate(typeDateFrom), [typeDateFrom]);
  const typeRangeEnd = useMemo(() => inputDate(typeDateTo, true), [typeDateTo]);
  const invalidTypeRange = Boolean(
    typeRangeStart &&
      typeRangeEnd &&
      typeRangeStart > typeRangeEnd,
  );
  const typeBaselinePlan = useMemo(
    () =>
      invalidTypeRange
        ? calculateShootTypeBaselinePlan([], null, null)
        : calculateShootTypeBaselinePlan(
            viewModel.shootTypeSessions,
            typeRangeStart,
            typeRangeEnd,
          ),
    [
      invalidTypeRange,
      typeRangeEnd,
      typeRangeStart,
      viewModel.shootTypeSessions,
    ],
  );
  const typeBaselineSessions = typeBaselinePlan.sessions;
  const typeBaselineSessionUnits = typeBaselinePlan.rows.reduce(
    (total, row) => total + row.sessionUnits,
    0,
  );
  const trendDataFrom = toInputDate(viewModel.trendDateRange.from);
  const trendDataTo = toInputDate(viewModel.trendDateRange.to);
  const trendAnchor = useMemo(
    () => inputDate(globalDateTo || trendDataTo) ?? new Date(),
    [globalDateTo, trendDataTo],
  );
  const trendAllStart = useMemo(
    () => inputDate(trendDataFrom) ?? trendAnchor,
    [trendAnchor, trendDataFrom],
  );
  const [trendPreset, setTrendPreset] = useState<TrendPreset>("3m");
  const defaultTrendRange = useMemo(
    () => ({
      from: globalDateFrom || trendDataFrom,
      to: globalDateTo || trendDataTo,
    }),
    [globalDateFrom, globalDateTo, trendDataFrom, trendDataTo],
  );
  const trendRangeKey = `${defaultTrendRange.from}|${defaultTrendRange.to}`;
  const [trendCustomInput, setTrendCustomInput] = useState(() => ({
    sourceKey: trendRangeKey,
    ...defaultTrendRange,
  }));
  const activeTrendCustomRange =
    trendCustomInput.sourceKey === trendRangeKey
      ? trendCustomInput
      : defaultTrendRange;
  const trendCustomFrom = activeTrendCustomRange.from;
  const trendCustomTo = activeTrendCustomRange.to;
  const setTrendCustomFrom = (from: string) =>
    setTrendCustomInput({
      sourceKey: trendRangeKey,
      from,
      to: trendCustomTo,
    });
  const setTrendCustomTo = (to: string) =>
    setTrendCustomInput({
      sourceKey: trendRangeKey,
      from: trendCustomFrom,
      to,
    });
  const trendRange = useMemo(() => {
    if (trendPreset === "custom") {
      return {
        from: trendCustomFrom,
        to: trendCustomTo,
      };
    }
    return {
      from: toInputDate(
        presetStart(trendPreset, trendAnchor, trendAllStart),
      ),
      to: toInputDate(trendAnchor),
    };
  }, [
    trendAllStart,
    trendAnchor,
    trendCustomFrom,
    trendCustomTo,
    trendPreset,
  ]);
  const trendRangeStart = useMemo(
    () => inputDate(trendRange.from),
    [trendRange.from],
  );
  const trendRangeEnd = useMemo(
    () => inputDate(trendRange.to, true),
    [trendRange.to],
  );
  const invalidTrendRange = Boolean(
    !trendRangeStart ||
      !trendRangeEnd ||
      trendRangeStart > trendRangeEnd,
  );
  const trendGranularity = trendRangeStart && trendRangeEnd
    ? trendGranularityFor(
        trendPreset,
        trendRangeStart,
        trendRangeEnd,
      )
    : "week";
  const trendSeries = useMemo(
    () =>
      invalidTrendRange
        ? calculateMediaTrendSeries(
            [],
            null,
            null,
            trendGranularity,
          )
        : calculateMediaTrendSeries(
            viewModel.trendEvents,
            trendRangeStart,
            trendRangeEnd,
            trendGranularity,
          ),
    [
      invalidTrendRange,
      trendGranularity,
      trendRangeEnd,
      trendRangeStart,
      viewModel.trendEvents,
    ],
  );
  const shootCoverage = focusWeek.shootTasks.length
    ? (focusWeek.linkedShootTasks.length / focusWeek.shootTasks.length) *
      100
    : 0;
  const shootWorkPool =
    focusWeek.shootOpeningBacklogTasks.length +
    focusWeek.shootTasks.length;
  const outputWorkPool =
    focusWeek.outputOpeningBacklogTasks.length +
    focusWeek.outputStartedTasks.length;
  const openStandardTasks = (
    title: string,
    subtitle: string,
    tasks: Task[],
  ) =>
    onOpenDetail(
      detailWithStandardMinutes(
        title,
        subtitle,
        tasks,
        standardMinutes,
      ),
    );
  return (
    <>
      <header className="dashboardGroupHeader capacityGroupHeader">
        <span>04</span>
        <div>
          <p>CÔNG SUẤT MEDIA</p>
          <h2>Khả năng quay/chụp &amp; đầu ra ấn phẩm</h2>
        </div>
      </header>
      <section className="mediaCapacitySection fullWidth groupCapacity">
        <div className="mediaCapacityHeader">
          <div>
            <span className="chartKicker">
              KHOẢNG {focusWeek.label}
            </span>
            <h2>Baseline Media v1 · nhịp sản xuất theo kỳ</h2>
            <p>
              Chuẩn P50 được khóa theo tháng từ 12 tuần hoàn chỉnh trước
              đó. Ba lớp bên dưới tính theo khoảng riêng đang chọn; nếu
              khoảng còn đang chạy, hệ thống tách thực tế đến hôm nay và
              dự báo đến cuối khoảng để tránh kết luận sớm.
            </p>
          </div>
          <div className="capacityFlowHeaderTools">
            <div className="capacityTypeDateFilters">
              <label>
                Từ ngày
                <input
                  type="date"
                  value={flowDateFrom}
                  max={flowDateTo || undefined}
                  onChange={(event) =>
                    setFlowRangeInput({
                      sourceKey: flowRangeKey,
                      from: event.target.value,
                      to: flowDateTo,
                    })
                  }
                />
              </label>
              <span>→</span>
              <label>
                Đến ngày
                <input
                  type="date"
                  value={flowDateTo}
                  min={flowDateFrom || undefined}
                  onChange={(event) =>
                    setFlowRangeInput({
                      sourceKey: flowRangeKey,
                      from: flowDateFrom,
                      to: event.target.value,
                    })
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setFlowRangeInput({
                    sourceKey: flowRangeKey,
                    ...commonFlowRange,
                  })
                }
              >
                Theo bộ lọc tổng
              </button>
            </div>
            <div className="capacityLockSummary">
              <span>BASELINE {officialBaseline.versionLabel}</span>
              <strong>P50 khóa theo tháng</strong>
              <small>
                {officialBaseline.windowLabel} ·{" "}
                {formatNumber(officialBaseline.sessionWeekCount)} tuần lịch
                quay · {formatNumber(officialBaseline.outputWeekCount)} tuần
                đầu ra
              </small>
            </div>
          </div>
        </div>
        {invalidFlowRange && (
          <p className="capacityFlowRangeError">
            Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.
          </p>
        )}

        <div className="capacityFlowIntro">
          <div>
            <span className="chartKicker">MẪU SỐ CHUNG THEO KỲ</span>
            <h3>Luồng công việc &amp; nguồn lực trong kỳ</h3>
          </div>
          <p>
            Hai đầu theo dõi tồn đầu kỳ, phát sinh, bàn giao và tồn cuối
            kỳ. Card giữa thể hiện nguồn lực quay thực tế, không phải bước
            chuyển đổi trực tiếp.
          </p>
        </div>
        <div className="capacityFlowGrid">
          <CapacityFlowCard
            type="demand"
            kicker="01 · HÀNG CHỜ QUAY"
            title="Tổng task cần xử lý"
            primaryValue={shootWorkPool}
            primaryUnit="task"
            reference={officialBaseline.demandReference}
            forecastValue={
              focusWeek.shootOpeningBacklogTasks.length +
              focusFullWeek.shootTasks.length
            }
            completeWeek={isCompleteWeek}
            baselineLabel={`baseline ${officialBaseline.versionLabel}`}
            onOpenBaseline={() =>
              openStandardTasks(
                `Task Quay/Chụp tạo baseline ${officialBaseline.versionLabel}`,
                `${officialBaseline.windowLabel} · tồn đầu tuần cộng task mới trong tuần`,
                uniqueTasks(
                  officialBaseline.weeks.flatMap((week) => [
                    ...week.shootOpeningBacklogTasks,
                    ...week.shootTasks,
                  ]),
                ),
              )
            }
            help={capacityHelp.demand}
            onClick={() =>
              openStandardTasks(
                `Tổng task Quay/Chụp cần xử lý · ${focusWeek.label}`,
                "Tồn đầu kỳ cộng task có Ngày Bắt Đầu trong kỳ",
                [
                  ...focusWeek.shootOpeningBacklogTasks,
                  ...focusWeek.shootTasks,
                ],
              )
            }
          >
            <FlowBreakdownButton
              className="flowOpening"
              onClick={() =>
                openStandardTasks(
                  `Task Quay/Chụp tồn đầu kỳ · ${focusWeek.label}`,
                  "Đã bắt đầu trước kỳ và chưa được kiểm duyệt trước đầu kỳ",
                  focusWeek.shootOpeningBacklogTasks,
                )
              }
            >
              <b>{formatNumber(focusWeek.shootOpeningBacklogTasks.length)}</b>
              tồn đầu kỳ
            </FlowBreakdownButton>
            <FlowBreakdownButton
              className="flowAdded"
              onClick={() =>
                openStandardTasks(
                  `Task Quay/Chụp mới trong kỳ · ${focusWeek.label}`,
                  "Task có Ngày Bắt Đầu nằm trong khoảng đang chọn",
                  focusWeek.shootTasks,
                )
              }
            >
              <b>+{formatNumber(focusWeek.shootTasks.length)}</b>
              task mới trong kỳ
            </FlowBreakdownButton>
            <FlowBreakdownButton
              className="flowRemoved"
              onClick={() =>
                openStandardTasks(
                  `Task Quay/Chụp đã bàn giao · ${focusWeek.label}`,
                  "Task có Ngày Kiểm Duyệt trong kỳ, gồm task tồn và task mới",
                  focusWeek.shootHandedTasks,
                )
              }
            >
              <b>−{formatNumber(focusWeek.shootHandedTasks.length)}</b>
              đã bàn giao · {formatNumber(focusWeek.shootHandedCarryTasks.length)} tồn + {formatNumber(focusWeek.shootHandedNewTasks.length)} mới
            </FlowBreakdownButton>
            <FlowBreakdownButton
              className="flowClosing"
              onClick={() =>
                openStandardTasks(
                  `Task Quay/Chụp còn tồn cuối kỳ · ${focusWeek.label}`,
                  "Tồn đầu kỳ cộng task mới nhưng chưa được kiểm duyệt tại cuối kỳ",
                  focusWeek.shootClosingBacklogTasks,
                )
              }
            >
              <b>{formatNumber(focusWeek.shootClosingBacklogTasks.length)}</b>
              còn tồn tại cuối kỳ
            </FlowBreakdownButton>
            <FlowBreakdownButton
              onClick={() =>
                openStandardTasks(
                  `Task mới đã có Ca Quay · ${focusWeek.label}`,
                  "Task Quay/Chụp mới trong kỳ có giá trị tại cột Ca Quay",
                  focusWeek.linkedShootTasks,
                )
              }
            >
              <b>{formatRate(shootCoverage)}</b>
              task mới đã có Ca Quay
            </FlowBreakdownButton>
          </CapacityFlowCard>

          <CapacityFlowCard
            type="sessions"
            kicker="02 · NĂNG LỰC QUAY"
            title="Buổi quay 4 giờ"
            primaryValue={focusWeek.sessionUnits}
            primaryUnit="buổi"
            reference={officialBaseline.sessionReference}
            forecastValue={focusFullWeek.sessionUnits}
            completeWeek={isCompleteWeek}
            baselineLabel={`baseline ${officialBaseline.versionLabel}`}
            onOpenBaseline={() =>
              onOpenDetail({
                title: `Ca quay tạo baseline ${officialBaseline.versionLabel}`,
                subtitle: `${officialBaseline.windowLabel} · chỉ các tuần hoàn chỉnh trước tháng báo cáo`,
                shootSessions: officialBaseline.weeks.flatMap(
                  (week) => week.shootSessions,
                ),
              })
            }
            help={capacityHelp.sessions}
            onClick={() =>
              onOpenDetail({
                title: `Lịch quay · ${focusWeek.label}`,
                subtitle:
                  "Ca có Ngày Quay trong tuần; Một buổi = 4 giờ, Một ngày = 2 buổi",
                shootSessions: focusWeek.shootSessions,
              })
            }
          >
            <FlowBreakdownButton
              onClick={() =>
                onOpenDetail({
                  title: `Task đã xếp ca · ${focusWeek.label}`,
                  subtitle:
                    "Các ca quay trong kỳ; ảnh và video manocanh cùng mã trong cùng ca được tính chung 1 task, bảng vẫn giữ đủ hai dòng dẫn chứng",
                  shootSessions: focusFullWeek.shootSessions,
                })
              }
            >
              <b>{formatNumber(focusFullWeek.scheduledTaskCount)}</b>
              task đã xếp cả tuần · P50{" "}
              {formatMetric(officialBaseline.scheduledTaskReference.p50)}
            </FlowBreakdownButton>
            <FlowBreakdownButton
              onClick={() =>
                onOpenDetail({
                  title: `Mã sản phẩm đã xếp ca · ${focusWeek.label}`,
                  subtitle:
                    "Hợp mã sản phẩm không trùng từ các ca quay trong kỳ",
                  shootSessions: focusFullWeek.shootSessions,
                })
              }
            >
              <b>{formatNumber(focusFullWeek.uniqueProductCount)}</b>
              mã đã xếp cả tuần · P50{" "}
              {formatMetric(officialBaseline.productReference.p50)}
            </FlowBreakdownButton>
            <FlowBreakdownButton
              onClick={() =>
                onOpenDetail({
                  title: `Nhân sự tham gia ca quay · ${focusWeek.label}`,
                  subtitle:
                    "Danh sách nhân sự không trùng từ các ca quay trong kỳ",
                  shootSessions: focusFullWeek.shootSessions,
                })
              }
            >
              <b>{formatNumber(focusFullWeek.uniqueStaffCount)}</b>
              {focusFullWeek.uniqueStaffCount
                ? ` nhân sự · P50 ${formatMetric(officialBaseline.uniqueStaffReference.p50)}`
                : " chưa có dữ liệu nhân sự ca quay"}
            </FlowBreakdownButton>
          </CapacityFlowCard>

          <CapacityFlowCard
            type="outputs"
            kicker="03 · ĐẦU RA"
            title="Ấn phẩm đã bàn giao"
            primaryValue={focusWeek.outputTasks.length}
            primaryUnit={`trên ${formatNumber(outputWorkPool)} cần xử lý`}
            reference={officialBaseline.outputReference}
            forecastValue={forecastOutputCount}
            completeWeek={isCompleteWeek}
            baselineLabel={`baseline ${officialBaseline.versionLabel}`}
            onOpenBaseline={() =>
              openStandardTasks(
                `Ấn phẩm tạo baseline ${officialBaseline.versionLabel}`,
                `${officialBaseline.windowLabel} · chỉ các tuần hoàn chỉnh trước tháng báo cáo`,
                officialBaseline.weeks.flatMap(
                  (week) => week.outputTasks,
                ),
              )
            }
            help={capacityHelp.outputCount}
            onClick={() =>
              openStandardTasks(
                `Ấn phẩm bàn giao · ${focusWeek.label}`,
                "Task ấn phẩm có Ngày Kiểm Duyệt trong tuần",
                focusWeek.outputTasks,
              )
            }
          >
            <FlowBreakdownButton
              className="flowOpening"
              onClick={() =>
                openStandardTasks(
                  `Ấn phẩm tồn đầu kỳ · ${focusWeek.label}`,
                  "Task ấn phẩm bắt đầu trước kỳ và chưa được kiểm duyệt trước đầu kỳ",
                  focusWeek.outputOpeningBacklogTasks,
                )
              }
            >
              <b>{formatNumber(focusWeek.outputOpeningBacklogTasks.length)}</b>
              tồn đầu kỳ
            </FlowBreakdownButton>
            <FlowBreakdownButton
              className="flowAdded"
              onClick={() =>
                openStandardTasks(
                  `Task ấn phẩm mới trong kỳ · ${focusWeek.label}`,
                  "Task Video–Edit hoặc Graphic–Graphic Design có Ngày Bắt Đầu trong kỳ",
                  focusWeek.outputStartedTasks,
                )
              }
            >
              <b>+{formatNumber(focusWeek.outputStartedTasks.length)}</b>
              task ấn phẩm mới trong kỳ
            </FlowBreakdownButton>
            <FlowBreakdownButton
              className="flowRemoved"
              onClick={() =>
                openStandardTasks(
                  `Ấn phẩm đã bàn giao · ${focusWeek.label}`,
                  "Task ấn phẩm có Ngày Kiểm Duyệt trong kỳ",
                  focusWeek.outputTasks,
                )
              }
            >
              <b>−{formatNumber(focusWeek.outputTasks.length)}</b>
              đã bàn giao · {formatNumber(focusWeek.outputHandedCarryTasks.length)} tồn + {formatNumber(focusWeek.outputHandedNewTasks.length)} mới
            </FlowBreakdownButton>
            <FlowBreakdownButton
              className="flowClosing"
              onClick={() =>
                openStandardTasks(
                  `Ấn phẩm còn tồn cuối kỳ · ${focusWeek.label}`,
                  "Tồn đầu kỳ cộng task mới nhưng chưa được kiểm duyệt tại cuối kỳ",
                  focusWeek.outputClosingBacklogTasks,
                )
              }
            >
              <b>{formatNumber(focusWeek.outputClosingBacklogTasks.length)}</b>
              còn tồn tại cuối kỳ
            </FlowBreakdownButton>
            <div className="capacityFlowBreakdownCluster">
              <FlowBreakdownButton
                onClick={() =>
                  openStandardTasks(
                    `Video đã bàn giao · ${focusWeek.label}`,
                    "Task Video–Edit có Ngày Kiểm Duyệt trong kỳ",
                    focusWeek.videoTasks,
                  )
                }
              >
                <b>{formatNumber(focusWeek.videoTasks.length)}</b> Video
              </FlowBreakdownButton>
              <FlowBreakdownButton
                onClick={() =>
                  openStandardTasks(
                    `Graphic đã bàn giao · ${focusWeek.label}`,
                    "Task Graphic–Graphic Design có Ngày Kiểm Duyệt trong kỳ",
                    focusWeek.graphicTasks,
                  )
                }
              >
                <b>{formatNumber(focusWeek.graphicTasks.length)}</b> Graphic
              </FlowBreakdownButton>
              <FlowBreakdownButton
                onClick={() =>
                  openStandardTasks(
                    `Tải chuẩn ấn phẩm bàn giao · ${focusWeek.label}`,
                    "Tổng phút định mức của các ấn phẩm có Ngày Kiểm Duyệt trong kỳ",
                    focusWeek.outputTasks,
                  )
                }
              >
                {formatHours(focusWeek.outputMinutes)} tải chuẩn
              </FlowBreakdownButton>
            </div>
          </CapacityFlowCard>
        </div>

        <ShootTypeBaselineChart
          plan={typeBaselinePlan}
          dateFrom={typeDateFrom}
          dateTo={typeDateTo}
          sessionCount={typeBaselineSessions.length}
          sessionUnits={typeBaselineSessionUnits}
          invalidRange={invalidTypeRange}
          onDateFromChange={setTypeDateFrom}
          onDateToChange={setTypeDateTo}
          onResetRange={() =>
            setTypeRangeInput({
              sourceKey: typeRangeKey,
              ...commonTypeRange,
            })
          }
          onSelectAll={() =>
            onOpenDetail({
              title: "Dữ liệu tạo baseline tổng hợp",
              subtitle: `${formatDate(typeRangeStart)}–${formatDate(typeRangeEnd)} · P50 chung ${formatMetric(typeBaselinePlan.overallTaskPerSessionP50)} task/buổi · ${formatMetric(typeBaselinePlan.overallTaskPerStaffSessionP50)} task/người/buổi · baseline tuần ${formatMetric(typeBaselinePlan.weeklyTaskBaseline)} task`,
              shootSessions: typeBaselinePlan.sessions,
            })
          }
          onSelect={(row) =>
            onOpenDetail({
              title: `${row.type} · baseline linh động`,
              subtitle: `${formatDate(typeRangeStart)}–${formatDate(typeRangeEnd)} · ${formatMetric(row.sessionUnits)} buổi mẫu · P50 ${formatMetric(row.taskPerSessionP50)} task/buổi · ${formatMetric(row.productPerSessionP50)} mã/buổi · ${formatMetric(row.taskPerStaffSessionP50)} task/người/buổi`,
              shootSessions: row.sessions,
            })
          }
        />

        <StaffParticipationChart
          sessions={typeBaselineSessions}
          tasks={data.tasks}
          dateFrom={typeRangeStart}
          dateTo={typeRangeEnd}
          onSelectPoint={(staffName, session, staffTasks, minutes) => {
            onOpenDetail({
              title:
                "Task " + staffName + " thực hiện · " + session.id,
              subtitle:
                formatDate(session.date) +
                " · " +
                (session.type || "Chưa phân loại") +
                " · " +
                formatNumber(staffTasks.length) +
                " task · " +
                formatMetric(minutes) +
                " phút dự kiến",
              tasks: staffTasks,
            });
          }}
        />

        <CapacityTrend
          rows={trendSeries.rows}
          shootReference={trendSeries.shootReference}
          outputReference={trendSeries.outputReference}
          totalReference={trendSeries.totalReference}
          preset={trendPreset}
          dateFrom={trendRange.from}
          dateTo={trendRange.to}
          granularity={trendGranularity}
          invalidRange={invalidTrendRange}
          onPresetChange={setTrendPreset}
          onDateFromChange={setTrendCustomFrom}
          onDateToChange={setTrendCustomTo}
          onSelect={(bucket, metric) =>
            openStandardTasks(
              `${metric === "shoot" ? "Quay/Chụp" : metric === "output" ? "Bàn giao" : "Tổng tải chuẩn"} · ${bucket.label}`,
              metric === "shoot"
                ? `Task Quay/Chụp phân theo ${granularityLabel(trendGranularity)} bằng Ngày Bắt Đầu`
                : metric === "output"
                  ? `Task ấn phẩm phân theo ${granularityLabel(trendGranularity)} bằng Ngày Kiểm Duyệt`
                  : `Hợp không trùng của task Quay/Chụp và Bàn giao trong ${granularityLabel(trendGranularity)}; giá trị trên chart vẫn là tổng giờ chuẩn của hai công đoạn`,
              metric === "shoot"
                ? bucket.shootTasks
                : metric === "output"
                  ? bucket.outputTasks
                  : uniqueTasks([
                      ...bucket.shootTasks,
                      ...bucket.outputTasks,
                    ]),
            )
          }
        />

        <div className="capacityMethodNote">
          <span>MỐC ĐANG DÙNG</span>
          <p>
            Baseline {officialBaseline.versionLabel} dùng 12 tuần hoàn
            chỉnh {officialBaseline.windowLabel}, yêu cầu tối thiểu 8 tuần
            hợp lệ và được chuẩn hóa theo số ngày làm việc Thứ Hai–Thứ
            Bảy, trừ ngày lễ Việt Nam. Nhu cầu dùng Ngày Bắt Đầu; lịch
            quay dùng sheet 2.11; đầu ra dùng Ngày Kiểm Duyệt.
          </p>
          <small>
            Dữ liệu đến {formatDate(viewModel.asOfDate)}
          </small>
        </div>
      </section>
    </>
  );
}
