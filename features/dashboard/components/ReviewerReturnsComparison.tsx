import type { ComparisonEvidenceSelection } from "../analytics/buildComparisonDetail";
import type { ReviewComparisonPoint } from "../analytics/calculateReportComparison";
import type { ReviewerReturnEvidence } from "../model/types";
import { formatNumber } from "@/shared/formatting/format";
import { HelpButton } from "./HelpButton";

const TITLE = "Task bị trả sau duyệt · Hiếu Producer";
const METRICS = [
  { field: "approvedTasks", key: "hieuApprovedTasks", label: "Hiếu duyệt mới nhất" },
  { field: "returnedTasks", key: "hieuReturnedTasks", label: "Task bị trả" },
  { field: "returnRate", key: "hieuReturnRate", label: "Tỷ lệ ghi nhận" },
  { field: "rejectTasks", key: "hieuRejectTasks", label: "Task bị Reject" },
  { field: "bodTasks", key: "hieuBodTasks", label: "Task BOD không duyệt" },
  { field: "rejectEvents", key: "hieuRejectEvents", label: "Lần Reject" },
  { field: "uncertainTasks", key: "hieuUncertainTasks", label: "Task chưa đủ dữ liệu" },
  { field: "ignoredEvents", key: "hieuIgnoredEvents", label: "Phản hồi bị loại" },
] as const;

export function ReviewerReturnsComparison({
  points,
  available,
  unassignedRows,
  onSelect,
  onOpenUnassigned,
}: {
  points: ReviewComparisonPoint[];
  available: boolean;
  unassignedRows: ReviewerReturnEvidence[];
  onSelect: (selection: Omit<ComparisonEvidenceSelection, "point"> & { point: ReviewComparisonPoint }) => void;
  onOpenUnassigned: () => void;
}) {
  return (
    <article className="comparisonCard reviewerReturnsCard">
      <header>
        <div>
          <span>NGƯỜI DUYỆT MỚI NHẤT LÀ HIẾU PRODUCER</span>
          <h3>{TITLE}</h3>
        </div>
        <HelpButton help={{
          title: TITLE,
          purpose: "Theo dõi task có người duyệt mới nhất là Hiếu và bị trả sau bước Done.",
          calculation: "Ghép Tasklist với Lịch sử phản hồi theo mã task. Nhóm kỳ theo Ngày Hoàn Thành mới nhất của task có Approval By là Hiếu Producer. Chỉ tính Reject của Thuỳ An, Boss BB, Hiếu Producer, Thu Trang và Media Planner sau mốc này, hoặc BOD DUYỆT = KHÔNG DUYỆT có Ngày BOD Duyệt sau mốc. Tổng task là hợp khử trùng hai nhóm; tỷ lệ = task bị trả / task Hiếu duyệt mới nhất trong kỳ. Lần Reject chỉ đếm lịch sử phản hồi, không cộng trạng thái BOD vì có thể trùng cùng lần trả.",
          example: "Một task có 3 lần Reject và BOD không duyệt được tính 1 task bị trả, 1 task bị Reject, 1 task BOD không duyệt và 3 lần Reject.",
          note: "Approval By không lưu người duyệt từng vòng. Reject trước Done mới nhất được đánh dấu chưa đủ dữ liệu, trừ phản hồi chắc chắn trước Done lần đầu. BOD thiếu ngày không được xác nhận. Task chưa đủ dữ liệu có thể đồng thời có lần trả đã xác nhận. Theo dõi các lần trả đến thời điểm xuất file, kể cả sau kỳ được chọn. Không có mẫu thì tỷ lệ hiển thị —.",
        }} />
      </header>
      {!available ? (
        <p className="reviewerReturnsNote">Chưa có cột Approval By trong file. Không xác định được người duyệt mới nhất để tính chỉ số này.</p>
      ) : (
        <>
          <p className="reviewerReturnsNote">
            Xếp kỳ theo Done mới nhất. Chỉ tính phản hồi của Thuỳ An, Boss BB, Hiếu Producer, Thu Trang và Media Planner.
            Các lần trả sau kỳ vẫn được ghi nhận đến thời điểm xuất file.
          </p>
          <div className="reviewerReturnsScroller">
            <table className="reviewerReturnsTable">
              <thead>
                <tr>
                  <th scope="col">Kỳ duyệt</th>
                  {METRICS.map((metric) => <th scope="col" key={metric.key}>{metric.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.id}>
                    <th scope="row"><strong>{point.name}</strong><small>{point.dateLabel}</small></th>
                    {METRICS.map((metric) => {
                      const value = point.reviewerReturns[metric.field];
                      const formattedValue = value === null ? "—"
                        : metric.field === "returnRate"
                          ? `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)}%`
                          : formatNumber(value);
                      return (
                        <td key={metric.key} className={metric.field === "returnedTasks" ? "reviewerReturnsTotal" : undefined}>
                          <button
                            type="button"
                            disabled={value === null}
                            aria-label={`${point.name} · ${metric.label}: ${formattedValue} · Xem dẫn chứng`}
                            onClick={() => onSelect({
                              chartTitle: TITLE,
                              formattedValue,
                              key: metric.key,
                              point,
                              seriesLabel: metric.label,
                              value: value ?? 0,
                            })}
                          >{formattedValue}</button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="reviewerReturnsNote">
            Tổng task bị trả đã loại trùng Reject và BOD. Tỷ lệ ghi nhận chỉ gồm các ca xác định được sau Done mới nhất;
            chưa phản ánh đầy đủ những vòng duyệt trước. Bấm vào số để xem dẫn chứng.
          </p>
          {unassignedRows.length > 0 && (
            <button type="button" className="reviewerReturnsUnassigned" onClick={onOpenUnassigned}>
              {formatNumber(unassignedRows.length)} task Hiếu chưa có ngày Done mới nhất · Chưa xếp được kỳ · Xem toàn file
            </button>
          )}
        </>
      )}
    </article>
  );
}
