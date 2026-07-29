import { formatDate, formatHours, formatNumber, formatPercent } from "@/shared/formatting/format";
import type {
  CapacityReference,
  MediaCapacityStats,
  MediaCapacityWeek,
} from "../analytics/calculateMediaCapacity";
import { HelpButton } from "../components/HelpButton";
import type { DashboardHelp, DetailView, Task } from "../model/types";

type MediaCapacitySectionProps = {
  viewModel: MediaCapacityStats;
  onOpenDetail: (detail: DetailView) => void;
};

const capacityHelp: Record<
  "shoot" | "output" | "trend" | "mix" | "quality",
  DashboardHelp
> = {
  shoot: {
    title: "Công suất quay/chụp ước tính",
    purpose:
      "So sánh tải quay/chụp được phân vào tuần với nhịp chuẩn lịch sử của team.",
    objective:
      "Nhận diện tuần có kế hoạch quay/chụp thấp, nằm trong vùng thông thường hoặc vượt tải.",
    calculation:
      "Lấy task nội bộ có Công đoạn Quay/Chụp và Ngày Bắt Đầu thuộc tuần. Map Format Type sang phút quay/chụp của bảng định mức 1.7, sau đó so với P25–P75 trên mỗi ngày làm việc của 8 tuần trước.",
    example:
      "Tuần có 4.800 phút chuẩn, vùng lịch sử là 4.200–5.100 phút → nằm trong vùng thông thường.",
    note:
      "Đây là ước tính theo Ngày Bắt Đầu, chưa phải sản lượng quay thực tế vì file chưa có Ngày Quay Thực Tế.",
  },
  output: {
    title: "Công suất bàn giao ấn phẩm",
    purpose:
      "Đo khối lượng Video và Graphic được người làm bàn giao trong tuần.",
    objective:
      "Cho biết đầu ra của team đang thấp, bình thường hay cao hơn nhịp lịch sử.",
    calculation:
      "Lấy task Video–Edit hoặc Graphic–Graphic Design có Ngày Kiểm Duyệt trong tuần, loại Outsource và Pending/Cancel; cộng phút chuẩn 1.7 rồi so với P25–P75 của 8 tuần trước.",
    example:
      "Tuần bàn giao 6.000 phút chuẩn, P50 lịch sử là 5.400 phút → đạt 111,1% mức tham chiếu.",
    note:
      "Ngày Kiểm Duyệt là mốc bàn giao của người thực hiện; không dùng Ngày Hoàn Thành vì còn phụ thuộc người đánh giá.",
  },
  trend: {
    title: "Xu hướng công suất 12 tuần",
    purpose:
      "Đặt tải quay/chụp và đầu ra ấn phẩm trên cùng trục thời gian.",
    objective:
      "Phát hiện xu hướng tăng/giảm, độ trễ giữa tuần quay và tuần trả ấn phẩm, cùng các tuần bất thường.",
    calculation:
      "Mỗi điểm là tổng giờ chuẩn của tuần tương ứng. Quay/Chụp dùng Ngày Bắt Đầu làm mốc ước tính; Bàn giao dùng Ngày Kiểm Duyệt.",
    example:
      "Tuần 1 tải quay tăng mạnh nhưng đầu ra chỉ tăng ở tuần 2 có thể phản ánh độ trễ sản xuất.",
    note:
      "Nhấn từng điểm để mở đúng danh sách task của tuần và chuỗi dữ liệu đã chọn.",
  },
  mix: {
    title: "Cơ cấu sản lượng bàn giao",
    purpose:
      "Cho biết đầu ra tuần đang nghiêng về Video hay Graphic.",
    objective:
      "Giải thích vì sao hai tuần có cùng số task nhưng khối lượng phút chuẩn khác nhau.",
    calculation:
      "Trên cùng tập task có Ngày Kiểm Duyệt trong tuần, Video là Format Type chứa Video và Công đoạn Edit; phần còn lại là Graphic Design.",
    example:
      "80 Video và 20 Graphic trên tổng 100 đầu ra → tỷ trọng lần lượt 80% và 20%.",
  },
  quality: {
    title: "Sản lượng và kiểm soát bàn giao",
    purpose:
      "Đặt số ấn phẩm bàn giao cạnh kết quả đúng hạn và phản hồi trả về.",
    objective:
      "Tránh kết luận tuần vượt công suất là tốt nếu tỷ lệ trễ hoặc số lần trả về cũng tăng.",
    calculation:
      "Phân nhóm task đầu ra theo cột Đánh Giá Bàn Giao: đúng hạn, trễ/quá hạn và chưa đủ đánh giá. Số lần trả về lấy từ sheet 2.9 trong đúng tuần và đúng các task đầu ra này.",
    example:
      "100 task bàn giao gồm 78 đúng hạn, 15 trễ và 7 chưa đủ đánh giá; có 12 lượt trả về.",
    note:
      "Chỉ số này phản ánh tín hiệu kiểm soát, chưa thay thế đánh giá chất lượng nội dung chuyên môn.",
  },
};

