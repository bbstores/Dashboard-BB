const coreTables = [
  {
    name: "Tasklist",
    rows: "3.758",
    columns: "54 cột",
    keyName: "TSK...",
    description:
      "Công việc, tiến độ, người phụ trách, deadline, sản phẩm và chi phí.",
  },
  {
    name: "Đăng Bài",
    rows: "1.959",
    columns: "27 cột",
    keyName: "POST...",
    description:
      "Lịch đăng, kênh, nội dung, link thành phẩm và trạng thái xuất bản.",
  },
];

const satellites = [
  "Nhân sự",
  "Kênh đăng",
  "Định dạng",
  "Bộ sưu tập",
  "Sản phẩm / SKU",
  "Marketing Plan",
  "Order MKT",
  "Order lại",
  "Ca quay",
  "Phản hồi task",
  "Đề xuất chi phí",
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="BB Store Operations">
          <span className="brandMark">BB</span>
          <span>
            <strong>Store Operations</strong>
            <small>Dashboard foundation</small>
          </span>
        </a>
        <span className="statusPill">
          <span aria-hidden="true" />
          Schema v0.1
        </span>
      </header>

      <section className="hero">
        <p className="eyebrow">NỀN TẢNG DỮ LIỆU</p>
        <h1>Task và lịch đăng bài<br />ở cùng một nguồn sự thật.</h1>
        <p className="heroCopy">
          Cấu trúc đầu tiên đã được thiết kế từ workbook Lark Base hiện tại,
          sẵn sàng cho quy trình import ghi đè mỗi tuần mà không tạo bản ghi
          trùng.
        </p>
        <div className="heroStats" aria-label="Thống kê workbook">
          <div><strong>21</strong><span>sheet đã rà soát</span></div>
          <div><strong>5.717</strong><span>task + bài đăng</span></div>
          <div><strong>1</strong><span>quan hệ trung tâm</span></div>
        </div>
      </section>

      <section className="modelSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">CORE TABLES</p>
            <h2>Hai bảng trung tâm</h2>
          </div>
          <p>
            Bài đăng nối về task thông qua <code>Book Task → Công việc</code>.
          </p>
        </div>

        <div className="coreGrid">
          {coreTables.map((table, index) => (
            <article className="coreCard" key={table.name}>
              <div className="cardTop">
                <span className="tableNumber">0{index + 1}</span>
                <span className="keyPill">PK {table.keyName}</span>
              </div>
              <h3>{table.name}</h3>
              <p>{table.description}</p>
              <div className="cardMeta">
                <span><strong>{table.rows}</strong> dòng</span>
                <span><strong>{table.columns}</strong></span>
              </div>
            </article>
          ))}
          <div className="relationLine" aria-hidden="true">
            <span>1</span><i /><span>N</span>
          </div>
        </div>
      </section>

      <section className="satelliteSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">SATELLITES</p>
            <h2>Các bảng vệ tinh</h2>
          </div>
          <p>
            Các danh sách mã trong một ô Excel được tách thành quan hệ chuẩn,
            giúp truy vấn và lọc nhẹ hơn.
          </p>
        </div>
        <div className="satelliteGrid">
          {satellites.map((item, index) => (
            <div className="satellite" key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="syncSection">
        <div>
          <p className="eyebrow">WEEKLY SYNC</p>
          <h2>Import mới, không nhân đôi.</h2>
        </div>
        <ol>
          <li><span>01</span><p><strong>Nhận diện file</strong>Chặn import trùng bằng mã SHA-256.</p></li>
          <li><span>02</span><p><strong>So sánh từng dòng</strong>Chỉ cập nhật khi nội dung thực sự thay đổi.</p></li>
          <li><span>03</span><p><strong>Lưu lịch sử</strong>Đếm thêm mới, cập nhật, giữ nguyên và lưu lỗi.</p></li>
        </ol>
      </section>
    </main>
  );
}
