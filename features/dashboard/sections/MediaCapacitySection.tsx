import { useEffect, useMemo, useState } from "react";
import { inputDate } from "@/shared/date/dateUtils";
import { formatDate, formatHours, formatNumber, formatPercent } from "@/shared/formatting/format";
import type {
  CapacityReference,
  MediaCapacityStats,
  MediaCapacityWeek,
  QuantityReference,
  ShootTypeBaselinePlan,
  ShootTypeBaselinePlanRow,
} from "../analytics/calculateMediaCapacity";
import { calculateShootTypeBaselinePlan } from "../analytics/calculateMediaCapacity";
import { HelpButton } from "../components/HelpButton";
import type { DashboardHelp, DetailView, Task } from "../model/types";

type MediaCapacitySectionProps = {
  viewModel: MediaCapacityStats;
  globalDateFrom: string;
  globalDateTo: string;
  onOpenDetail: (detail: DetailView) => void;
};

const capacityHelp: Record<
  | "demand"
  | "sessions"
  | "outputCount"
  | "shoot"
  | "output"
  | "trend"
  | "mix"
  | "quality"
  | "shootTypes",
  DashboardHelp
> = {
  demand: {
    title: "Nhu cầu task quay/chụp",
    purpose:
      "Đếm lượng việc team Media được yêu cầu quay hoặc chụp trong tuần.",
    objective:
      "Cho biết đầu vào đang tạo ra bao nhiêu nhu cầu và bao nhiêu task chưa được gắn vào lịch quay.",
    calculation:
      "Lấy task nội bộ có Công đoạn Quay hoặc Chụp, Ngày Bắt Đầu thuộc tuần; loại task không tên, Outsource và Pending/Cancel. Sau đó tách theo cột Ca Quay có giá trị hay còn trống.",
    example:
      "Tuần có 60 task Quay/Chụp, 52 task có Ca Quay và 8 task chưa gắn → độ phủ lịch quay 86,7%.",
    note:
      "Đây là nhu cầu theo Tasklist, không phải số task thực tế đã quay. Với tuần đang chạy, số chính là dữ liệu đến hôm nay và dòng dự kiến hết tuần lấy toàn bộ task đã có lịch trong tuần.",
  },
  sessions: {
    title: "Buổi quay và số mã thực tế",
    purpose:
      "Đo năng lực quay/chụp từ sheet 2.11 Lịch Quay bằng một đơn vị chung.",
    objective:
      "Trả lời trong một tuần team thực hiện bao nhiêu buổi quay, bao nhiêu task và bao nhiêu mã sản phẩm.",
    calculation:
      "Một buổi được quy đổi 4 giờ; Một ngày bằng 2 buổi. Số task lấy Tổng Số Task; số mã là hợp không trùng của Danh Sách Mã SP. Baseline tháng lấy P25/P50/P75 của 12 tuần hoàn chỉnh trước tháng báo cáo, yêu cầu tối thiểu 8 tuần có lịch quay và được khóa suốt tháng.",
    example:
      "5 buổi, 49 task và 16 mã; nếu P50 lần lượt là 5, 49 và 16 thì tuần đạt đúng nhịp trung vị lịch sử.",
    note:
      "Tuần đang chạy: thực tế chỉ tính ca đến hôm nay; dự kiến hết tuần tính mọi ca đã xếp lịch đến cuối tuần. Ca chưa có Thời Lượng vẫn xuất hiện trong bảng dẫn chứng nhưng đóng góp 0 buổi.",
  },
  outputCount: {
    title: "Ấn phẩm bàn giao trong tuần",
    purpose:
      "Đếm số Video và Graphic đã được người làm bàn giao ở mốc Ngày Kiểm Duyệt.",
    objective:
      "Trả lời một tuần team trả ra bao nhiêu ấn phẩm và đang cao hay thấp hơn nhịp lịch sử.",
    calculation:
      "Lấy task ấn phẩm cuối có Ngày Kiểm Duyệt thuộc tuần, loại Outsource và Pending/Cancel. Baseline tháng lấy 12 tuần hoàn chỉnh trước tháng báo cáo. Nếu tuần chưa kết thúc, dự báo = đầu ra thực tế / số ngày công đã qua × tổng ngày công của tuần.",
    example:
      "Tuần bàn giao 117 ấn phẩm và P50 lịch sử cũng là 117 → đạt 100% nhịp trung vị.",
    note:
      "Dự báo là phép ngoại suy theo tốc độ, không phải cam kết. P50 Video và P50 Graphic là hai trung vị độc lập nên không bắt buộc cộng lại bằng P50 tổng.",
  },
  shoot: {
    title: "Tải quay/chụp quy đổi",
    purpose:
      "Quy đổi nhu cầu Quay/Chụp sang phút chuẩn để nhìn độ nặng nhẹ của cơ cấu task.",
    objective:
      "Bổ sung góc nhìn tải công việc; không dùng chỉ số này để suy ra số buổi quay.",
    calculation:
      "Lấy task nội bộ có Công đoạn Quay/Chụp và Ngày Bắt Đầu thuộc tuần. Map Format Type sang phút quay/chụp của bảng định mức 1.7, sau đó so với P25–P75 trên mỗi ngày làm việc của 8 tuần trước.",
    example:
      "Tuần có 4.800 phút chuẩn, vùng lịch sử là 4.200–5.100 phút → nằm trong vùng thông thường.",
    note:
      "Số buổi quay thực tế được tính riêng từ sheet 2.11 Lịch Quay ở chart phía trên.",
  },
  output: {
    title: "Tải bàn giao quy đổi",
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
  shootTypes: {
    title: "Baseline theo loại ca quay",
    purpose:
      "Cho biết một buổi 4 giờ từng loại ca thường xử lý bao nhiêu task, bao nhiêu mã và tổng hợp thành baseline tuần.",
    objective:
      "Tách khác biệt giữa các loại ca nhưng vẫn có một mốc chung để đánh giá tuần đang vượt hay dưới năng lực thực nghiệm.",
    calculation:
      "P50 chung được tính từ từng buổi gốc. Baseline theo cơ cấu = P50 buổi/tuần × tỷ trọng loại × năng suất loại. P50 tuần trực tiếp được tính độc lập từ tổng task từng tuần để đối chiếu độ lệch của mô hình.",
    example:
      "Nếu P50 là 5 buổi/tuần, cơ cấu Bộ Sưu Tập chiếm 40% và đạt 8 task/buổi thì phần đóng góp dự kiến là 5 × 40% × 8 = 16 task.",
    note:
      "Dưới 4 buổi: Chưa đủ mẫu; 4–7: Tham khảo; từ 8: Tương đối ổn định. Bộ lọc này chỉ tác động chart và không đổi baseline khóa tháng phía trên.",
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

function statusCopy(
  reference: Pick<CapacityReference, "bandStatus">,
) {
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

function formatRate(value: number) {
  return formatPercent(value, 100);
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value);
}

function toInputDate(value: Date | null) {
  if (!value) return "";
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function typeRangeFromGlobal({
  globalDateFrom,
  globalDateTo,
  baselineDateFrom,
  baselineDateTo,
  dataDateFrom,
  dataDateTo,
}: {
  globalDateFrom: string;
  globalDateTo: string;
  baselineDateFrom: string;
  baselineDateTo: string;
  dataDateFrom: string;
  dataDateTo: string;
}) {
  if (globalDateFrom || globalDateTo) {
    return {
      from: globalDateFrom || dataDateFrom || baselineDateFrom,
      to: globalDateTo || dataDateTo || baselineDateTo,
    };
  }
  return {
    from: baselineDateFrom || dataDateFrom,
    to: baselineDateTo || dataDateTo,
  };
}

function formatHourPoint(minutes: number) {
  return formatHours(minutes).replace(" giờ", "h");
}

function QuantityBand({
  reference,
  unit,
}: {
  reference: QuantityReference;
  unit: string;
}) {
  return (
    <div className="capacityQuantityBand">
      <span>P25 {formatMetric(reference.p25)} {unit}</span>
      <strong>
        P50 {formatMetric(reference.p50)} {unit}
      </strong>
      <span>P75 {formatMetric(reference.p75)} {unit}</span>
    </div>
  );
}

function CapacityFlowCard({
  type,
  kicker,
  title,
  primaryValue,
  primaryUnit,
  reference,
  forecastValue,
  completeWeek = true,
  baselineLabel,
  onOpenBaseline,
  help,
  onClick,
  children,
}: {
  type: "demand" | "sessions" | "outputs";
  kicker: string;
  title: string;
  primaryValue: number;
  primaryUnit: string;
  reference?: QuantityReference;
  forecastValue?: number;
  completeWeek?: boolean;
  baselineLabel?: string;
  onOpenBaseline?: () => void;
  help: DashboardHelp;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const status = reference ? statusCopy(reference) : null;
  return (
    <article className={`capacityFlowCard ${type}`}>
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">{kicker}</span>
          <h3>{title}</h3>
        </div>
        <HelpButton help={help} />
      </div>
      <button
        type="button"
        className="capacityFlowBody"
        onClick={onClick}
      >
        <div className="capacityFlowPrimary">
          <strong>{formatMetric(primaryValue)}</strong>
          <span>{primaryUnit}</span>
          {status && (
            <i className={`capacityBandStatus ${status.className}`}>
              {status.label}
            </i>
          )}
        </div>
        {!completeWeek && forecastValue !== undefined && (
          <div className="capacityForecast">
            <span>THỰC TẾ ĐẾN HIỆN TẠI</span>
            <strong>
              Dự báo hết tuần {formatMetric(forecastValue)} {primaryUnit}
            </strong>
          </div>
        )}
        {reference && (
          <>
            <p className="capacityFlowP50">
              {formatRate(reference.percentage)} so với P50
            </p>
            <QuantityBand reference={reference} unit={primaryUnit} />
          </>
        )}
        <div className="capacityFlowBreakdown">{children}</div>
        <small className="capacityEvidenceHint">
          Nhấn để xem bảng dẫn chứng
        </small>
      </button>
      {onOpenBaseline && (
        <button
          type="button"
          className="capacityBaselineEvidence"
          onClick={onOpenBaseline}
        >
          Xem dữ liệu tạo {baselineLabel ?? "baseline"}
        </button>
      )}
    </article>
  );
}

function ShootTypeBaselineChart({
  plan,
  dateFrom,
  dateTo,
  sessionCount,
  sessionUnits,
  invalidRange,
  onDateFromChange,
  onDateToChange,
  onResetRange,
  onSelectAll,
  onSelect,
}: {
  plan: ShootTypeBaselinePlan;
  dateFrom: string;
  dateTo: string;
  sessionCount: number;
  sessionUnits: number;
  invalidRange: boolean;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onResetRange: () => void;
  onSelectAll: () => void;
  onSelect: (row: ShootTypeBaselinePlanRow) => void;
}) {
  const rows = plan.rows;
  const maxTasks = Math.max(
    1,
    ...rows.map((row) => row.taskPerSessionP50),
  );
  return (
    <article className="capacityTypeBaselineCard">
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">
            BASELINE LINH ĐỘNG · THEO LOẠI CA
          </span>
          <h3>Năng suất thực nghiệm trong một buổi 4 giờ</h3>
        </div>
        <div className="capacityTypeHeaderTools">
          <div className="capacityTypeDateFilters">
            <label>
              Từ ngày
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) =>
                  onDateFromChange(event.target.value)
                }
              />
            </label>
            <span>→</span>
            <label>
              Đến ngày
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) =>
                  onDateToChange(event.target.value)
                }
              />
            </label>
            <button type="button" onClick={onResetRange}>
              Theo bộ lọc tổng
            </button>
          </div>
          <HelpButton help={capacityHelp.shootTypes} />
        </div>
      </div>
      <div className="capacityTypeRangeSummary">
        <span>
          Khoảng đang tính:{" "}
          <strong>
            {formatDate(inputDate(dateFrom))}–{formatDate(inputDate(dateTo))}
          </strong>
        </span>
        <span>
          <strong>{formatNumber(sessionCount)}</strong> ca ·{" "}
          <strong>{formatMetric(sessionUnits)}</strong> buổi mẫu hợp lệ ·{" "}
          <strong>{formatNumber(plan.weekCount)}</strong>{" "}
          {plan.usesPartialRange ? "khoảng tham khảo" : "tuần hoàn chỉnh"}
        </span>
      </div>
      {invalidRange ? (
        <p className="capacityTypeEmpty">
          Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.
        </p>
      ) : rows.length ? (
        <>
          <div className="capacityCompositeBaseline">
            <button type="button" onClick={onSelectAll}>
              <span>P50 CHUNG TỪ TỪNG BUỔI</span>
              <strong>
                {formatMetric(plan.overallTaskPerSessionP50)} task
              </strong>
              <small>
                {formatMetric(plan.overallProductPerSessionP50)} mã / buổi
              </small>
            </button>
            <button
              type="button"
              className="weekly"
              onClick={onSelectAll}
            >
              <span>BASELINE TUẦN THEO CƠ CẤU</span>
              <strong>
                {formatMetric(plan.weeklyTaskBaseline)} task
              </strong>
              <small>
                {formatMetric(plan.weeklyProductBaseline)} mã ·{" "}
                {formatMetric(plan.weeklySessionP50)} buổi / tuần
              </small>
            </button>
            <button
              type="button"
              className="observed"
              onClick={onSelectAll}
            >
              <span>P50 TUẦN QUAN SÁT TRỰC TIẾP</span>
              <strong>
                {formatMetric(plan.observedWeeklyTaskP50)} task
              </strong>
              <small>
                {formatMetric(plan.observedWeeklyProductP50)} mã không
                trùng / tuần
              </small>
            </button>
            <p>
              Không lấy trung bình cộng các loại.{" "}
              {plan.fallbackTypeCount > 0
                ? `${plan.fallbackTypeCount}/${rows.length} loại chưa đủ 8 buổi nên dùng P50 chung khi tổng hợp.`
                : "Tất cả loại đã có tối thiểu 8 buổi mẫu."}{" "}
              Mô hình theo cơ cấu đang bằng{" "}
              <strong>
                {formatRate(plan.modelToObservedPercentage)}
              </strong>{" "}
              P50 tuần quan sát.
            </p>
          </div>
          <div className="capacityTypeRows">
            {rows.map((row) => (
              <button
                type="button"
                key={row.type}
                onClick={() => onSelect(row)}
              >
                <span className="capacityTypeName">
                  <strong>{row.type}</strong>
                  <small>
                    {formatMetric(row.sessionUnits)} buổi mẫu ·{" "}
                    {formatRate(row.mixPercentage)} cơ cấu
                  </small>
                  <i
                    className={`capacityTypeConfidence ${row.confidence}`}
                  >
                    {row.confidence === "stable"
                      ? "Tương đối ổn định"
                      : row.confidence === "reference"
                        ? "Tham khảo"
                        : "Chưa đủ mẫu"}
                  </i>
                  {row.usesOverallFallback && (
                    <em>Dùng P50 chung khi tổng hợp tuần</em>
                  )}
                </span>
                <span className="capacityTypeBar">
                  <i
                    style={{
                      width: `${Math.max(
                        3,
                        (row.taskPerSessionP50 / maxTasks) * 100,
                      )}%`,
                    }}
                  />
                </span>
                <span className="capacityTypeMetric">
                  <strong>{formatMetric(row.taskPerSessionP50)}</strong>
                  <small>task / buổi P50</small>
                </span>
                <span className="capacityTypeMetric">
                  <strong>
                    {formatMetric(row.productPerSessionP50)}
                  </strong>
                  <small>mã / buổi P50</small>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="capacityTypeEmpty">
          Chưa có ca đủ dữ liệu trong cửa sổ baseline.
        </p>
      )}
    </article>
  );
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
                      {formatRate(reference.percentage)} P50
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
                  {formatHourPoint(max * ratio)}
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
                  {formatHourPoint(row.shootMinutes)}
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
                  {formatHourPoint(row.outputMinutes)}
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
  globalDateFrom,
  globalDateTo,
  onOpenDetail,
}: MediaCapacitySectionProps) {
  const {
    focusWeek,
    focusFullWeek,
    officialBaseline,
    forecastOutputCount,
    forecastVideoCount,
    forecastGraphicCount,
    isCompleteWeek,
    shootReference,
    outputReference,
    standardMinutes,
  } = viewModel;
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
  const [typeDateFrom, setTypeDateFrom] = useState(
    commonTypeRange.from,
  );
  const [typeDateTo, setTypeDateTo] = useState(commonTypeRange.to);
  useEffect(() => {
    setTypeDateFrom(commonTypeRange.from);
    setTypeDateTo(commonTypeRange.to);
  }, [commonTypeRange]);
  const typeRangeStart = inputDate(typeDateFrom);
  const typeRangeEnd = inputDate(typeDateTo, true);
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
  const shootCoverage = focusWeek.shootTasks.length
    ? (focusWeek.linkedShootTasks.length / focusWeek.shootTasks.length) *
      100
    : 0;
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
            <h2>Baseline Media v1 · nhịp sản xuất tuần</h2>
            <p>
              Chuẩn P50 được khóa theo tháng từ 12 tuần hoàn chỉnh trước
              đó. Tuần đang chạy hiển thị riêng thực tế đến hôm nay và
              dự báo hết tuần để tránh kết luận sớm.
            </p>
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

        <div className="capacityFlowIntro">
          <div>
            <span className="chartKicker">MẪU SỐ CHUNG THEO TUẦN</span>
            <h3>Nhu cầu → Buổi quay → Ấn phẩm bàn giao</h3>
          </div>
          <p>
            Ba lớp dùng ba mốc riêng để không đánh đồng task được giao,
            ca quay thực tế và đầu ra đã bàn giao.
          </p>
        </div>
        <div className="capacityFlowGrid">
          <CapacityFlowCard
            type="demand"
            kicker="01 · NHU CẦU"
            title="Task cần quay/chụp"
            primaryValue={focusWeek.shootTasks.length}
            primaryUnit="task"
            forecastValue={focusFullWeek.shootTasks.length}
            completeWeek={isCompleteWeek}
            help={capacityHelp.demand}
            onClick={() =>
              openStandardTasks(
                `Nhu cầu Quay/Chụp · ${focusWeek.label}`,
                "Task Quay/Chụp phân tuần theo Ngày Bắt Đầu; dùng cột Ca Quay để lọc task đã/chưa xếp lịch",
                focusWeek.shootTasks,
              )
            }
          >
            <span>
              <b>{formatNumber(focusWeek.linkedShootTasks.length)}</b>
              đã có Ca Quay
            </span>
            <span>
              <b>{formatNumber(focusWeek.unlinkedShootTasks.length)}</b>
              chưa có Ca Quay
            </span>
            <span>
              <b>{formatRate(shootCoverage)}</b>
              độ phủ lịch quay
            </span>
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
            <span>
              <b>{formatNumber(focusFullWeek.scheduledTaskCount)}</b>
              task đã xếp cả tuần · P50{" "}
              {formatMetric(officialBaseline.scheduledTaskReference.p50)}
            </span>
            <span>
              <b>{formatNumber(focusFullWeek.uniqueProductCount)}</b>
              mã đã xếp cả tuần · P50{" "}
              {formatMetric(officialBaseline.productReference.p50)}
            </span>
            <span>
              <b>{formatNumber(focusWeek.shootSessions.length)}</b>
              ca trong sheet 2.11
            </span>
          </CapacityFlowCard>

          <CapacityFlowCard
            type="outputs"
            kicker="03 · ĐẦU RA"
            title="Ấn phẩm đã bàn giao"
            primaryValue={focusWeek.outputTasks.length}
            primaryUnit="ấn phẩm"
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
            <span>
              <b>{formatNumber(focusWeek.videoTasks.length)}</b>
              Video · dự báo {formatMetric(forecastVideoCount)} · P50{" "}
              {formatMetric(officialBaseline.videoReference.p50)}
            </span>
            <span>
              <b>{formatNumber(focusWeek.graphicTasks.length)}</b>
              Graphic · dự báo {formatMetric(forecastGraphicCount)} · P50{" "}
              {formatMetric(officialBaseline.graphicReference.p50)}
            </span>
            <span>
              <b>{formatHours(focusWeek.outputMinutes)}</b>
              tải chuẩn 1.7
            </span>
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
          onResetRange={() => {
            setTypeDateFrom(commonTypeRange.from);
            setTypeDateTo(commonTypeRange.to);
          }}
          onSelectAll={() =>
            onOpenDetail({
              title: "Dữ liệu tạo baseline tổng hợp",
              subtitle: `${formatDate(typeRangeStart)}–${formatDate(typeRangeEnd)} · P50 chung ${formatMetric(typeBaselinePlan.overallTaskPerSessionP50)} task/buổi · baseline tuần ${formatMetric(typeBaselinePlan.weeklyTaskBaseline)} task`,
              shootSessions: typeBaselinePlan.sessions,
            })
          }
          onSelect={(row) =>
            onOpenDetail({
              title: `${row.type} · baseline linh động`,
              subtitle: `${formatDate(typeRangeStart)}–${formatDate(typeRangeEnd)} · ${formatMetric(row.sessionUnits)} buổi mẫu · P50 ${formatMetric(row.taskPerSessionP50)} task/buổi · ${formatMetric(row.productPerSessionP50)} mã/buổi`,
              shootSessions: row.sessions,
            })
          }
        />

        <div className="capacityWorkloadIntro">
          <span className="chartKicker">GÓC NHÌN TẢI QUY ĐỔI</span>
          <h3>Phút chuẩn dùng để giải thích độ nặng của cơ cấu task</h3>
          <p>
            Chỉ số phụ này không được dùng để quy đổi ngược thành số
            buổi quay.
          </p>
        </div>
        <div className="capacityTopGrid">
          <CapacityCard
            type="shoot"
            title="Tải quay/chụp quy đổi"
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
            title="Tải bàn giao quy đổi"
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
