import { useMemo, useState } from "react";
import { inputDate } from "@/shared/date/dateUtils";
import { formatDate, formatHours, formatNumber, formatPercent } from "@/shared/formatting/format";
import type {
  CapacityReference,
  MediaCapacityStats,
  MediaTrendBucket,
  MediaTrendGranularity,
  QuantityReference,
  ShootTypeBaselinePlan,
  ShootTypeBaselinePlanRow,
} from "../analytics/calculateMediaCapacity";
import {
  calculateMediaTrendSeries,
  calculateShootTypeBaselinePlan,
} from "../analytics/calculateMediaCapacity";
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
    title: "Xu hướng công suất theo thời gian",
    purpose:
      "Đặt tải quay/chụp và đầu ra ấn phẩm trên cùng trục thời gian.",
    objective:
      "Phát hiện xu hướng tăng/giảm, độ trễ giữa tuần quay và tuần trả ấn phẩm, cùng các tuần bất thường.",
    calculation:
      "Quay/Chụp dùng Ngày Bắt Đầu; Bàn giao dùng Ngày Kiểm Duyệt. Tổng tải = giờ chuẩn Quay/Chụp + giờ chuẩn Bàn giao trong từng mốc. P50 tổng được tính trực tiếp từ tổng tải của các mốc hoàn chỉnh, không cộng hai P50 riêng. Trung bình trượt chỉ xuất hiện từ khi có đủ 4 mốc hoàn chỉnh và lấy trung bình tổng tải của 4 mốc gần nhất.",
    example:
      "Tuần 1 tải quay tăng mạnh nhưng đầu ra chỉ tăng ở tuần 2 có thể phản ánh độ trễ sản xuất.",
    note:
      "Bộ lọc này chỉ tác động chart. 1W và khoảng tối đa 14 ngày hiển thị theo ngày; 15–100 ngày theo tuần; dài hơn 100 ngày theo tháng. Chủ nhật không phát sinh bị ẩn ở chế độ ngày. Điểm viền rỗng là mốc chưa hoàn tất và không tham gia P50 hay trung bình trượt. Nhấn chú thích Quay/Chụp, Bàn giao hoặc Tổng tải để làm nổi riêng đường đó; nhấn lại để hiện tất cả. Nhấn điểm Tổng tải để mở hợp không trùng của task quay/chụp và task bàn giao trong mốc.",
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
      "Tạm thời không áp dụng ngưỡng số buổi tối thiểu: mỗi loại ca dùng trực tiếp P50 của chính các buổi đang có trong khoảng lọc. Vì vậy loại chỉ có 1–2 buổi có thể dao động mạnh. Bộ lọc này chỉ tác động chart và không đổi baseline khóa tháng phía trên.",
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

type TrendPreset = "all" | "1w" | "1m" | "3m" | "1y" | "custom";

function addCalendarDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function inclusiveDaySpan(from: Date, to: Date) {
  return Math.max(
    1,
    Math.floor(
      (new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime() -
        new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) /
        86_400_000,
    ) + 1,
  );
}

function trendGranularityFor(
  preset: TrendPreset,
  from: Date,
  to: Date,
): MediaTrendGranularity {
  if (preset === "1w") return "day";
  if (preset === "1m" || preset === "3m") return "week";
  if (preset === "1y") return "month";
  const days = inclusiveDaySpan(from, to);
  return days <= 14 ? "day" : days <= 100 ? "week" : "month";
}

function presetStart(preset: TrendPreset, anchor: Date, allStart: Date) {
  if (preset === "all") return allStart;
  if (preset === "1w") return addCalendarDays(anchor, -6);
  if (preset === "1m") return addCalendarDays(anchor, -29);
  if (preset === "3m") return addCalendarDays(anchor, -89);
  if (preset === "1y") return addCalendarDays(anchor, -364);
  return allStart;
}

