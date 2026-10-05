import { inputDate } from "@/shared/date/dateUtils";
import { formatDate, formatNumber } from "@/shared/formatting/format";
import type { ShootTypeBaselinePlan, ShootTypeBaselinePlanRow } from "../../analytics/calculateMediaCapacity";
import { HelpButton } from "../../components/HelpButton";
import { capacityHelp } from "./capacityHelp";
import { formatRate, formatMetric } from "./capacityFormat";

export function ShootTypeBaselineChart({
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
        <span>
          <strong>{formatRate(plan.staffCoveragePercentage)}</strong>{" "}
          số buổi đã có dữ liệu nhân sự
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
                {formatMetric(plan.overallProductPerSessionP50)} mã/buổi ·{" "}
                {plan.overallStaffPerSessionP50
                  ? `${formatMetric(plan.overallStaffPerSessionP50)} NS/buổi · ${formatMetric(plan.overallTaskPerStaffSessionP50)} task/người`
                  : "chưa có dữ liệu nhân sự"}
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
                <span className="capacityTypeMetric staff">
                  <strong>
                    {row.staffPerSessionP50
                      ? formatMetric(row.taskPerStaffSessionP50)
                      : "—"}
                  </strong>
                  <small>
                    {row.staffPerSessionP50
                      ? `task/người · ${formatMetric(row.staffPerSessionP50)} NS/buổi · ${formatMetric(row.productPerStaffSessionP50)} mã/người`
                      : "chưa nhập nhân sự"}
                  </small>
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
