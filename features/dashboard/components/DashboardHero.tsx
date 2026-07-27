import { formatNumber } from "@/shared/formatting/format";
import type { DashboardData } from "../model/types";

export function DashboardHero({
  data,
}: {
  data: DashboardData | null;
}) {
  return (
    <section className="dashboardHero">
      <div>
        <p className="eyebrow">TASKLIST CONTROL ROOM</p>
        <h1>
          Hiệu suất công việc,
          <br />
          nhìn trong một màn hình.
        </h1>
        <p className="heroCopy">
          File được đọc và xử lý ngay trên thiết bị. Không có dữ liệu nhân sự
          nào được tải lên máy chủ hoặc lưu trong mã nguồn.
        </p>
      </div>
      <div className={`dataBadge ${data ? "loaded" : ""}`}>
        <span>{data ? "ĐÃ NẠP" : "CHỜ FILE"}</span>
        <strong>{data ? data.fileName : "BB Store Task Export"}</strong>
        <small>
          {data
            ? `${formatNumber(data.tasks.length)} task · ${formatNumber(data.feedback.length)} phản hồi`
            : "Hỗ trợ workbook .xlsx có đúng tên sheet Lark Base"}
        </small>
      </div>
    </section>
  );
}
