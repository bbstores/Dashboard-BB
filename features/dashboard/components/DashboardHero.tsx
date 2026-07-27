import { formatNumber } from "@/shared/formatting/format";
import type {
  DashboardData,
  ReportDepartment,
} from "../model/types";

export function DashboardHero({
  data,
  department,
}: {
  data: DashboardData | null;
  department: ReportDepartment;
}) {
  const isMedia = department === "media";

  return (
    <section className="dashboardHero">
      <div>
        <p className="eyebrow">
          {isMedia ? "MEDIA TASKLIST CONTROL ROOM" : "KINH DOANH · ĐĂNG BÀI"}
        </p>
        <h1>
          {isMedia ? "Hiệu suất công việc," : "Hiệu suất đăng bài,"}
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
            ? isMedia
              ? `${formatNumber(data.tasks.length)} task · ${formatNumber(data.feedback.length)} phản hồi`
              : `${formatNumber(data.publications.length)} bài đăng`
            : "Hỗ trợ workbook .xlsx có đúng tên sheet Lark Base"}
        </small>
      </div>
    </section>
  );
}