function detailWithStandardMinutes(
  title: string,
  subtitle: string,
  tasks: Task[],
  standardMinutes: Map<Task, number>,
): DetailView {
  return {
    title,
    subtitle,
    tasks,
    taskMetric: {
      label: "Phút chuẩn 1.7",
      value: (task) => standardMinutes.get(task) ?? 0,
      format: (value) => `${formatNumber(value)} phút`,
      describe: (value) =>
        value ? "Map được định mức" : "Chưa map được định mức",
    },
  };
}

function statusCopy(reference: CapacityReference) {
  if (reference.bandStatus === "below") {
    return { label: "Dưới vùng thường", className: "below" };
  }
  if (reference.bandStatus === "above") {
    return { label: "Vượt vùng thường", className: "above" };
  }
  if (reference.bandStatus === "within") {
    return { label: "Trong vùng thường", className: "within" };
  }
  return { label: "Chưa đủ baseline", className: "unavailable" };
}

function CapacityCard({
  type,
  title,
  actualMinutes,
  taskCount,
  mappedCount,
  reference,
  onClick,
}: {
  type: "shoot" | "output";
  title: string;
  actualMinutes: number;
  taskCount: number;
  mappedCount: number;
  reference: CapacityReference;
  onClick: () => void;
}) {
  const status = statusCopy(reference);
  const max = Math.max(
    actualMinutes,
    reference.p75Minutes,
    reference.p50Minutes,
    1,
  );
  const percentage = Math.min(100, (actualMinutes / max) * 100);
  const p25 = (reference.p25Minutes / max) * 100;
  const p75 = (reference.p75Minutes / max) * 100;
  const p50 = (reference.p50Minutes / max) * 100;

  return (
    <article className={`capacityMetricCard ${type}`}>
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">
            {type === "shoot" ? "QUAY / CHỤP" : "ĐẦU RA"}
          </span>
          <h3>{title}</h3>
        </div>
        <HelpButton help={capacityHelp[type]} />
      </div>
      <button
        type="button"
        className="capacityMetricBody"
        onClick={onClick}
      >
        <div className="capacityMetricValue">
          <strong>{formatHours(actualMinutes)}</strong>
          <span className={`capacityBandStatus ${status.className}`}>
            {status.label}
          </span>
        </div>
        <p>
          {formatNumber(taskCount)} task · {formatNumber(mappedCount)} map
          được định mức
        </p>
        <div className="capacityBullet" aria-hidden="true">
          {reference.p75Minutes > 0 && (
            <i
              className="capacityReferenceBand"
              style={{
                left: `${p25}%`,
                width: `${Math.max(0, p75 - p25)}%`,
              }}
            />
          )}
          <b style={{ width: `${percentage}%` }} />
          {reference.p50Minutes > 0 && (
            <em style={{ left: `${p50}%` }} />
          )}
        </div>
        <div className="capacityReferenceCopy">
          <span>
            P25 {formatHours(reference.p25Minutes)}
          </span>
          <strong className="capacityP50Summary">
            {reference.p50Minutes
              ? (
                  <>
                    <span>
                      {formatNumber(reference.percentage)}% P50
                    </span>
                    <small>
                      P50 = {formatHours(reference.p50Minutes)}
                    </small>
                  </>
                )
              : "Chưa đủ dữ liệu"}
          </strong>
          <span>
            P75 {formatHours(reference.p75Minutes)}
          </span>
        </div>
      </button>
    </article>
  );
}

function linePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
    )
    .join(" ");
}

function CapacityTrend({
  rows,
  shootReference,
  outputReference,
  onSelect,
}: {
  rows: MediaCapacityWeek[];
  shootReference: CapacityReference;
  outputReference: CapacityReference;
  onSelect: (
    week: MediaCapacityWeek,
    metric: "shoot" | "output",
  ) => void;
}) {
  const width = 1060;
  const height = 330;
  const left = 54;
  const right = 24;
  const top = 42;
  const bottom = 58;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(
    60,
    ...rows.flatMap((row) => [row.shootMinutes, row.outputMinutes]),
    shootReference.p50Minutes,
    outputReference.p50Minutes,
  );
  const point = (value: number, index: number) => ({
    x:
      left +
      (rows.length <= 1
        ? plotWidth / 2
        : (index / (rows.length - 1)) * plotWidth),
    y: top + plotHeight - (value / max) * plotHeight,
  });
  const shootPoints = rows.map((row, index) =>
    point(row.shootMinutes, index),
  );
  const outputPoints = rows.map((row, index) =>
    point(row.outputMinutes, index),
  );
  const yFor = (value: number) =>
    top + plotHeight - (value / max) * plotHeight;

  return (
    <article className="capacityTrendCard">
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">XU HƯỚNG 12 TUẦN</span>
          <h3>Giờ chuẩn quay/chụp &amp; bàn giao</h3>
        </div>
        <div className="capacityHeaderTools">
          <div className="capacityLegend">
            <span><i className="shoot" />Quay/Chụp ước tính</span>
            <span><i className="output" />Bàn giao ấn phẩm</span>
          </div>
          <HelpButton help={capacityHelp.trend} />
        </div>
      </div>
      <div className="capacityTrendScroller">
        <svg
          className="capacityTrendSvg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Xu hướng giờ chuẩn Media trong 12 tuần"
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = top + plotHeight * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  className="capacityGridLine"
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="capacityAxisLabel"
                  x={left - 10}
                  y={y + 4}
                  textAnchor="end"
                >
                  {formatNumber((max * ratio) / 60)}h
                </text>
              </g>
            );
          })}
          {shootReference.p50Minutes > 0 && (
            <line
              className="capacityBaseline shoot"
              x1={left}
              x2={width - right}
              y1={yFor(shootReference.p50Minutes)}
              y2={yFor(shootReference.p50Minutes)}
            />
          )}
          {outputReference.p50Minutes > 0 && (
            <line
              className="capacityBaseline output"
              x1={left}
              x2={width - right}
              y1={yFor(outputReference.p50Minutes)}
              y2={yFor(outputReference.p50Minutes)}
            />
          )}
          <path
            className="capacityTrendLine shoot"
            d={linePath(shootPoints)}
          />
          <path
            className="capacityTrendLine output"
            d={linePath(outputPoints)}
          />
          {rows.map((row, index) => (
            <g key={row.key}>
              <text
                className="capacityWeekLabel"
                x={shootPoints[index].x}
                y={height - 20}
                textAnchor="middle"
              >
                {row.label}
              </text>
              <g
                className="capacityPointGroup"
                role="button"
                tabIndex={0}
                aria-label={`${row.label} · Quay/Chụp ${formatHours(row.shootMinutes)}`}
                onClick={() => onSelect(row, "shoot")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelect(row, "shoot");
                  }
                }}
              >
                <circle
                  className="capacityTrendPoint shoot"
                  cx={shootPoints[index].x}
                  cy={shootPoints[index].y}
                  r={5}
                />
                <text
                  className="capacityPointValue shoot"
                  x={shootPoints[index].x}
                  y={shootPoints[index].y - 11}
                  textAnchor="middle"
                >
                  {formatNumber(row.shootMinutes / 60)}h
                </text>
              </g>
              <g
                className="capacityPointGroup"
                role="button"
                tabIndex={0}
                aria-label={`${row.label} · Bàn giao ${formatHours(row.outputMinutes)}`}
                onClick={() => onSelect(row, "output")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelect(row, "output");
                  }
                }}
              >
                <circle
                  className="capacityTrendPoint output"
                  cx={outputPoints[index].x}
                  cy={outputPoints[index].y}
                  r={5}
                />
                <text
                  className="capacityPointValue output"
                  x={outputPoints[index].x}
                  y={outputPoints[index].y + 19}
                  textAnchor="middle"
                >
                  {formatNumber(row.outputMinutes / 60)}h
                </text>
              </g>
            </g>
          ))}
        </svg>
      </div>
    </article>
  );
}

