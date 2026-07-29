"use client";

import { useMemo, useState } from "react";
import {
  calculateReportComparison,
  comparisonPeriod,
  type BusinessComparisonPoint,
  type ComparisonPeriod,
  type MediaComparisonPoint,
} from "../analytics/calculateReportComparison";
import type {
  DashboardData,
  DashboardHelp,
  ReportDepartment,
  SavedReport,
} from "../model/types";
import {
  formatCurrency,
  formatNumber,
} from "@/shared/formatting/format";
import { HelpButton } from "./HelpButton";

type ComparisonPoint = MediaComparisonPoint | BusinessComparisonPoint;
type Series<T> = {
  label: string;
  color: string;
  value: (point: T) => number;
};

const COLORS = ["#195b47", "#8fc33c", "#ccff58", "#f3b252", "#d96b5f"];

const COMPARISON_HELP: Record<string, DashboardHelp> = {
  "Cơ cấu task thực hiện": {
    title: "Cơ cấu task thực hiện",
    purpose: "So sánh nguồn hình thành tổng task của từng kỳ.",
    objective: "Phân biệt tải mới với phần việc từ kỳ trước được bàn giao hoặc hoàn thành trong kỳ này.",
    calculation: "Bắt đầu là task có Ngày Bắt Đầu trong kỳ. Carry-in bàn giao có Ngày Bắt Đầu trước kỳ và Ngày Kiểm Duyệt trong kỳ. Carry-in hoàn thành tương tự nhưng dùng Ngày Hoàn Thành.",
    example: "Tuần A có 100 task bắt đầu và 20 carry-in bàn giao; tuần B có 80 và 45 cho thấy tải cũ đang dồn sang tuần B.",
  },
  "Tổng tải công việc": {
    title: "Tổng tải công việc",
    purpose: "So sánh tổng phút dự kiến được ghi nhận cho nhân sự ở mỗi kỳ.",
    objective: "Nhận biết kỳ nào có tải nguồn lực cao nhất.",
    calculation: "Cộng Số phút dự kiến theo từng assignee của task trong kỳ và carry-in bàn giao. Task có nhiều assignee được cộng đủ phút cho từng người như leaderboard.",
    example: "Task 120 phút có An và Bình đóng góp 120 phút cho An và 120 phút cho Bình.",
  },
  "Phút dự kiến của nhân sự": {
    title: "Phút dự kiến của nhân sự",
    purpose: "Heatmap thể hiện tải của từng người qua các kỳ đã chọn.",
    objective: "Phát hiện nhân sự tăng tải liên tục, giảm tải hoặc phân bổ không đều.",
    calculation: "Mỗi ô là tổng phút của một assignee trong một báo cáo. Màu càng đậm nghĩa là phút càng cao so với ô lớn nhất đang hiển thị.",
    example: "Nếu hàng của An đậm dần qua ba tuần, tải dự kiến của An đang tăng liên tục.",
  },
  "Tuân thủ SLA": {
    title: "Tuân thủ SLA qua các kỳ",
    purpose: "Theo dõi tỷ lệ bàn giao và hoàn thành đúng hạn.",
    objective: "Đánh giá chất lượng tiến độ đang cải thiện hay suy giảm.",
    calculation: "Bàn giao đúng hạn chia cho tổng task đã bàn giao đủ điều kiện KPI. Hoàn thành đúng hạn chia cho tổng task đã hoàn thành đủ điều kiện. Các nhóm không tính KPI không nằm trong mẫu số.",
    example: "Tỷ lệ bàn giao từ 82% lên 91% cho thấy khả năng bàn giao đúng ngày được cải thiện.",
  },
  "Điểm cần chú ý": {
    title: "Điểm cần chú ý",
    purpose: "So sánh số lần task bị trả về và số task quá hạn bàn giao.",
    objective: "Phát hiện kỳ có dấu hiệu giảm chất lượng hoặc tắc nghẽn.",
    calculation: "Lần trả về được đếm từ sheet 2.9 trong kỳ. Quá hạn là task đã qua ngày bắt đầu nhưng chưa có Ngày Kiểm Duyệt tại ngày cuối kỳ.",
    example: "Tổng task không đổi nhưng số lần trả về tăng mạnh là tín hiệu cần kiểm tra chất lượng đầu ra.",
  },
  "Mức độ trễ và kiểm duyệt": {
    title: "Mức độ trễ và kiểm duyệt",
    purpose: "So sánh trung vị và vùng chậm của thời gian xử lý.",
    objective: "Nhìn thấy độ trễ thực tế thay vì chỉ nhìn tỷ lệ đúng hạn.",
    calculation: "P50 là mốc 50% quan sát không vượt quá; P90 là mốc 90% không vượt quá. Thời gian Checking chỉ tính trong giờ làm việc cấu hình của dashboard.",
    example: "Checking P50 là 480 phút nghĩa là một nửa task hoàn thành Checking trong tối đa 480 phút làm việc.",
  },
  "Sản lượng ấn phẩm": {
    title: "Sản lượng ấn phẩm",
    purpose: "So sánh số task thành phẩm Video và Graphic giữa các kỳ.",
    objective: "Theo dõi cơ cấu và năng lực sản xuất ấn phẩm.",
    calculation: "Video là task có Format Type chứa Video và Công đoạn Edit. Graphic là task không phải Video và Công đoạn Graphic Design. Quy tắc trừ outsource lấy theo bộ lọc đã lưu.",
    example: "Tuần B tăng Video nhưng Graphic giảm cho thấy nguồn lực đang chuyển sang sản xuất video.",
  },
  "Chi phí đã phân bổ": {
    title: "Chi phí đã phân bổ qua các kỳ",
    purpose: "So sánh tổng chi phí gắn với task và chi phí trung bình mỗi task.",
    objective: "Phân biệt tăng chi phí do sản lượng tăng hay do chi phí trên từng task tăng.",
    calculation: "Tổng chi phí là phần tiền đã phân bổ cho task có Ngày Bắt Đầu trong kỳ. Chi phí/task bằng tổng này chia số task nhận chi phí.",
    example: "Tổng chi phí tăng 20% nhưng chi phí/task không đổi thường phản ánh sản lượng tăng.",
  },
  "Backlog cuối kỳ": {
    title: "Backlog cuối kỳ",
    purpose: "So sánh task tồn và phần tồn lâu trên 7 ngày tại cuối mỗi kỳ.",
    objective: "Nhận biết tồn kho công việc đang tích lũy và già hóa.",
    calculation: "Dùng 23:59 ngày cuối báo cáo làm mốc. Không tính outsource, Training, Done, Archived và Pending/Cancel. Trên 7 ngày dựa trên khoảng cách từ Ngày Bắt Đầu đến mốc cuối kỳ.",
    example: "Tổng tồn giảm nhưng nhóm trên 7 ngày tăng nghĩa là các task khó vẫn chưa được xử lý.",
  },
  "Tỷ lệ bài đã đăng": {
    title: "Tỷ lệ bài đã đăng",
    purpose: "So sánh tỷ lệ dòng lịch đăng đã hoàn tất giữa các kỳ.",
    objective: "Theo dõi mức độ thực thi lịch nội dung.",
    calculation: "Số dòng có Đã Đăng chia tổng dòng bài đăng trong khoảng Ngày Đăng của báo cáo.",
    example: "95/100 dòng đã đăng tương ứng tỷ lệ 95%.",
  },
  "Bình quân bài/ngày": {
    title: "Bình quân bài mỗi ngày",
    purpose: "Chuẩn hóa sản lượng theo số ngày làm việc của từng kỳ.",
    objective: "So sánh công bằng giữa tháng hoặc kỳ có số ngày làm việc khác nhau.",
    calculation: "Tổng bài trong kỳ chia số ngày làm việc từ thứ Hai đến thứ Bảy, đã loại Chủ nhật và ngày nghỉ lễ Việt Nam.",
    example: "120 bài trong 24 ngày làm việc tương ứng 5 bài/ngày.",
  },
  "Cơ cấu nguồn bài": {
    title: "Cơ cấu nguồn bài",
    purpose: "So sánh tỷ trọng Reup, Media Video, Media Hình ảnh và dữ liệu chưa xác định.",
    objective: "Theo dõi chiến lược nội dung đang dựa vào tái sử dụng hay sản xuất mới.",
    calculation: "Book Task trống là Reup; Book Task nối task Video + Edit là Video; nối task Graphic Design là Hình ảnh.",
    example: "Tỷ trọng Reup tăng từ 20% lên 45% cho thấy lịch đăng đang dùng lại nội dung nhiều hơn.",
  },
  "Phễu điều phối ấn phẩm": {
    title: "Phễu điều phối ấn phẩm",
    purpose: "So sánh trạng thái lên lịch của task thành phẩm.",
    objective: "Nhìn thấy lượng ấn phẩm sẵn sàng nhưng chưa được đưa vào lịch đăng.",
    calculation: "Task thành phẩm có liên kết 2.7 Đăng Bài là Đã lên lịch; không có liên kết là Chưa lên lịch. Ấn phẩm cũ sẵn sàng trước mốc 01/07/2026.",
    example: "Sản xuất 80 ấn phẩm nhưng chỉ 50 đã lên lịch nghĩa là còn 30 ấn phẩm cần điều phối.",
  },
  "Hiệu quả sử dụng media": {
    title: "Hiệu quả sử dụng media",
    purpose: "So sánh số task media gốc và số bài tạo ra trên mỗi task.",
    objective: "Đánh giá mức độ tái sử dụng một ấn phẩm trên nhiều nền tảng.",
    calculation: "Task media gốc là số Book Task Video/Hình ảnh duy nhất. Bài/task bằng tổng bài dùng media chia số task media gốc.",
    example: "20 task tạo 40 bài tương ứng trung bình 2 bài trên mỗi task.",
  },
  "Dữ liệu cần kiểm tra": {
    title: "Dữ liệu cần kiểm tra",
    purpose: "So sánh số dòng đăng bài không tuân theo quy tắc liên kết.",
    objective: "Theo dõi chất lượng dữ liệu vận hành qua từng kỳ.",
    calculation: "Gồm Book Task không tìm thấy hoặc không phải thành phẩm cuối và dòng liên kết tới task có Nền Tảng = Không Đăng Social.",
    example: "Số lỗi giảm từ 12 xuống 3 cho thấy quy trình nhập Book Task đã tốt hơn.",
  },
  "Bài đăng theo nền tảng": {
    title: "Bài đăng theo nền tảng qua các kỳ",
    purpose: "So sánh cơ cấu phân phối nội dung trên các nền tảng.",
    objective: "Nhìn thấy kênh nào đang tăng hoặc giảm khối lượng đăng.",
    calculation: "Mỗi dòng 2.7 Đăng Bài đóng góp một bài cho nền tảng của dòng đó. Chart hiển thị năm nền tảng có tổng lớn nhất trong các kỳ đang chọn.",
    example: "TikTok tăng liên tục trong khi Facebook giữ nguyên cho thấy trọng tâm phân phối đang dịch chuyển.",
  },
};

