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
            calculation: "Chỉ lấy phiếu có Link Approval và trạng thái Đã Thanh Toán. Thành Tiền / Đơn vị được chia tiếp cho danh sách task của BST, Ca Quay, SKU hoặc task được chọn trực tiếp.",
            example: "Một ca có Thành Tiền / Đơn vị 5 triệu và 15 task → mỗi task nhận khoảng 333.333 đồng.",
            note: "Task được đưa vào kỳ theo Ngày Bắt Đầu. Khoản không tìm được task được giữ ở mục chưa phân bổ.",
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
          {formatNumber(costs.selectedAllocations.length)} dòng phân bổ
          task · {formatNumber(costs.validProposalCount)} phiếu hợp lệ
        </span>
      </button>
      <div className="costAudit">
        <span className={costs.unallocatedTotal > 0 ? "warning" : ""}>
          <small>Chưa phân bổ</small>
          <strong>{formatCurrency(costs.unallocatedTotal)}</strong>
        </span>
        <span className={costs.isReconciled ? "pass" : "fail"}>
          <small>Đối soát</small>
          <strong>{costs.isReconciled ? "PASS" : "FAIL"}</strong>
        </span>
      </div>
    </article>
  );
}