function granularityLabel(value: MediaTrendGranularity) {
  return value === "day" ? "ngày" : value === "week" ? "tuần" : "tháng";
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
              Không lấy trung bình cộng các loại. Mỗi loại đang dùng trực
              tiếp P50 từ các buổi thuộc khoảng lọc, chưa áp dụng ngưỡng
              số buổi tối thiểu.{" "}
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

function uniqueTasks(tasks: Task[]) {
  return Array.from(new Set(tasks));
}

function CapacityTrend({
  rows,
  shootReference,
  outputReference,
  totalReference,
  preset,
  dateFrom,
  dateTo,
  granularity,
  invalidRange,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  onSelect,
}: {
  rows: MediaTrendBucket[];
  shootReference: CapacityReference;
  outputReference: CapacityReference;
  totalReference: CapacityReference;
  preset: TrendPreset;
  dateFrom: string;
  dateTo: string;
  granularity: MediaTrendGranularity;
  invalidRange: boolean;
  onPresetChange: (value: TrendPreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSelect: (
    bucket: MediaTrendBucket,
    metric: "shoot" | "output" | "total",
  ) => void;
}) {
  const [activeMetric, setActiveMetric] = useState<
    "shoot" | "output" | "total" | null
  >(null);
  const width = Math.max(1060, 78 + Math.max(1, rows.length - 1) * 88);
  const height = 330;
  const left = 54;
  const right = 24;
  const top = 42;
  const bottom = 58;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(
    60,
    ...rows.flatMap((row) => [
      row.shootMinutes,
      row.outputMinutes,
      row.totalMinutes,
      row.rollingAverageMinutes ?? 0,
    ]),
    shootReference.p50Minutes,
    outputReference.p50Minutes,
    totalReference.p50Minutes,
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
  const totalPoints = rows.map((row, index) =>
    point(row.totalMinutes, index),
  );
  const rollingAveragePoints = rows.flatMap((row, index) =>
    row.rollingAverageMinutes === null
      ? []
      : [point(row.rollingAverageMinutes, index)],
  );
  const yFor = (value: number) =>
    top + plotHeight - (value / max) * plotHeight;

  return (
    <article className="capacityTrendCard">
      <div className="capacityCardHeader">
        <div>
          <span className="chartKicker">XU HƯỚNG LINH ĐỘNG</span>
          <h3>Giờ chuẩn quay/chụp &amp; bàn giao</h3>
        </div>
        <div className="capacityHeaderTools">
          <div
            className={`capacityLegend${activeMetric ? " hasFocus" : ""}`}
          >
            <button
              type="button"
              className={activeMetric === "shoot" ? "active" : ""}
              aria-pressed={activeMetric === "shoot"}
              onClick={() =>
                setActiveMetric((current) =>
                  current === "shoot" ? null : "shoot",
                )
              }
            >
              <i className="shoot" />Quay/Chụp · P50{" "}
              {formatHourPoint(shootReference.p50Minutes)}
            </button>
            <button
              type="button"
              className={activeMetric === "output" ? "active" : ""}
              aria-pressed={activeMetric === "output"}
              onClick={() =>
                setActiveMetric((current) =>
                  current === "output" ? null : "output",
                )
              }
            >
              <i className="output" />Bàn giao · P50{" "}
              {formatHourPoint(outputReference.p50Minutes)}
            </button>
            <button
              type="button"
              className={activeMetric === "total" ? "active" : ""}
              aria-pressed={activeMetric === "total"}
              onClick={() =>
                setActiveMetric((current) =>
                  current === "total" ? null : "total",
                )
              }
            >
              <i className="total" />Tổng tải · P50{" "}
              {formatHourPoint(totalReference.p50Minutes)}
            </button>
            <span>
              <i className="rolling" />TB trượt 4 kỳ
            </span>
            <span><i className="partial" />Chưa hoàn tất</span>
          </div>
          <HelpButton help={capacityHelp.trend} />
        </div>
      </div>
      <div className="capacityTrendToolbar">
        <div className="capacityTrendPresets" aria-label="Khoảng xu hướng">
          {([
            ["all", "ALL"],
            ["1w", "1W"],
            ["1m", "1M"],
            ["3m", "3M"],
            ["1y", "1Y"],
            ["custom", "TỰ CHỌN"],
          ] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={preset === value ? "active" : ""}
              aria-pressed={preset === value}
              onClick={() => onPresetChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="capacityTrendCustomRange">
            <label>
              Từ ngày
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => onDateFromChange(event.target.value)}
              />
            </label>
            <span>→</span>
            <label>
              Đến ngày
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => onDateToChange(event.target.value)}
              />
            </label>
          </div>
        )}
        <div className="capacityTrendRangeSummary">
          <span>
            {formatDate(inputDate(dateFrom))}–{formatDate(inputDate(dateTo))}
          </span>
          <strong>THEO {granularityLabel(granularity).toUpperCase()}</strong>
        </div>
      </div>
      {invalidRange ? (
        <p className="capacityTrendEmpty">
          Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.
        </p>
      ) : rows.length ? (
        <div className="capacityTrendScroller">
        <svg
          className={`capacityTrendSvg${activeMetric ? ` seriesFocus focus-${activeMetric}` : ""}`}
          style={{ minWidth: `${width}px` }}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Xu hướng giờ chuẩn Media theo ${granularityLabel(granularity)}`}
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
          {totalReference.p50Minutes > 0 && (
            <line
              className="capacityBaseline total"
              x1={left}
              x2={width - right}
              y1={yFor(totalReference.p50Minutes)}
              y2={yFor(totalReference.p50Minutes)}
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
          <path
            className="capacityTrendLine total"
            d={linePath(totalPoints)}
          />
          {rollingAveragePoints.length > 1 && (
            <path
              className="capacityTrendLine rolling"
              d={linePath(rollingAveragePoints)}
            />
          )}
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
                className="capacityPointGroup shoot"
                role="button"
                tabIndex={0}
                aria-label={`${row.label} · Quay/Chụp ${formatHours(row.shootMinutes)}${row.isComplete ? "" : " · Chưa hoàn tất"}`}
                onClick={() => onSelect(row, "shoot")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelect(row, "shoot");
                  }
                }}
              >
                <circle
                  className={`capacityTrendPoint shoot${row.isComplete ? "" : " partial"}`}
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
                className="capacityPointGroup output"
                role="button"
                tabIndex={0}
                aria-label={`${row.label} · Bàn giao ${formatHours(row.outputMinutes)}${row.isComplete ? "" : " · Chưa hoàn tất"}`}
                onClick={() => onSelect(row, "output")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelect(row, "output");
                  }
                }}
              >
                <circle
                  className={`capacityTrendPoint output${row.isComplete ? "" : " partial"}`}
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
              <g
                className="capacityPointGroup total"
                role="button"
                tabIndex={0}
                aria-label={`${row.label} · Tổng tải ${formatHours(row.totalMinutes)}${row.isComplete ? "" : " · Chưa hoàn tất"}`}
                onClick={() => onSelect(row, "total")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelect(row, "total");
                  }
                }}
              >
                <circle
                  className={`capacityTrendPoint total${row.isComplete ? "" : " partial"}`}
                  cx={totalPoints[index].x}
                  cy={totalPoints[index].y}
                  r={5}
                />
                <text
                  className="capacityPointValue total"
                  x={totalPoints[index].x}
                  y={totalPoints[index].y - 11}
                  textAnchor="middle"
                >
                  {formatHourPoint(row.totalMinutes)}
                </text>
              </g>
            </g>
          ))}
        </svg>
        </div>
      ) : (
        <p className="capacityTrendEmpty">
          Chưa có dữ liệu Media trong khoảng đã chọn.
        </p>
      )}
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
  const trendRangeStart = inputDate(trendRange.from);
  const trendRangeEnd = inputDate(trendRange.to, true);
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
          onResetRange={() =>
            setTypeRangeInput({
              sourceKey: typeRangeKey,
              ...commonTypeRange,
            })
          }
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
