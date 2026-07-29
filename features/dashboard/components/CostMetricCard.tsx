import { formatCurrency, formatNumber } from "@/shared/formatting/format";
import type { DashboardStats } from "../analytics/calculateDashboardStats";
import { HelpButton } from "./HelpButton";

type CostStats = DashboardStats["costs"];

export function CostMetricCard({
  costs,
  onClick,
}: {
  costs: CostStats;
  onClick: () => void;
}) {
  return (
    <article className="chartCard costMetricCard groupOverview">
      <div className="costMetricHeader">
        <div>
          <span className="chartKicker">CHI PHÍ ĐÃ PHÂN BỔ</span>
          <h3>Số tiền đã chi trong khoảng lọc</h3>
        </div>
        <HelpButton
          help={{
            title: "Số tiền đã chi",
            purpose: "Quy đổi các phiếu chi đã thanh toán thành chi phí của từng task.",
            objective: "Theo dõi chi phí gắn với khối lượng task bắt đầu trong khoảng ngày đang lọc.",
            calculation: "Chỉ lấy phiếu có Link Approval và trạng thái Đã Thanh Toán. Dashboard dùng Thành Tiền / Đơn vị có sẵn để chia tiếp cho task, đồng thời kiểm tra Tổng tiền = Thành Tiền / Đơn vị × số đơn vị.",
            example: "Bill khách sạn 10 triệu, 2 ca quay → mức kỳ vọng là 5 triệu/ca. Nếu mỗi ca có 15 task thì mỗi task nhận khoảng 333.333 đồng.",
            note: "Dashboard không ghi đè số liệu Lark. Bill có Thành Tiền / Đơn vị khác mức kỳ vọng sẽ được đánh dấu lệch; task được đưa vào kỳ theo Ngày Bắt Đầu.",
          }}
        />
      </div>
      <button
        type="button"
        className="costMetricValue"
        onClick={onClick}
      >
        <strong>{formatCurrency(costs.selectedAmount)}</strong>
        <span>
          {formatNumber(costs.selectedTaskCosts.length)} task có chi phí
          · {formatNumber(costs.validProposalCount)} phiếu hợp lệ
        </span>
      </button>
      <div className="costAudit">
        <span className={costs.unallocatedTotal > 0 ? "warning" : ""}>
          <small>Chưa phân bổ</small>
          <strong>{formatCurrency(costs.unallocatedTotal)}</strong>
        </span>
        <span className={costs.unitMismatchCount > 0 ? "warning" : "pass"}>
          <small>Lệch tiền/đơn vị</small>
          <strong>{formatNumber(costs.unitMismatchCount)} bill</strong>
        </span>
        <span className={costs.isReconciled ? "pass" : "fail"}>
          <small>Đối soát</small>
          <strong>{costs.isReconciled ? "PASS" : "FAIL"}</strong>
        </span>
      </div>
      {costs.unitMismatches.length > 0 && (
        <div className="costMismatchList">
          {costs.unitMismatches.slice(0, 3).map((bill) => (
            <span key={bill.proposalId}>
              <strong>{bill.proposalId}</strong>
              {formatCurrency(bill.actualUnitAmount)} thực tế ·{" "}
              {formatCurrency(bill.expectedUnitAmount)} kỳ vọng
            </span>
          ))}
          {costs.unitMismatches.length > 3 && (
            <small>
              +{formatNumber(costs.unitMismatches.length - 3)} bill khác
            </small>
          )}
        </div>
      )}
    </article>
  );
}