function SegmentChart({
  title,
  kicker,
  total,
  rows,
  help,
  onSelect,
  footer,
}: {
  title: string;
  kicker: string;
  total: number;
  rows: Array<{
    label: string;
    value: number;
    className: string;
    tasks: Task[];
  }>;
  help: DashboardHelp;
  onSelect: (row: (typeof rows)[number]) => void;
  footer?: React.ReactNode;
}) {
  return (
    <article className="capacitySegmentCard">
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">{kicker}</span>
          <h3>{title}</h3>
        </div>
        <HelpButton help={help} />
      </div>
      <div className="capacitySegmentTotal">
        <strong>{formatNumber(total)}</strong>
        <span>task bàn giao</span>
      </div>
      <div className="capacitySegments">
        {total > 0 ? (
          rows.map((row) => (
            <button
              type="button"
              key={row.label}
              className={row.className}
              style={{ width: `${(row.value / total) * 100}%` }}
              title={`${row.label}: ${row.value} task`}
              aria-label={`${row.label}: ${row.value} task, ${formatPercent(row.value, total)}`}
              onClick={() => onSelect(row)}
            />
          ))
        ) : (
          <span className="capacityEmptyBar" />
        )}
      </div>
      <div className="capacitySegmentLegend">
        {rows.map((row) => (
          <button
            type="button"
            key={row.label}
            onClick={() => onSelect(row)}
          >
            <i className={row.className} />
            <span>{row.label}</span>
            <strong>{formatNumber(row.value)}</strong>
            <small>{formatPercent(row.value, total)}</small>
          </button>
        ))}
      </div>
      {footer}
    </article>
  );
}

