import type { ComparisonEvidenceSelection } from "../analytics/buildComparisonDetail";
import type { ReviewComparisonPoint } from "../analytics/calculateReportComparison";
import { REVIEWER_RETURN_SOURCES } from "../analytics/calculateReviewerReturns";
import type { ReviewerReturnEvidence } from "../model/types";
import { formatNumber } from "@/shared/formatting/format";
import { HelpButton } from "./HelpButton";

const TITLE = "Task bị trả sau duyệt · Hiếu Producer";
type Returns = ReviewComparisonPoint["reviewerReturns"];
const METRICS: Array<{ key: string; label: string; read: (returns: Returns) => number | null; tone?: string }> = [
  { key: "hieuApprovedTasks", label: "Hiếu chuyển Done", read: (returns) => returns.approvedTasks },
  { key: "hieuReturnedTasks", label: "Bị cấp sau trả", read: (returns) => returns.returnedTasks, tone: "reviewerReturnsTotal" },
  { key: "hieuReturnRate", label: "Tỷ lệ bị trả", read: (returns) => returns.returnRate, tone: "reviewerReturnsTotal" },
  ...REVIEWER_RETURN_SOURCES.map(({ source, label }) => ({
    key: `hieuReturn:${source}`,
    label: source === "hieu" ? label : `Trả bởi ${label}`,
    read: (returns: Returns) => returns.sourceTasks[source],
    tone: source === "hieu" ? "reviewerReturnsSelf" : undefined,
  })),
];

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
          <span>NGƯỜI CHUYỂN DONE GẦN NHẤT LÀ HIẾU PRODUCER</span>
          <h3>{TITLE}</h3>
        </div>
        <HelpButton help={{
          title: TITLE,
          purpose: "Theo dõi task Hiếu đã cho Done nhưng bị các cấp duyệt sau (lead, BOD) trả lại.",
          calculation: "Ghép Tasklist với Lịch sử phản hồi theo mã task. Mẫu số là task có Approval By (người chuyển Checking sang Done gần nhất) là Hiếu Producer, xếp kỳ theo Ngày Hoàn Thành mới nhất. Task bị trả khi có ít nhất một Reject của Thuỳ An, Boss BB, Thu Trang (gồm tài khoản Media Planner) hoặc Thúy Sang, hoặc BOD DUYỆT là KHÔNG DUYỆT / ĐANG SỬA / ĐÃ SỬA / THỰC HIỆN LẠI. Tỷ lệ = task bị trả / task Hiếu chuyển Done trong kỳ.",
          example: "Một task bị Thuỳ An trả 2 lần và BOD không duyệt được tính 1 task bị cấp sau trả, đồng thời có mặt ở cột Thuỳ An và cột BOD.",
          note: "Các cấp lead chỉ duyệt sau Hiếu, nên mọi lần trả của họ đều được tính dù nằm trước Ngày Hoàn Thành mới nhất (ngày này bị ghi đè khi task Done lại). Reject của Hiếu trước Done mới nhất là vòng duyệt bình thường, không tính; sau Done mới nhất là Hiếu tự mở lại, hiển thị riêng và không cộng vào tổng. Phản hồi của người ngoài danh sách được xem là thao tác nhầm. Các cột theo người trả có thể trùng task nên không cộng thành tổng. Approval By bị ghi đè mỗi lần chuyển Done: nếu sau khi lead trả mà người khác chuyển Done lại, hoặc Approval By để trống, task không còn được nhận là của Hiếu, nên số bị trả có thể thấp hơn thực tế. Không có mẫu thì tỷ lệ hiển thị —.",
        }} />
      </header>
      {!available ? (
        <p className="reviewerReturnsNote">Chưa có cột Approval By trong file. Không xác định được người chuyển Done để tính chỉ số này.</p>
      ) : (
        <>
          <p className="reviewerReturnsNote">
            Xếp kỳ theo Done mới nhất. Bị trả = có Reject của Thuỳ An, Boss BB, Thu Trang hoặc Thúy Sang, hoặc BOD không duyệt.
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
                      const value = metric.read(point.reviewerReturns);
                      const formattedValue = value === null ? "—"
                        : metric.key === "hieuReturnRate"
                          ? `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)}%`
                          : formatNumber(value);
                      return (
                        <td key={metric.key} className={metric.tone}>
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
            Tổng task bị trả đã loại trùng giữa các người trả; các cột theo người trả không cộng thành tổng.
            Hiếu tự mở lại chỉ để tham khảo, không cộng vào tổng. Bấm vào số để xem dẫn chứng.
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