function comparisonHelp(title: string): DashboardHelp {
  if (title.startsWith("Luồng task")) {
    return {
      title: "Luồng task qua các kỳ",
      purpose: "So sánh lượng task đi vào, được bàn giao và còn tồn tại cuối từng kỳ.",
      objective: "Phát hiện tốc độ xử lý có theo kịp tốc độ nhận việc hay không.",
      calculation: "Task trong kỳ dùng Ngày Bắt Đầu; bàn giao carry-in dùng Ngày Kiểm Duyệt của task bắt đầu trước kỳ; tồn dùng 23:59 ngày cuối kỳ và không tính outsource.",
      example: "Nếu task vào giữ nguyên nhưng đường tồn tăng qua ba tuần, nhóm đang tích lũy backlog.",
    };
  }
  if (title.startsWith("Sản lượng đăng bài")) {
    return {
      title: "Sản lượng đăng bài qua các kỳ",
      purpose: "So sánh tổng dòng bài đăng và số dòng đã đăng.",
      objective: "Theo dõi khối lượng lịch nội dung và mức hoàn thành qua thời gian.",
      calculation: "Lọc sheet 2.7 theo Ngày Đăng của từng báo cáo. Mỗi dòng/nền tảng là một bài; Đã đăng dựa trên cột Đã Đăng.",
      example: "Tuần A có 70 bài và 65 đã đăng; tuần B có 90 bài nhưng chỉ 60 đã đăng, cho thấy lịch tăng nhưng tỷ lệ thực thi giảm.",
    };
  }
  return COMPARISON_HELP[title] ?? {
    title,
    purpose: "So sánh chỉ số giữa các báo cáo đã chọn.",
    objective: "Theo dõi xu hướng thay đổi qua các kỳ.",
    calculation: "Mỗi điểm hoặc hàng là kết quả tính lại từ bộ lọc ngày của một báo cáo đã lưu.",
    example: "Đọc các kỳ từ trái sang phải theo thứ tự thời gian.",
  };
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function ComparisonBars<T extends ComparisonPoint>({
  title,
  subtitle,
  points,
  series,
  format = formatNumber,
}: {
  title: string;
  subtitle: string;
  points: T[];
  series: Series<T>[];
  format?: (value: number) => string;
}) {
  const max = Math.max(
    1,
    ...points.flatMap((point) => series.map((item) => item.value(point))),
  );
  return (
    <article className="comparisonCard">
      <header>
        <div>
          <span>{subtitle}</span>
          <h3>{title}</h3>
        </div>
        <HelpButton help={comparisonHelp(title)} />
      </header>
      <div className="comparisonLegend">
        {series.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="comparisonBarRows">
        {points.map((point) => (
          <div className="comparisonBarRow" key={point.id}>
            <div className="comparisonReportLabel">
              <strong>{point.name}</strong>
              <small>{point.dateLabel}</small>
            </div>
            <div className="comparisonBarTracks">
              {series.map((item) => {
                const value = item.value(point);
                return (
                  <div className="comparisonBarTrack" key={item.label}>
                    <span
                      style={{
                        background: item.color,
                        width: `${(value / max) * 100}%`,
                      }}
                    />
                    <b>{format(value)}</b>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ComparisonStack<T extends ComparisonPoint>({
  title,
  subtitle,
  points,
  series,
}: {
  title: string;
  subtitle: string;
  points: T[];
  series: Series<T>[];
}) {
  return (
    <article className="comparisonCard">
      <header>
        <div>
          <span>{subtitle}</span>
          <h3>{title}</h3>
        </div>
        <HelpButton help={comparisonHelp(title)} />
      </header>
      <div className="comparisonLegend">
        {series.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="comparisonStacks">
        {points.map((point) => {
          const values = series.map((item) => item.value(point));
          const total = values.reduce((sum, value) => sum + value, 0);
          return (
            <div className="comparisonStackRow" key={point.id}>
              <div className="comparisonReportLabel">
                <strong>{point.name}</strong>
                <small>{point.dateLabel}</small>
              </div>
              <div>
                <div className="comparisonStackTrack">
                  {series.map((item, index) => (
                    <span
                      key={item.label}
                      title={`${item.label}: ${formatNumber(values[index])}`}
                      style={{
                        background: item.color,
                        width: `${total ? (values[index] / total) * 100 : 0}%`,
                      }}
                    />
                  ))}
                </div>
                <small className="comparisonStackValues">
                  {series
                    .map(
                      (item, index) =>
                        `${item.label}: ${formatNumber(values[index])}`,
                    )
                    .join(" · ")}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ComparisonTrend<T extends ComparisonPoint>({
  title,
  subtitle,
  points,
  series,
  format = formatNumber,
}: {
  title: string;
  subtitle: string;
  points: T[];
  series: Series<T>[];
  format?: (value: number) => string;
}) {
  const width = 920;
  const height = 280;
  const left = 50;
  const right = 24;
  const top = 25;
  const bottom = 58;
  const max = Math.max(
    1,
    ...points.flatMap((point) => series.map((item) => item.value(point))),
  );
  const x = (index: number) =>
    left +
    (points.length <= 1
      ? (width - left - right) / 2
      : (index / (points.length - 1)) * (width - left - right));
  const y = (value: number) =>
    top + (1 - value / max) * (height - top - bottom);

  return (
    <article className="comparisonCard comparisonTrendCard">
      <header>
        <div>
          <span>{subtitle}</span>
          <h3>{title}</h3>
        </div>
        <HelpButton help={comparisonHelp(title)} />
      </header>
      <div className="comparisonLegend">
        {series.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="comparisonChartScroller">
        <svg viewBox={`0 0 ${width} ${height}`} role="img">
          {[0, 0.5, 1].map((ratio) => {
            const value = max * ratio;
            return (
              <g key={ratio}>
                <line
                  className="comparisonGridLine"
                  x1={left}
                  x2={width - right}
                  y1={y(value)}
                  y2={y(value)}
                />
                <text
                  className="comparisonAxisText"
                  x={left - 9}
                  y={y(value) + 4}
                  textAnchor="end"
                >
                  {format(value)}
                </text>
              </g>
            );
          })}
          {series.map((item, seriesIndex) => {
            const path = points
              .map(
                (point, index) =>
                  `${index ? "L" : "M"} ${x(index)} ${y(item.value(point))}`,
              )
              .join(" ");
            return (
              <g key={item.label}>
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                {points.map((point, index) => {
                  const value = item.value(point);
                  const labelOffset =
                    [-11, 16, -25, 30][seriesIndex] ?? 14;
                  const labelY = Math.max(
                    12,
                    Math.min(height - bottom + 18, y(value) + labelOffset),
                  );
                  return (
                    <g key={point.id}>
                      <circle
                        cx={x(index)}
                        cy={y(value)}
                        fill={item.color}
                        r="5"
                      >
                        <title>
                          {point.name} · {item.label}: {format(value)}
                        </title>
                      </circle>
                      <text
                        className="comparisonPointValue"
                        x={x(index)}
                        y={labelY}
                        textAnchor="middle"
                      >
                        {format(value)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          {points.map((point, index) => (
            <text
              className="comparisonAxisText"
              key={point.id}
              x={x(index)}
              y={height - 25}
              textAnchor="middle"
            >
              {point.dateLabel}
            </text>
          ))}
        </svg>
      </div>
    </article>
  );
}

function StaffHeatmap({ points }: { points: MediaComparisonPoint[] }) {
  const people = Array.from(
    new Set(points.flatMap((point) => Object.keys(point.assigneeMinutes))),
  )
    .map((name) => ({
      name,
      total: points.reduce(
        (sum, point) => sum + (point.assigneeMinutes[name] ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const max = Math.max(
    1,
    ...people.flatMap((person) =>
      points.map((point) => point.assigneeMinutes[person.name] ?? 0),
    ),
  );
  return (
    <article className="comparisonCard comparisonHeatmapCard">
      <header>
        <div>
          <span>TẢI CÔNG VIỆC THEO ASSIGNEE</span>
          <h3>Phút dự kiến của nhân sự</h3>
        </div>
        <HelpButton help={comparisonHelp("Phút dự kiến của nhân sự")} />
      </header>
      <div
        className="comparisonHeatmap"
        style={{
          gridTemplateColumns: `minmax(150px, 1.4fr) repeat(${points.length}, minmax(85px, 1fr))`,
        }}
      >
        <b>Nhân sự</b>
        {points.map((point) => (
          <b key={point.id}>{point.dateLabel}</b>
        ))}
        {people.map((person) => (
          <div className="comparisonHeatmapRow" key={person.name}>
            <strong>{person.name}</strong>
            {points.map((point) => {
              const value = point.assigneeMinutes[person.name] ?? 0;
              const opacity = value ? 0.16 + (value / max) * 0.84 : 0.05;
              return (
                <span
                  key={point.id}
                  style={{ background: `rgba(25, 91, 71, ${opacity})` }}
                  title={`${person.name} · ${point.name}: ${formatNumber(value)} phút`}
                >
                  {formatNumber(value)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </article>
  );
}

function MediaCharts({
  points,
  period,
}: {
  points: MediaComparisonPoint[];
  period: ComparisonPeriod;
}) {
  const unit = period === "week" ? "TUẦN" : "THÁNG";
  return (
    <section className="comparisonCharts">
      <ComparisonTrend
        title={`Luồng task qua từng ${period === "week" ? "tuần" : "tháng"}`}
        subtitle={`KHỐI LƯỢNG MEDIA THEO ${unit}`}
        points={points}
        series={[
          { label: "Task trong kỳ", color: COLORS[0], value: (p) => p.started },
          { label: "Bàn giao carry-in", color: COLORS[1], value: (p) => p.inspectionCarry },
          { label: "Tồn cuối kỳ", color: COLORS[3], value: (p) => p.backlog },
        ]}
      />
      <ComparisonBars
        title="Cơ cấu task thực hiện"
        subtitle="TASK TRONG KỲ VÀ HAI LOẠI CARRY-IN"
        points={points}
        series={[
          { label: "Bắt đầu", color: COLORS[0], value: (p) => p.started },
          { label: "Carry-in bàn giao", color: COLORS[1], value: (p) => p.inspectionCarry },
          { label: "Carry-in hoàn thành", color: COLORS[2], value: (p) => p.completionCarry },
        ]}
      />
      <ComparisonBars
        title="Tổng tải công việc"
        subtitle="PHÚT DỰ KIẾN ĐÃ CỘNG THEO ASSIGNEE"
        points={points}
        series={[
          { label: "Tổng phút", color: COLORS[0], value: (p) => p.totalMinutes },
        ]}
        format={(value) => `${formatNumber(value)} phút`}
      />
      <StaffHeatmap points={points} />
      <ComparisonTrend
        title="Tuân thủ SLA"
        subtitle="TỶ LỆ ĐÚNG HẠN"
        points={points}
        format={formatPercent}
        series={[
          { label: "Bàn giao", color: COLORS[0], value: (p) => p.handoffOnTimeRate },
          { label: "Hoàn thành", color: COLORS[1], value: (p) => p.overallOnTimeRate },
        ]}
      />
      <ComparisonBars
        title="Điểm cần chú ý"
        subtitle="LẦN TRẢ VỀ VÀ TASK QUÁ HẠN BÀN GIAO"
        points={points}
        series={[
          { label: "Lần trả về", color: COLORS[3], value: (p) => p.feedback },
          { label: "Quá hạn", color: COLORS[4], value: (p) => p.overdue },
        ]}
      />
      <ComparisonBars
        title="Mức độ trễ và kiểm duyệt"
        subtitle="P50 / P90 THEO PHÚT"
        points={points}
        series={[
          { label: "Trễ bàn giao P50", color: COLORS[3], value: (p) => p.handoffLateP50 },
          { label: "Checking P50", color: COLORS[0], value: (p) => p.checkingP50 },
          { label: "Checking P90", color: COLORS[4], value: (p) => p.checkingP90 },
        ]}
        format={(value) => `${formatNumber(value)} phút`}
      />
      <ComparisonStack
        title="Sản lượng ấn phẩm"
        subtitle="VIDEO VÀ GRAPHIC"
        points={points}
        series={[
          { label: "Video", color: COLORS[0], value: (p) => p.video },
          { label: "Graphic", color: COLORS[2], value: (p) => p.graphic },
        ]}
      />
      <ComparisonBars
        title="Chi phí đã phân bổ"
        subtitle="TỔNG CHI PHÍ VÀ CHI PHÍ / TASK"
        points={points}
        series={[
          { label: "Tổng chi phí", color: COLORS[0], value: (p) => p.cost },
          { label: "Chi phí / task", color: COLORS[3], value: (p) => p.costPerTask },
        ]}
        format={formatCurrency}
      />
      <ComparisonBars
        title="Backlog cuối kỳ"
        subtitle="TỔNG TỒN VÀ TASK TRÊN 7 NGÀY"
        points={points}
        series={[
          { label: "Tổng tồn", color: COLORS[0], value: (p) => p.backlog },
          { label: "Trên 7 ngày", color: COLORS[4], value: (p) => p.backlogOverSevenDays },
        ]}
      />
    </section>
  );
}

function BusinessCharts({
  points,
  period,
}: {
  points: BusinessComparisonPoint[];
  period: ComparisonPeriod;
}) {
  return (
    <section className="comparisonCharts">
      <ComparisonTrend
        title={`Sản lượng đăng bài theo ${period === "week" ? "tuần" : "tháng"}`}
        subtitle="TỔNG BÀI VÀ BÀI ĐÃ ĐĂNG"
        points={points}
        series={[
          { label: "Tổng bài", color: COLORS[0], value: (p) => p.total },
          { label: "Đã đăng", color: COLORS[1], value: (p) => p.posted },
        ]}
      />
      <ComparisonBars
        title="Tỷ lệ bài đã đăng"
        subtitle="TỶ LỆ HOÀN THÀNH LỊCH ĐĂNG"
        points={points}
        series={[
          { label: "Tỷ lệ đã đăng", color: COLORS[0], value: (p) => p.postedRate },
        ]}
        format={formatPercent}
      />
      <ComparisonBars
        title="Bình quân bài/ngày"
        subtitle="CHUẨN HÓA THEO NGÀY LÀM VIỆC"
        points={points}
        series={[
          { label: "Bài / ngày", color: COLORS[1], value: (p) => p.perDay },
        ]}
        format={(value) =>
          new Intl.NumberFormat("vi-VN", {
            maximumFractionDigits: 1,
          }).format(value)
        }
      />
      <ComparisonStack
        title="Cơ cấu nguồn bài"
        subtitle="REUP VÀ ẤN PHẨM MEDIA"
        points={points}
        series={[
          { label: "Reup", color: COLORS[3], value: (p) => p.reup },
          { label: "Video", color: COLORS[0], value: (p) => p.video },
          { label: "Hình ảnh", color: COLORS[2], value: (p) => p.graphic },
          { label: "Chưa xác định", color: COLORS[4], value: (p) => p.unknown },
        ]}
      />
      <ComparisonStack
        title="Phễu điều phối ấn phẩm"
        subtitle="ĐÃ LÊN LỊCH VÀ CHƯA LÊN LỊCH"
        points={points}
        series={[
          { label: "Đã lên lịch", color: COLORS[0], value: (p) => p.scheduled },
          { label: "Chưa lên lịch", color: COLORS[2], value: (p) => p.unscheduled },
          { label: "Ấn phẩm cũ", color: COLORS[4], value: (p) => p.oldAssets },
        ]}
      />
      <ComparisonBars
        title="Hiệu quả sử dụng media"
        subtitle="TASK MEDIA GỐC VÀ BÀI / TASK"
        points={points}
        series={[
          { label: "Task media gốc", color: COLORS[0], value: (p) => p.uniqueMediaTasks },
          { label: "Bài / task", color: COLORS[1], value: (p) => p.postsPerMediaTask },
        ]}
        format={(value) =>
          new Intl.NumberFormat("vi-VN", {
            maximumFractionDigits: 1,
          }).format(value)
        }
      />
      <ComparisonBars
        title="Dữ liệu cần kiểm tra"
        subtitle="BOOK TASK VÀ KHÔNG ĐĂNG SOCIAL"
        points={points}
        series={[
          { label: "Số dòng lỗi", color: COLORS[4], value: (p) => p.dataIssues },
        ]}
      />
      <PlatformComparison points={points} />
    </section>
  );
}

function PlatformComparison({ points }: { points: BusinessComparisonPoint[] }) {
  const platforms = Array.from(
    new Set(points.flatMap((point) => Object.keys(point.platforms))),
  )
    .map((label) => ({
      label,
      total: points.reduce(
        (sum, point) => sum + (point.platforms[label] ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  return (
    <ComparisonStack<BusinessComparisonPoint>
      title="Bài đăng theo nền tảng"
      subtitle="TOP 5 NỀN TẢNG TRONG CÁC KỲ ĐÃ CHỌN"
      points={points}
      series={platforms.map((platform, index) => ({
        label: platform.label,
        color: COLORS[index % COLORS.length],
        value: (point) => point.platforms[platform.label] ?? 0,
      }))}
    />
  );
}

export function ComparisonDashboard({
  data,
  reports,
}: {
  data: DashboardData;
  reports: SavedReport[];
}) {
  const [department, setDepartment] =
    useState<ReportDepartment>("media");
  const [period, setPeriod] = useState<ComparisonPeriod>("week");
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const available = useMemo(
    () =>
      reports
        .filter(
          (report) =>
            report.department === department &&
            comparisonPeriod(report) === period,
        )
        .sort(
          (left, right) =>
            left.filters.dateFrom.localeCompare(right.filters.dateFrom),
        ),
    [department, period, reports],
  );
  const selectedReports = useMemo(
    () =>
      available.filter((report) => !excludedIds.includes(report.id)),
    [available, excludedIds],
  );
  const points = useMemo(
    () =>
      calculateReportComparison(
        data,
        selectedReports,
        department,
        period,
      ),
    [data, department, period, selectedReports],
  );

  return (
    <section className="comparisonDashboard">
      <header className="comparisonHero">
        <div>
          <span>REPORT COMPARISON</span>
          <h1>So sánh báo cáo &amp; xu hướng vận hành</h1>
          <p>
            Chọn nhiều kỳ cùng phòng ban. Các mốc được sắp theo thời gian
            và tính lại từ file Excel hiện tại.
          </p>
        </div>
        <div className="comparisonModeControls">
          <div>
            <small>Phòng ban</small>
            {(["media", "business"] as const).map((value) => (
              <button
                type="button"
                className={department === value ? "active" : ""}
                onClick={() => setDepartment(value)}
                key={value}
              >
                {value === "media" ? "Media" : "Kinh doanh"}
              </button>
            ))}
          </div>
          <div>
            <small>Chu kỳ</small>
            {(["week", "month"] as const).map((value) => (
              <button
                type="button"
                className={period === value ? "active" : ""}
                onClick={() => setPeriod(value)}
                key={value}
              >
                {value === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="comparisonReportPicker">
        <header>
          <div>
            <span>CHỌN BÁO CÁO</span>
            <h2>
              {department === "media" ? "Media" : "Kinh doanh"} ·{" "}
              {period === "week" ? "Theo tuần" : "Theo tháng"}
            </h2>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setExcludedIds([])}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={() =>
                setExcludedIds(available.map((report) => report.id))
              }
            >
              Bỏ chọn
            </button>
          </div>
        </header>
        {available.length ? (
          <div className="comparisonReportOptions">
            {available.map((report) => {
              const checked = !excludedIds.includes(report.id);
              return (
                <label className={checked ? "selected" : ""} key={report.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setExcludedIds((current) =>
                        checked
                          ? [...current, report.id]
                          : current.filter((id) => id !== report.id),
                      )
                    }
                  />
                  <strong>{report.name}</strong>
                  <span>
                    {report.filters.dateFrom} → {report.filters.dateTo}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="comparisonEmpty">
            Chưa có báo cáo {period === "week" ? "tuần" : "tháng"} đã lưu
            cho phòng ban này.
          </div>
        )}
      </section>

      {points.length ? (
        department === "media" ? (
          <MediaCharts
            points={points as MediaComparisonPoint[]}
            period={period}
          />
        ) : (
          <BusinessCharts
            points={points as BusinessComparisonPoint[]}
            period={period}
          />
        )
      ) : available.length ? (
        <div className="comparisonEmpty comparisonEmptyLarge">
          Chọn ít nhất một báo cáo để bắt đầu so sánh.
        </div>
      ) : null}

      <aside className="comparisonSnapshotNote">
        <strong>Phạm vi lịch sử</strong>
        <p>
          Báo cáo đã lưu hiện lưu bộ lọc, chưa lưu snapshot. Các chỉ số được
          tính lại từ file đang nạp; trạng thái Done, Đã đăng hoặc Backlog có
          thể khác thời điểm bạn bấm lưu. Backlog trên trang này dùng ngày cuối
          của từng kỳ làm mốc.
        </p>
      </aside>
    </section>
  );
}
