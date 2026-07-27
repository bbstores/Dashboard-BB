import type { RefObject } from "react";

export function EmptyDashboard({
  fileRef,
  loading,
}: {
  fileRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
}) {
  return (
    <section className="emptyState">
      <div className="dropMark">↓</div>
      <p className="eyebrow">BẮT ĐẦU</p>
      <h2>Nạp file export mới nhất</h2>
      <p>
        Dashboard cần sheet <code>2.6 Tasklist</code> và{" "}
        <code>2.9 Lịch sử phản hồi Task</code>.
      </p>
      <button onClick={() => fileRef.current?.click()}>
        {loading ? "Đang xử lý…" : "Chọn workbook"}
      </button>
    </section>
  );
}