export function MediaCapacitySection({
  viewModel,
  onOpenDetail,
}: MediaCapacitySectionProps) {
  const {
    focusWeek,
    shootReference,
    outputReference,
    standardMinutes,
  } = viewModel;
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
  const mixRows = [
    {
      label: "Video",
      value: focusWeek.videoTasks.length,
      className: "video",
      tasks: focusWeek.videoTasks,
    },
    {
      label: "Graphic",
      value: focusWeek.graphicTasks.length,
      className: "graphic",
      tasks: focusWeek.graphicTasks,
    },
  ];
  const qualityRows = [
    {
      label: "Bàn giao đúng hạn",
      value: focusWeek.onTimeTasks.length,
      className: "onTime",
      tasks: focusWeek.onTimeTasks,
    },
    {
      label: "Trễ / quá hạn",
      value: focusWeek.lateTasks.length,
      className: "late",
      tasks: focusWeek.lateTasks,
    },
    {
      label: "Chưa đủ đánh giá",
      value: focusWeek.unassessedTasks.length,
      className: "unassessed",
      tasks: focusWeek.unassessedTasks,
    },
  ];

  return (
    <>
      <header className="dashboardGroupHeader capacityGroupHeader">
        <span>04</span>
        <div>
          <p>CÔNG SUẤT MEDIA TUẦN</p>
          <h2>Khả năng quay/chụp &amp; đầu ra ấn phẩm</h2>
        </div>
      </header>
      <section className="mediaCapacitySection fullWidth groupCapacity">
        <div className="mediaCapacityHeader">
          <div>
            <span className="chartKicker">
              TUẦN {focusWeek.label}
            </span>
            <h2>Nhịp sản xuất so với 8 tuần trước</h2>
            <p>
              Mốc tham chiếu tính theo ngày làm việc Thứ Hai–Thứ Bảy,
              đã trừ ngày lễ Việt Nam. Tuần đang chạy chỉ so đến ngày
              hiện tại.
            </p>
          </div>
          <div className="capacityLockSummary">
            <span>BASELINE TUẦN</span>
            <strong>
              {formatNumber(viewModel.baselineWeekCount)} tuần có dữ liệu
            </strong>
            <small>
              {formatNumber(viewModel.elapsedWorkingDays)} /{" "}
              {formatNumber(focusWeek.workingDays)} ngày công ·{" "}
              {formatNumber(viewModel.activeAssignees)} nhân sự phát sinh
            </small>
          </div>
        </div>

        <div className="capacityTopGrid">
          <CapacityCard
            type="shoot"
            title="Công suất quay/chụp ước tính"
            actualMinutes={focusWeek.shootMinutes}
            taskCount={focusWeek.shootTasks.length}
            mappedCount={focusWeek.shootMapped}
            reference={shootReference}
            onClick={() =>
              openStandardTasks(
                `Quay/Chụp ước tính · ${focusWeek.label}`,
                "Task Quay/Chụp dùng Ngày Bắt Đầu làm mốc tạm thời",
                focusWeek.shootTasks,
              )
            }
          />
          <CapacityCard
            type="output"
            title="Công suất bàn giao ấn phẩm"
            actualMinutes={focusWeek.outputMinutes}
            taskCount={focusWeek.outputTasks.length}
            mappedCount={focusWeek.outputMapped}
            reference={outputReference}
            onClick={() =>
              openStandardTasks(
                `Ấn phẩm bàn giao · ${focusWeek.label}`,
                "Video/Graphic có Ngày Kiểm Duyệt trong tuần",
                focusWeek.outputTasks,
              )
            }
          />
        </div>

        <CapacityTrend
          rows={viewModel.trendWeeks}
          shootReference={shootReference}
          outputReference={outputReference}
          onSelect={(week, metric) =>
            openStandardTasks(
              `${metric === "shoot" ? "Quay/Chụp" : "Bàn giao"} · ${week.label}`,
              metric === "shoot"
                ? "Task Quay/Chụp phân tuần theo Ngày Bắt Đầu"
                : "Task ấn phẩm phân tuần theo Ngày Kiểm Duyệt",
              metric === "shoot" ? week.shootTasks : week.outputTasks,
            )
          }
        />

        <div className="capacityBottomGrid">
          <SegmentChart
            kicker="CƠ CẤU ĐẦU RA"
            title="Video & Graphic bàn giao"
            total={focusWeek.outputTasks.length}
            rows={mixRows}
            help={capacityHelp.mix}
            onSelect={(row) =>
              openStandardTasks(
                `${row.label} bàn giao · ${focusWeek.label}`,
                "Ấn phẩm có Ngày Kiểm Duyệt trong tuần",
                row.tasks,
              )
            }
          />
          <SegmentChart
            kicker="SẢN LƯỢNG & KIỂM SOÁT"
            title="Kết quả tại mốc bàn giao"
            total={focusWeek.outputTasks.length}
            rows={qualityRows}
            help={capacityHelp.quality}
            onSelect={(row) =>
              openStandardTasks(
                `${row.label} · ${focusWeek.label}`,
                "Phân loại theo Đánh Giá Bàn Giao",
                row.tasks,
              )
            }
            footer={
              <button
                type="button"
                className="capacityFeedbackMetric"
                onClick={() =>
                  onOpenDetail({
                    title: `Lần trả về · ${focusWeek.label}`,
                    subtitle:
                      "Phản hồi trong tuần thuộc các task ấn phẩm đã bàn giao",
                    feedback: focusWeek.feedbackRows,
                  })
                }
              >
                <span>LẦN TRẢ VỀ TRONG TUẦN</span>
                <strong>{formatNumber(focusWeek.feedbackRows.length)}</strong>
                <small>
                  Nhấn để xem dữ liệu từ sheet 2.9
                </small>
              </button>
            }
          />
        </div>

        <div className="capacityMethodNote">
          <span>MỐC ĐANG DÙNG</span>
          <p>
            Quay/Chụp đang ước tính theo Ngày Bắt Đầu. Đầu ra dùng Ngày
            Kiểm Duyệt. Chỉ cộng phút chuẩn map được từ định mức 1.7;
            task Outsource và Pending/Cancel bị loại. Snapshot baseline
            được ghi kèm khi lưu báo cáo Media.
          </p>
          <small>
            Dữ liệu đến {formatDate(viewModel.asOfDate)}
          </small>
        </div>
      </section>
    </>
  );
}
