import type { PublicationPlatformRow, PublicationSource } from "../../analytics/calculatePublicationStats";
import { formatNumber } from "@/shared/formatting/format";

export function PlatformMixChart({
  rows,
  onSelect,
}: {
  rows: PublicationPlatformRow[];
  onSelect: (
    platform: string,
    source?: PublicationSource,
  ) => void;
}) {
  const max = Math.max(
    1,
    ...rows.flatMap((row) => [
      row.reup,
      row.video,
      row.graphic,
    ]),
  );
  return (
    <article className="postingPlatformPanel">
      <div className="postingSubchartTitle">
        <div>
          <span className="chartKicker">CƠ CẤU THEO KÊNH</span>
          <h3>Nguồn bài đăng theo nền tảng</h3>
        </div>
        <div className="postingLegend">
          <span><i className="reup" />Reup</span>
          <span><i className="video" />Video</span>
          <span><i className="graphic" />Hình ảnh</span>
        </div>
      </div>
      <p className="postingChartNote">
        Sau khi loại các dòng liên kết với task Pending / Cancel, mỗi dòng
        trong bảng Đăng Bài được tính là một bài. Một task đăng Facebook
        và TikTok sẽ được tính thành hai bài ở hai nền tảng. Bài chưa xác
        định được xem tại cảnh báo dữ liệu riêng.
      </p>
      <div className="postingPlatformScroller">
        <div
          className="postingPlatformColumns"
          style={{
            minWidth: `${Math.max(640, rows.length * 150)}px`,
          }}
        >
          {rows.map((row) => (
            <div className="postingPlatformGroup" key={row.label}>
              <div className="postingPlatformBarArea">
                {(
                  [
                    {
                      source: "reup",
                      label: "Reup",
                      value: row.reup,
                    },
                    {
                      source: "video",
                      label: "Video",
                      value: row.video,
                    },
                    {
                      source: "graphic",
                      label: "Hình ảnh",
                      value: row.graphic,
                    },
                  ] as Array<{
                    source: PublicationSource;
                    label: string;
                    value: number;
                  }>
                ).map((column) => (
                  <button
                    type="button"
                    className={`postingPlatformColumn ${column.source}`}
                    key={column.source}
                    title={`${column.label}: ${column.value}`}
                    aria-label={`${row.label} · ${column.label}: ${column.value} bài`}
                    onClick={() =>
                      onSelect(row.label, column.source)
                    }
                    style={{
                      height: `${(column.value / max) * 100}%`,
                    }}
                  >
                    {column.value > 0 && (
                      <span>{formatNumber(column.value)}</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="postingPlatformTotal"
                title={`${row.label}: ${row.total} bài`}
                aria-label={`${row.label} · Tất cả: ${row.total} bài`}
                onClick={() => onSelect(row.label)}
              >
                <span>{row.label}</span>
                <strong>{formatNumber(row.total)}</strong>
              </button>
            </div>
          ))}
          {!rows.length && (
            <p className="emptyText">Chưa có dữ liệu phù hợp.</p>
          )}
        </div>
      </div>
    </article>
  );
}
