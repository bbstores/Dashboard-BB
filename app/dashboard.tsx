"use client";

import "./sla.css";
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type Task = {
  code: string;
  title: string;
  stage: string;
  formatType: string;
  productCode: string;
  collection: string;
  expectedMinutes: number;
  status: string;
  assignee: string;
  startDate: Date | null;
  completedDate: Date | null;
  inspectionDate: Date | null;
  receivedCheckingDate: Date | null;
  handoffRating: string;
  overallRating: string;
  type: string;
  outsource: string;
};

type WorkNorm = {
  formatType: string;
  recordMinutes: number;
  editMinutes: number;
  graphicMinutes: number;
  contentMinutes: number;
};

type Feedback = {
  taskCode: string;
  at: Date | null;
  assignee: string;
};

type DashboardData = {
  tasks: Task[];
  feedback: Feedback[];
  norms: WorkNorm[];
  fileName: string;
};

type DateWindow = {
  from: Date | null;
  to: Date | null;
  hasFilter: boolean;
};

type PieDatum = { label: string; value: number };
type PieScope = "started" | "carried" | "combined";

type DetailView = {
  title: string;
  subtitle: string;
  tasks?: Task[];
  feedback?: Array<Feedback & { task?: Task }>;
};

type DashboardHelp = {
  title: string;
  purpose: string;
  objective?: string;
  calculation: string;
  example: string;
  note?: string;
};

const HelpContext = createContext<(help: DashboardHelp) => void>(() => {});

function dashboardObjective(title: string) {
  const objectives: Record<string, string> = {
    "Task trong kỳ": "Giúp quản lý biết quy mô công việc thực sự phát sinh hoặc được hoàn tất trong kỳ, tránh bỏ sót task carry-in khi đánh giá khối lượng.",
    "Task thiếu thông tin": "Phát hiện dữ liệu chưa đủ để giao việc, quy trách nhiệm hoặc tính các chỉ số thời gian; từ đó yêu cầu đội ngũ bổ sung trước khi báo cáo.",
    "Task tồn tại mốc chọn": "Theo dõi lượng việc còn treo đến một mốc và ưu tiên xử lý backlog trước khi tiếp tục nhận thêm việc.",
    "Leaderboard thời gian": "So sánh tải công việc dự kiến giữa nhân sự, nhận diện người quá tải hoặc còn năng lực để điều phối lại task.",
    "Tiến độ hoàn thành": "Giúp quản lý biết BST nào có nguy cơ trễ theo cả số đầu việc lẫn khối lượng phút, thay vì chỉ nhìn số task.",
    "Số task thực hiện & số lần trả về": "Đối chiếu sản lượng với mức độ phải sửa lại; người có nhiều task nhưng cũng nhiều lần trả về cần được xem sâu về chất lượng hoặc quy trình giao nhận.",
    "Tình trạng task": "Nhìn nhanh cơ cấu tiến độ để phát hiện task đang dồn ở một trạng thái và điều phối bước xử lý tiếp theo.",
    "Đánh giá bàn giao": "Theo dõi chất lượng đầu ra tại thời điểm bàn giao và xác định nhóm task cần cải thiện tiêu chuẩn bàn giao.",
    "Đánh giá tổng": "Đánh giá chất lượng tổng thể của task sau toàn bộ quy trình, phục vụ nhìn nhận hiệu quả cuối cùng.",
    "Trạng thái task tồn": "Cho biết backlog đang mắc ở trạng thái nào để giao đúng người tháo gỡ thay vì chỉ biết tổng số task tồn.",
    "Task theo Type": "Hiểu cơ cấu loại công việc để phân bổ nguồn lực, kỹ năng và định mức phù hợp.",
    "Task theo công đoạn": "Phát hiện công đoạn đang tập trung nhiều đầu việc hoặc có nguy cơ trở thành nút thắt.",
    "Task Outsource": "Kiểm soát khối lượng giao ngoài, mức độ phụ thuộc và phân bổ công việc giữa từng đối tác outsource.",
    "Cycle time theo ngày": "Theo dõi tốc độ hoàn thành đầu-cuối và nhận diện tỷ lệ task có vòng đời dài bất thường.",
    "Aging task đang mở": "Ưu tiên các task đang mở quá lâu trước khi chúng trở thành backlog nghiêm trọng.",
    "Đối chiếu kế hoạch với định mức 1.7": "Đo mức độ thống nhất giữa phút dự kiến đang nhập trên Tasklist và bảng chuẩn tham chiếu, phục vụ chuẩn hóa cách lập kế hoạch — không đánh giá tốc độ làm việc thực tế.",
    "P50 hoàn thành": "Cung cấp mốc thời gian điển hình đáng tin cậy hơn số trung bình khi dữ liệu có một số task kéo dài bất thường.",
    "Task đang mở có ngày bắt đầu": "Đánh giá sức khỏe lượng việc đang chạy và phát hiện xu hướng công việc bị kéo dài.",
    "Độ phủ định mức tham chiếu": "Biết bao nhiêu task có thể tìm được phút chuẩn tham chiếu trước khi sử dụng phần đối chiếu kế hoạch.",
  };
  if (objectives[title]) return objectives[title];
  if (title.includes("Checking") || title.includes("Reviewing")) {
    return "Đo tốc độ tiếp nhận, kiểm tra và kết thúc khâu duyệt để nhận diện thời gian chờ hoặc nút thắt trong quy trình kiểm duyệt.";
  }
  if (title.includes("Format Type")) {
    return "Hiểu sản lượng theo định dạng đầu ra để lập kế hoạch năng lực sản xuất và phân bổ đúng nhóm chuyên môn.";
  }
  if (title.includes("Type")) {
    return "Hiểu cơ cấu loại công việc trong nhóm đang xem để phục vụ phân bổ nguồn lực và so sánh sản lượng.";
  }
  return "Biến dữ liệu task thành một cơ cấu dễ đọc, giúp quản lý phát hiện nhóm chiếm tỷ trọng lớn hoặc bất thường và mở dữ liệu dẫn chứng để kiểm tra.";
}

function dashboardHelp(title: string): DashboardHelp {
  const exact: Record<string, Omit<DashboardHelp, "title">> = {
    "Task trong kỳ": {
      purpose: "Cho biết tổng khối lượng task thuộc khoảng ngày đang lọc.",
      calculation: "Task bắt đầu trong kỳ + carry-in. Carry-in là task bắt đầu ngoài kỳ nhưng hoàn thành trong kỳ. Không chọn ngày thì lấy toàn bộ task.",
      example: "Lọc 01–07/08: có 200 task bắt đầu trong kỳ và 15 task cũ hoàn thành trong kỳ → tổng 215 task.",
    },
    "Task thiếu thông tin": {
      purpose: "Phát hiện task chưa đủ dữ liệu để giao việc và theo dõi.",
      calculation: "Đếm hợp của hai nhóm: chưa có Ngày Bắt Đầu hoặc chưa có Assignee. Một task thiếu cả hai chỉ được tính một lần.",
      example: "10 task thiếu ngày, 6 task thiếu người và 2 task thiếu cả hai → card hiển thị 14.",
    },
    "Task tồn tại mốc chọn": {
      purpose: "Cho biết lượng task còn tồn trước ngày mốc độc lập.",
      calculation: "Ngày Bắt Đầu ≤ mốc và trạng thái hiện tại không thuộc Done, Archived, Pending/Cancel, Kinh Doanh Done. Task chưa có ngày bắt đầu không nằm trong chỉ số này.",
      example: "Mốc 01/08, task bắt đầu 30/07 và đang In Progress được tính; task không có ngày bắt đầu không được tính.",
      note: "Chỉ số dùng trạng thái hiện tại, không tái dựng trạng thái lịch sử tại ngày mốc.",
    },
    "Leaderboard thời gian": {
      purpose: "Xếp hạng tải công việc dự kiến theo nhân sự.",
      calculation: "Cộng toàn bộ Số phút dự kiến của task vào từng Assignee. Task nhiều người được cộng nguyên số phút cho từng người; có thể quy đổi 60 phút = 1 giờ, 480 phút = 1 ngày.",
      example: "Bảo Ngân 300 phút; task Bảo Ngân, Hiếu 150 phút → Bảo Ngân 450, Hiếu 150.",
    },
    "Tiến độ hoàn thành": {
      purpose: "Theo dõi tiến độ từng Bộ Sưu Tập của tháng đã chọn.",
      calculation: "Chỉ lấy task có ô BST chứa tháng đã chọn. Vòng task = task Done/Kinh Doanh Done ÷ tổng task; vòng phút = phút dự kiến của task Done/Kinh Doanh Done ÷ tổng phút dự kiến.",
      example: "BST 08.2026 có 100 task, 80 Done → 80%. Nếu 8.000/10.000 phút thuộc task Done → 80% theo phút.",
      note: "Rê vào từng vòng cha để xem các vòng con theo đúng tiêu chí của vòng đó.",
    },
    "Số task thực hiện & số lần trả về": {
      purpose: "So sánh khối lượng thực hiện và phản hồi theo từng nhân sự.",
      calculation: "Tổng task = bắt đầu trong kỳ + carry-in. Task nhiều assignee được tính cho từng người. Lần trả về là số dòng lịch sử phản hồi nằm trong kỳ gắn với người đó.",
      example: "Một task của An và Bình được tính 1 cho An và 1 cho Bình; task có 3 dòng phản hồi thì cộng 3 lần trả về.",
    },
    "Tình trạng task": {
      purpose: "Biểu đồ cơ cấu task theo trạng thái hiện tại như In Progress, Checking, Reviewing hoặc Done.",
      calculation: "Chọn một trong ba phạm vi Bắt đầu trong kỳ, Carry-in hoặc cả hai; tùy chọn Trừ Outsource áp dụng độc lập. Mỗi task được đếm một lần theo trạng thái hiện tại.",
      example: "Trong 200 task của phạm vi chọn có 80 Done → lát Done là 80 task, tương đương 40%.",
    },
    "Đánh giá bàn giao": {
      purpose: "Biểu đồ phân bổ kết quả ở cột Đánh giá bàn giao của các task thuộc phạm vi chọn.",
      calculation: "Nhóm từng task theo giá trị Đánh giá bàn giao; ô rỗng được gom thành Chưa xác định. Phạm vi task và Trừ Outsource được chọn độc lập.",
      example: "Có 60 Đạt trên tổng 100 task → lát Đạt hiển thị 60 và 60%.",
    },
    "Đánh giá tổng": {
      purpose: "Biểu đồ phân bổ kết quả ở cột Đánh giá tổng sau khi task đi qua toàn bộ quy trình.",
      calculation: "Nhóm mỗi task theo Đánh giá tổng; ô rỗng được gom thành Chưa xác định. Phạm vi task và Trừ Outsource được chọn độc lập.",
      example: "Có 75 Tốt trên tổng 120 task → lát Tốt hiển thị 75 và 62,5%.",
    },
    "Trạng thái task tồn": {
      purpose: "Cơ cấu các task tồn tại mốc theo trạng thái hiện tại.",
      calculation: "Trước tiên lấy task có Ngày Bắt Đầu ≤ mốc và loại trạng thái hoàn tất; sau đó nhóm số task còn lại theo trạng thái.",
      example: "Có 40 task tồn, trong đó 18 In Progress → lát In Progress là 18 và 45%.",
      note: "Task chưa có ngày bắt đầu không nằm trong task tồn; trạng thái dùng là trạng thái hiện tại.",
    },
    "Task theo Type": {
      purpose: "Biểu đồ số lượng task được phân loại theo cột Type.",
      calculation: "Lấy task thuộc bộ lọc chung rồi nhóm theo Type; một task được tính một lần. Type rỗng được gom vào Chưa xác định.",
      example: "Type Social có 45 trong tổng 150 task → cột Social là 45 task.",
    },
    "Task theo công đoạn": {
      purpose: "Biểu đồ cơ cấu task theo công đoạn sản xuất hoặc xử lý.",
      calculation: "Lấy task theo phạm vi chọn, có thể trừ outsource, rồi nhóm theo cột Công đoạn.",
      example: "Graphic Design có 80 trên 200 task → lát này là 80 và 40%.",
    },
    "Task Outsource": {
      purpose: "Cho biết bao nhiêu task được giao ra ngoài và giao cho ai.",
      calculation: "Lấy task có ô Outsource không rỗng; mỗi lát là một tên outsource. Giá trị chung “Outsource” được xếp vào Chưa xác định người outsource.",
      example: "A có 12 task, B có 8 task → tổng 20, hai lát lần lượt 60% và 40%.",
    },
    "Cycle time theo ngày": {
      purpose: "Đo số ngày lịch từ Ngày Bắt Đầu đến Ngày Hoàn Thành.",
      calculation: "Chỉ lấy task đã hoàn thành trong bộ lọc và có đủ hai ngày; xếp vào các khoảng ngày trên biểu đồ.",
      example: "Bắt đầu 01/08, hoàn thành 04/08 → cycle time 3 ngày.",
    },
    "Aging task đang mở": {
      purpose: "Nhận diện task mở lâu tính đến hôm nay.",
      calculation: "Task có ngày bắt đầu, trạng thái hiện tại chưa hoàn tất; aging = hôm nay − ngày bắt đầu.",
      example: "Task bắt đầu 01/08, đến 11/08 vẫn In Progress → aging 10 ngày.",
      note: "Đây là tuổi task đang mở, không phải thời gian thực tế nhân sự thao tác.",
    },
    "Đối chiếu kế hoạch với định mức 1.7": {
      purpose: "Đối chiếu Số phút dự kiến được nhập trên Tasklist với số phút chuẩn tham chiếu trong bảng 1.7.",
      calculation: "Map Format Type + Công đoạn sang định mức rồi phân loại phút dự kiến bằng, thấp hoặc cao hơn phút chuẩn. Đây không phải thời gian làm việc thực tế.",
      example: "Chuẩn tham chiếu 60 phút, Tasklist nhập dự kiến 75 phút → kế hoạch đang cao hơn chuẩn 15 phút; không có nghĩa nhân sự thực tế làm chậm 15 phút.",
      note: "Không dùng biểu đồ này để kết luận nhân sự đạt hay không đạt định mức. Muốn đánh giá năng suất cần có timestamp bắt đầu làm thực tế, kết thúc thực tế và thời gian tạm dừng.",
    },
  };
  if (exact[title]) return { title, ...exact[title] };

  if (title.includes("Checking") || title.includes("Reviewing")) {
    return {
      title,
      purpose: "Đo thời gian xử lý ở bước kiểm duyệt trong giờ làm việc.",
      calculation: "Tính thời gian giữa hai mốc ghi trên card, chỉ trong Thứ 2–Thứ 7, 08:30–12:00 và 13:00–17:30, loại ngày nghỉ lễ Việt Nam đã cấu hình. P50 là trung vị; P90 là mốc 90% task không vượt quá.",
      example: "Checking 17:00, Done 09:30 hôm sau → tính 30 phút chiều + 60 phút sáng = 90 phút.",
      note: "Reviewing mới dùng gần đây nên mẫu cũ có thể thiếu mốc; ngưỡng 15 phút hiện là chỉ số thử nghiệm.",
    };
  }
  if (title === "P50 hoàn thành") {
    return {
      title,
      purpose: "Cho biết một task điển hình mất bao lâu để hoàn thành.",
      calculation: "Trung vị số ngày lịch từ Ngày Bắt Đầu đến Ngày Hoàn Thành của cohort hoàn thành trong kỳ.",
      example: "5 task có cycle time 1, 2, 3, 7, 10 ngày → P50 = 3 ngày.",
    };
  }
  if (title === "Task đang mở có ngày bắt đầu") {
    return {
      title,
      purpose: "Cho biết quy mô và tuổi trung vị của nhóm task đang mở.",
      calculation: "Lấy task chưa ở trạng thái hoàn tất và có Ngày Bắt Đầu; số lớn là lượng task, ghi chú P50 là aging trung vị.",
      example: "Aging 1, 3, 5 task → P50 = 3 ngày.",
    };
  }
  if (title === "Độ phủ định mức tham chiếu") {
    return {
      title,
      purpose: "Đánh giá tỷ lệ task map được với bảng định mức 1.7.",
      calculation: "Số task tìm được định mức theo Format Type + Công đoạn ÷ tổng task cần kiểm tra.",
      example: "Map được 80 trên 100 task → coverage 80%.",
    };
  }
  if (title.includes("Format Type") || title.includes("Type")) {
    return {
      title,
      purpose: "Phân bổ số task theo nhóm dữ liệu được ghi trên card.",
      calculation: "Mỗi task phù hợp phạm vi lọc được đếm một lần vào giá trị trường tương ứng; biểu đồ hiển thị cả số lượng và tỷ lệ trên tổng.",
      example: "Video 30 trên tổng 100 task → lát Video hiển thị 30 và 30%.",
    };
  }
  return {
    title,
    purpose: "Giải thích cách hình thành số liệu của biểu đồ này.",
    calculation: "Lấy các task theo bộ lọc ngày và phạm vi đã chọn, sau đó nhóm theo trường thể hiện trên từng lát/cột. Tùy chọn Trừ Outsource được áp dụng độc lập.",
    example: "Có 100 task phù hợp, nhóm A có 25 task → nhóm A hiển thị 25 và 25%.",
  };
}

function HelpButton({ help }: { help: DashboardHelp }) {
  const openHelp = useContext(HelpContext);
  return (
    <span
      className="helpButton"
      role="button"
      tabIndex={0}
      aria-label={`Giải thích ${help.title}`}
      title="Xem cách tính"
      onClick={(event) => {
        event.stopPropagation();
        openHelp(help);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          openHelp(help);
        }
      }}
    >
      ?
    </span>
  );
}

function HelpDialog({ help, onClose }: { help: DashboardHelp; onClose: () => void }) {
  return (
    <div className="helpOverlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="helpDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-help-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="helpClose" onClick={onClose} aria-label="Đóng">×</button>
        <span className="chartKicker">CÁCH ĐỌC DASHBOARD</span>
        <h2 id="dashboard-help-title">{help.title}</h2>
        <section><h3>Đây là gì?</h3><p>{help.purpose}</p></section>
        <section className="helpObjective"><h3>Mục tiêu quản trị</h3><p>{help.objective ?? dashboardObjective(help.title)}</p></section>
        <section><h3>Cách tính</h3><p>{help.calculation}</p></section>
        <section className="helpExample"><h3>Ví dụ</h3><p>{help.example}</p></section>
        {help.note && <section><h3>Lưu ý</h3><p>{help.note}</p></section>}
      </aside>
    </div>
  );
}

const COLORS = [
  "#174f3d",
  "#8fbf45",
  "#d9ff72",
  "#f3b562",
  "#d46b5f",
  "#79a7a0",
  "#7b72b7",
  "#b7a992",
  "#325d88",
  "#cd7da4",
];

const EXCLUDED_BACKLOG_STATUSES = new Set([
  "done",
  "archived",
  "pending / cancel",
  "pending/cancel",
  "kinh doanh done",
]);

const VIETNAM_HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-04-27",
  "2026-04-30",
  "2026-05-01",
  "2026-09-01",
  "2026-09-02",
]);

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedKey(value: unknown) {
  return normalize(value).toLocaleLowerCase("vi");
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function inputDate(value: string, end = false) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return end ? endOfDay(date) : startOfDay(date);
}

function dateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function businessMinutesBetween(start: Date | null, end: Date | null) {
  if (!start || !end || end <= start) return null;
  let total = 0;
  const day = startOfDay(start);
  const lastDay = startOfDay(end);
  while (day <= lastDay) {
    const weekday = day.getDay();
    if (
      weekday !== 0 &&
      !VIETNAM_HOLIDAYS_2026.has(dateKey(day))
    ) {
      const intervals = [
        [8, 30, 12, 0],
        [13, 0, 17, 30],
      ];
      for (const [startHour, startMinute, endHour, endMinute] of intervals) {
        const intervalStart = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          startHour,
          startMinute,
        );
        const intervalEnd = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          endHour,
          endMinute,
        );
        const overlapStart = Math.max(start.getTime(), intervalStart.getTime());
        const overlapEnd = Math.min(end.getTime(), intervalEnd.getTime());
        if (overlapEnd > overlapStart) {
          total += (overlapEnd - overlapStart) / 60000;
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return total;
}

function calendarDaysBetween(start: Date | null, end: Date | null) {
  if (!start || !end || end < start) return null;
  return Math.floor(
    (startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000,
  );
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index];
}

function formatSlaMinutes(minutes: number) {
  return `${formatNumber(Math.round(minutes))} phút`;
}

function excelDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const utc = Math.round((value - 25569) * 86400 * 1000);
    const date = new Date(utc);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object") {
    const candidate = value as {
      result?: unknown;
      text?: string;
      richText?: Array<{ text?: string }>;
    };
    if (candidate.result != null) return excelDate(candidate.result);
    if (candidate.text) return excelDate(candidate.text);
    if (candidate.richText) {
      return excelDate(candidate.richText.map((item) => item.text ?? "").join(""));
    }
  }

  const text = normalize(value);
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const ymd = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cellValue(value: unknown): unknown {
  if (value == null) return "";
  if (value instanceof Date || typeof value !== "object") return value;
  const cell = value as {
    result?: unknown;
    text?: string;
    hyperlink?: string;
    richText?: Array<{ text?: string }>;
  };
  if (cell.result != null) return cell.result;
  if (cell.text != null) return cell.text;
  if (cell.richText) return cell.richText.map((item) => item.text ?? "").join("");
  if (cell.hyperlink) return cell.hyperlink;
  return String(value);
}

function inWindow(date: Date | null, window: DateWindow) {
  if (!window.hasFilter) return true;
  if (!date) return false;
  if (window.from && date < window.from) return false;
  if (window.to && date > window.to) return false;
  return true;
}

function classifyTask(task: Task, window: DateWindow) {
  if (!window.hasFilter) {
    return {
      included: true,
      started: Boolean(task.startDate),
      carried: false,
    };
  }
  const started = inWindow(task.startDate, window);
  const carried =
    Boolean(task.completedDate) &&
    inWindow(task.completedDate, window) &&
    Boolean(task.startDate) &&
    !inWindow(task.startDate, window);
  return { included: started || carried, started, carried };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatHours(minutes: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(minutes / 60)} giờ`;
}

function formatMinutes(minutes: number) {
  return `${formatNumber(minutes)} phút`;
}

function formatWorkDays(minutes: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(minutes / 480)} ngày`;
}

function formatPercent(value: number, total: number) {
  if (!total) return "0%";
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format((value / total) * 100)}%`;
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(value);
}

function matchesGroup(value: string, label: string) {
  return (normalize(value) || "Chưa xác định") === label;
}

function assigneeNames(value: string) {
  const names = [
    ...new Set(
      value
        .split(",")
        .map(normalize)
        .filter(Boolean),
    ),
  ];
  return names.length ? names : ["Chưa có assignee"];
}

function isVideoPublication(task: Task) {
  return (
    normalizedKey(task.formatType).includes("video") &&
    normalizedKey(task.stage) === "edit"
  );
}

function isGraphicPublication(task: Task) {
  return (
    !normalizedKey(task.formatType).includes("video") &&
    normalizedKey(task.stage) === "graphic design"
  );
}

function normMinutesFor(task: Task, norms: Map<string, WorkNorm>) {
  const norm = norms.get(normalizedKey(task.formatType));
  if (!norm) return null;
  const stage = normalizedKey(task.stage);
  if (stage === "quay" || stage === "chụp") return norm.recordMinutes || null;
  if (stage === "edit") return norm.editMinutes || null;
  if (stage === "graphic design") return norm.graphicMinutes || null;
  if (stage === "viết content") return norm.contentMinutes || null;
  return null;
}

function cycleBucket(days: number) {
  if (days === 0) return "Hoàn thành cùng ngày";
  if (days === 1) return "Sau 1 ngày";
  if (days <= 3) return "2–3 ngày";
  if (days <= 5) return "4–5 ngày";
  return "Trên 5 ngày";
}

function agingBucket(days: number) {
  if (days === 0) return "Bắt đầu hôm nay";
  if (days === 1) return "1 ngày";
  if (days <= 3) return "2–3 ngày";
  if (days <= 7) return "4–7 ngày";
  return "Trên 7 ngày";
}

function groupCount<T>(rows: T[], key: (row: T) => string) {
  const result = new Map<string, number>();
  for (const row of rows) {
    const label = normalize(key(row)) || "Chưa xác định";
    result.set(label, (result.get(label) ?? 0) + 1);
  }
  return [...result.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function collectionMonths(task: Task) {
  return [...new Set(task.collection.match(/\d{2}\.\d{4}/g) ?? [])];
}

function collectionNames(task: Task, month: string) {
  return [
    ...new Set(
      task.collection
        .split(",")
        .map(normalize)
        .filter((name) => name && name.includes(month)),
    ),
  ];
}

function isCollectionDone(task: Task) {
  const status = normalizedKey(task.status);
  return status === "done" || status === "kinh doanh done";
}

function outsourceName(task: Task) {
  return normalizedKey(task.outsource) === "outsource"
    ? "Chưa xác định người outsource"
    : task.outsource;
}

function PieChart({
  title,
  data,
  centerLabel,
  compact = false,
  onSelect,
  scope,
  onScopeChange,
  excludeOutsource = false,
  onExcludeOutsourceChange,
  className = "",
  help,
  hoverBreakdown,
}: {
  title: string;
  data: PieDatum[];
  centerLabel?: string;
  compact?: boolean;
  onSelect?: (label: string) => void;
  scope?: PieScope;
  onScopeChange?: (scope: PieScope) => void;
  excludeOutsource?: boolean;
  onExcludeOutsourceChange?: (checked: boolean) => void;
  className?: string;
  help?: DashboardHelp;
  hoverBreakdown?: (label: string) => {
    title: string;
    data: PieDatum[];
  } | null;
}) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient = total
    ? data
        .map((item, index) => {
          const start = (cursor / total) * 100;
          cursor += item.value;
          const end = (cursor / total) * 100;
          return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
        })
        .join(",")
    : "#e4e3dc 0 100%";
  const linkedBreakdown =
    hoveredSlice && hoverBreakdown ? hoverBreakdown(hoveredSlice) : null;

  function sliceAtPoint(
    event: MouseEvent<HTMLDivElement>,
  ): PieDatum | undefined {
    if (!total) return undefined;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(x, y) < rect.width * 0.27) return undefined;
    const angle = (Math.atan2(x, -y) * 180) / Math.PI;
    const position = (((angle + 360) % 360) / 360) * total;
    let running = 0;
    return data.find((item) => {
      running += item.value;
      return position <= running;
    });
  }

  return (
    <article className={`chartCard pieCard ${compact ? "compact" : ""} ${className}`}>
      <div className="chartTitle">
        <div>
          <span className="chartKicker">PHÂN BỔ</span>
          <h3>{title}</h3>
        </div>
        <div className="pieTitleTools">
          {scope && onScopeChange && (
            <select
              value={scope}
              onChange={(event) => onScopeChange(event.target.value as PieScope)}
              aria-label={`Phạm vi ${title}`}
            >
              <option value="started">Task trong tuần</option>
              <option value="carried">Carry-in</option>
              <option value="combined">Task trong tuần + Carry-in</option>
            </select>
          )}
          {scope && onExcludeOutsourceChange && (
            <label className="excludeOutsourceToggle">
              <input
                type="checkbox"
                checked={excludeOutsource}
                onChange={(event) =>
                  onExcludeOutsourceChange(event.target.checked)
                }
              />
              Trừ Outsource
            </label>
          )}
          <strong>{formatNumber(total)}</strong>
          <HelpButton help={help ?? dashboardHelp(title)} />
        </div>
      </div>
      <div className="pieLayout">
        <div
          className={`pie ${onSelect ? "interactive" : ""}`}
          style={{ background: `conic-gradient(${gradient})` }}
          role={onSelect ? "group" : undefined}
          aria-label={onSelect ? `${title} — bấm vào lát biểu đồ để xem chi tiết` : undefined}
          onClick={(event) => {
            if (!onSelect || !total) return;
            const selected = sliceAtPoint(event);
            if (selected) onSelect(selected.label);
          }}
          onMouseMove={(event) => {
            if (!hoverBreakdown) return;
            setHoveredSlice(sliceAtPoint(event)?.label ?? null);
          }}
          onMouseLeave={() => setHoveredSlice(null)}
        >
          <div className="pieHole">
            <strong>{formatNumber(total)}</strong>
            <span>{centerLabel ?? "task"}</span>
          </div>
        </div>
        <div className="legend">
          {data.slice(0, 10).map((item, index) => (
            <button
              type="button"
              className={`legendRow ${onSelect ? "interactive" : ""}`}
              key={item.label}
              onClick={() => onSelect?.(item.label)}
              onMouseEnter={() => hoverBreakdown && setHoveredSlice(item.label)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <i style={{ background: COLORS[index % COLORS.length] }} />
              <span title={item.label}>{item.label}</span>
              <strong>
                {formatNumber(item.value)}
                <small>{formatPercent(item.value, total)}</small>
              </strong>
            </button>
          ))}
          {!data.length && <p className="emptyText">Chưa có dữ liệu phù hợp.</p>}
        </div>
      </div>
      {linkedBreakdown && (
        <div className="linkedBreakdown" role="tooltip">
          <span className="chartKicker">GÓC NHÌN LIÊN KẾT</span>
          <h4>{linkedBreakdown.title}</h4>
          <div>
            {linkedBreakdown.data.map((item, index) => {
              const breakdownTotal = linkedBreakdown.data.reduce(
                (sum, row) => sum + row.value,
                0,
              );
              return (
                <span key={item.label}>
                  <i style={{ background: COLORS[index % COLORS.length] }} />
                  <em>{item.label}</em>
                  <strong>{formatNumber(item.value)}</strong>
                  <small>{formatPercent(item.value, breakdownTotal)}</small>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function ProgressDonut({
  title,
  done,
  total,
  unit,
  onSelect,
}: {
  title: string;
  done: number;
  total: number;
  unit: string;
  onSelect?: (scope: "done" | "all") => void;
}) {
  const percent = total ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div
      className={`progressPanel ${onSelect ? "interactive" : ""}`}
      style={{ minHeight: 304, height: 304 }}
    >
      <div
        className="progressDonut"
        style={{
          background: `conic-gradient(var(--lime) 0 ${percent}%, rgba(255,255,255,.16) ${percent}% 100%)`,
        }}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-label={onSelect ? `${title}: xem các task đã hoàn thành` : undefined}
        onClick={() => onSelect?.("done")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelect?.("done");
        }}
      >
        <div>
          <strong>{Math.round(percent)}%</strong>
          <span>hoàn thành</span>
        </div>
      </div>
      <button type="button" className="progressSummary" onClick={() => onSelect?.("all")}>
        <span className="chartKicker">{title}</span>
        <h3>
          {formatNumber(done)} <small>/ {formatNumber(total)} {unit}</small>
        </h3>
      </button>
    </div>
  );
}

function MiniProgressDonut({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const percent = total ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div className="miniProgress">
      <div
        className="miniDonut"
        style={{
          width: 82,
          height: 82,
          background: `conic-gradient(var(--lime) 0 ${percent}%, rgba(255,255,255,.16) ${percent}% 100%)`,
        }}
      >
        <div>{Math.round(percent)}%</div>
      </div>
      <span>{label}</span>
      <small>{formatNumber(done)} / {formatNumber(total)}</small>
    </div>
  );
}

type ChildCollection = {
  name: string;
  tasks: Task[];
  doneTasks: Task[];
  taskTotal: number;
  taskDone: number;
  minuteTotal: number;
  minuteDone: number;
};

function CollectionChildrenPanel({
  month,
  metric,
  rows,
  onSelect,
}: {
  month: string;
  metric: "tasks" | "minutes";
  rows: ChildCollection[];
  onSelect: (child: ChildCollection) => void;
}) {
  const isTasks = metric === "tasks";
  return (
    <div className={`metricChildren ${metric}`} role="tooltip">
      <div className="metricChildrenHeader">
        <div>
          <span className="chartKicker">BST CON · {month}</span>
          <strong>{isTasks ? "Tiến độ theo số task" : "Tiến độ theo tổng phút"}</strong>
        </div>
      </div>
      <div className="metricChildrenGrid">
        {rows.map((child) => (
          <button
            type="button"
            className="metricChild"
            key={child.name}
            onClick={() => onSelect(child)}
          >
            <strong title={child.name}>{child.name}</strong>
            <MiniProgressDonut
              label={isTasks ? "Task" : "Phút"}
              done={isTasks ? child.taskDone : child.minuteDone}
              total={isTasks ? child.taskTotal : child.minuteTotal}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({
  title,
  subtitle,
  rows,
  format = formatNumber,
  onSelect,
  tooltip,
  headerAction,
  className = "",
  help,
}: {
  title: string;
  subtitle: string;
  rows: PieDatum[];
  format?: (value: number) => string;
  onSelect?: (label: string) => void;
  tooltip?: (value: number) => string;
  headerAction?: ReactNode;
  className?: string;
  help?: DashboardHelp;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <article className={`chartCard ${className}`}>
      <div className="chartTitle">
        <div>
          <span className="chartKicker">{subtitle}</span>
          <h3>{title}</h3>
        </div>
        <div className="chartHeaderTools">
          {headerAction}
          <HelpButton help={help ?? dashboardHelp(title)} />
        </div>
      </div>
      <div className="horizontalBars">
        {rows.slice(0, 15).map((row, index) => (
          <button
            type="button"
            className={`horizontalRow ${onSelect ? "interactive" : ""}`}
            key={row.label}
            onClick={() => onSelect?.(row.label)}
          >
            <span className="rank">{String(index + 1).padStart(2, "0")}</span>
            <span className="barLabel" title={row.label}>{row.label}</span>
            <div className="barTrack">
              <i style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
            </div>
            <strong
              className={tooltip ? "valueTooltip" : undefined}
              data-tooltip={tooltip?.(row.value)}
              tabIndex={tooltip ? 0 : undefined}
            >
              {format(row.value)}
            </strong>
          </button>
        ))}
        {!rows.length && <p className="emptyText">Chưa có dữ liệu phù hợp.</p>}
      </div>
    </article>
  );
}

function StaffColumns({
  rows,
  onSelect,
  className = "",
}: {
  rows: Array<{
    name: string;
    total: number;
    started: number;
    carried: number;
    feedback: number;
  }>;
  onSelect?: (name: string, metric: "total" | "started" | "carried" | "feedback") => void;
  className?: string;
}) {
  const max = Math.max(
    ...rows.flatMap((row) => [row.total, row.started, row.carried, row.feedback]),
    1,
  );
  return (
    <article className={`chartCard fullWidth ${className}`}>
      <div className="chartTitle">
        <div>
          <span className="chartKicker">NHÂN SỰ</span>
          <h3>Số task thực hiện &amp; số lần trả về</h3>
        </div>
        <div className="columnLegend">
          <span><i className="c1" />Tổng task</span>
          <span><i className="c2" />Bắt đầu trong kỳ</span>
          <span><i className="c3" />Carry-in hoàn thành</span>
          <span><i className="c4" />Lần trả về</span>
          <HelpButton help={dashboardHelp("Số task thực hiện & số lần trả về")} />
        </div>
      </div>
      <div className="columnScroller">
        <div className="columnChart" style={{ minWidth: `${Math.max(780, rows.length * 94)}px` }}>
          {rows.map((row) => (
            <div className="columnGroup" key={row.name}>
              <div className="columns">
                {([
                  ["total", row.total],
                  ["started", row.started],
                  ["carried", row.carried],
                  ["feedback", row.feedback],
                ] as const).map(([metric, value], index) => (
                  <button
                    type="button"
                    key={index}
                    className={`column c${index + 1}`}
                    style={{ height: `${Math.max(value ? 8 : 0, (value / max) * 220)}px` }}
                    title={`${value}`}
                    onClick={() => onSelect?.(row.name, metric)}
                  >
                    {value > 0 && <span>{value}</span>}
                  </button>
                ))}
              </div>
              <span className="columnName" title={row.name}>{row.name}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function DetailDrawer({
  detail,
  onClose,
}: {
  detail: DetailView;
  onClose: () => void;
}) {
  const count = detail.feedback?.length ?? detail.tasks?.length ?? 0;
  return (
    <div className="detailOverlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="detailDrawer"
        role="dialog"
        aria-modal="true"
        aria-label={detail.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detailHeader">
          <div>
            <span className="chartKicker">DỮ LIỆU DẪN CHỨNG</span>
            <h2>{detail.title}</h2>
            <p>{detail.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng chi tiết">×</button>
        </header>
        <div className="detailCount">
          <strong>{formatNumber(count)}</strong>
          <span>{detail.feedback ? "lần phản hồi" : "task"}</span>
        </div>
        <div className="detailTableWrap">
          {detail.feedback ? (
            <table className="detailTable">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Tên task</th>
                  <th>Người làm</th>
                  <th>Thời điểm</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {detail.feedback.map((item, index) => (
                  <tr key={`${item.taskCode}-${item.at?.getTime() ?? "none"}-${index}`}>
                    <td><strong>{item.taskCode}</strong></td>
                    <td>{item.task?.title || "—"}</td>
                    <td>{item.assignee || item.task?.assignee || "—"}</td>
                    <td>{formatDate(item.at)}</td>
                    <td>{item.task?.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="detailTable">
              <thead>
                <tr>
                  <th>Công việc</th>
                  <th>Tên task</th>
                  <th>Assignee</th>
                  <th>Trạng thái</th>
                  <th>Bắt đầu</th>
                  <th>Hoàn thành</th>
                  <th>Phút</th>
                </tr>
              </thead>
              <tbody>
                {(detail.tasks ?? []).map((task, index) => (
                  <tr key={`${task.code}-${index}`}>
                    <td><strong>{task.code}</strong></td>
                    <td>{task.title || "—"}</td>
                    <td>{task.assignee || "Chưa có assignee"}</td>
                    <td>{task.status || "Chưa xác định"}</td>
                    <td>{formatDate(task.startDate)}</td>
                    <td>{formatDate(task.completedDate)}</td>
                    <td>{formatNumber(task.expectedMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!count && <p className="detailEmpty">Không có bản ghi phù hợp.</p>}
        </div>
      </aside>
    </div>
  );
}

function SlaMetricCard({
  kicker,
  title,
  value,
  note,
  onClick,
  help,
}: {
  kicker: string;
  title: string;
  value: string;
  note: string;
  onClick?: () => void;
  help?: DashboardHelp;
}) {
  return (
    <button
      type="button"
      className={`slaMetric ${onClick ? "interactive" : ""}`}
      onClick={onClick}
    >
      <HelpButton help={help ?? dashboardHelp(title)} />
      <span>{kicker}</span>
      <small>{title}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </button>
  );
}

export function Dashboard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [collectionMonth, setCollectionMonth] = useState("");
  const [leaderboardUnit, setLeaderboardUnit] = useState<
    "minutes" | "hours" | "days"
  >("minutes");
  const [pieScopes, setPieScopes] = useState<Record<string, PieScope>>({});
  const [pieExcludeOutsource, setPieExcludeOutsource] = useState<
    Record<string, boolean>
  >({});
  const [backlogDate, setBacklogDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [activeHelp, setActiveHelp] = useState<DashboardHelp | null>(null);

  const dateWindow = useMemo<DateWindow>(
    () => ({
      from: inputDate(dateFrom),
      to: inputDate(dateTo, true),
      hasFilter: Boolean(dateFrom || dateTo),
    }),
    [dateFrom, dateTo],
  );

  async function loadWorkbook(file: File) {
    setLoading(true);
    setError("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const taskSheet = workbook.getWorksheet("2.6 Tasklist");
      const feedbackSheet = workbook.getWorksheet("2.9 Lịch sử phản hồi Task");
      const normSheet = workbook.getWorksheet("1.7 Định Mức");
      if (!taskSheet || !feedbackSheet) {
        throw new Error(
          "Không tìm thấy sheet “2.6 Tasklist” hoặc “2.9 Lịch sử phản hồi Task”.",
        );
      }

      function headersFor(sheet: import("exceljs").Worksheet) {
        const headers = new Map<string, number>();
        sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
          headers.set(normalizedKey(cellValue(cell.value)), column);
        });
        return headers;
      }

      function valueAt(
        row: import("exceljs").Row,
        headers: Map<string, number>,
        name: string,
      ) {
        const column = headers.get(normalizedKey(name));
        return column ? cellValue(row.getCell(column).value) : "";
      }

      const taskHeaders = headersFor(taskSheet);
      const tasks: Task[] = [];
      for (let index = 2; index <= taskSheet.actualRowCount; index += 1) {
        const row = taskSheet.getRow(index);
        const code = normalize(valueAt(row, taskHeaders, "Công việc"));
        if (!code) continue;
        tasks.push({
          code,
          title: normalize(valueAt(row, taskHeaders, "Tên Task")),
          stage: normalize(valueAt(row, taskHeaders, "Công đoạn")),
          formatType: normalize(valueAt(row, taskHeaders, "Format Type")),
          productCode: normalize(valueAt(row, taskHeaders, "Mã sản phẩm")),
          collection: normalize(valueAt(row, taskHeaders, "Bộ Sưu Tập")),
          expectedMinutes: numberValue(
            valueAt(row, taskHeaders, "Số phút dự kiến"),
          ),
          status: normalize(valueAt(row, taskHeaders, "Trạng thái")),
          assignee: normalize(valueAt(row, taskHeaders, "Assignee")),
          startDate: excelDate(valueAt(row, taskHeaders, "Ngày Bắt Đầu")),
          completedDate: excelDate(
            valueAt(row, taskHeaders, "Ngày Hoàn Thành"),
          ),
          inspectionDate: excelDate(
            valueAt(row, taskHeaders, "Ngày Kiểm Duyệt"),
          ),
          receivedCheckingDate: excelDate(
            valueAt(row, taskHeaders, "Ngày Nhận Checking"),
          ),
          handoffRating: normalize(
            valueAt(row, taskHeaders, "Đánh Giá Bàn Giao"),
          ),
          overallRating: normalize(
            valueAt(row, taskHeaders, "Đánh Giá Tổng"),
          ),
          type: normalize(valueAt(row, taskHeaders, "Type")),
          outsource: normalize(valueAt(row, taskHeaders, "Outsource")),
        });
      }

      const feedbackHeaders = headersFor(feedbackSheet);
      const feedback: Feedback[] = [];
      for (let index = 2; index <= feedbackSheet.actualRowCount; index += 1) {
        const row = feedbackSheet.getRow(index);
        const taskCode = normalize(valueAt(row, feedbackHeaders, "Task"));
        if (!taskCode) continue;
        feedback.push({
          taskCode,
          at: excelDate(valueAt(row, feedbackHeaders, "Thời Điểm")),
          assignee: normalize(
            valueAt(row, feedbackHeaders, "Người Làm Task"),
          ),
        });
      }

      const norms: WorkNorm[] = [];
      if (normSheet) {
        const normHeaders = headersFor(normSheet);
        for (let index = 2; index <= normSheet.actualRowCount; index += 1) {
          const row = normSheet.getRow(index);
          const formatType = normalize(
            valueAt(row, normHeaders, "Tên Định Dạng"),
          );
          if (!formatType) continue;
          norms.push({
            formatType,
            recordMinutes: numberValue(
              valueAt(row, normHeaders, "Thời gian Record (Phút)"),
            ),
            editMinutes: numberValue(
              valueAt(row, normHeaders, "Thời gian Edit (Phút)"),
            ),
            graphicMinutes: numberValue(
              valueAt(row, normHeaders, "Thời gian Graphic"),
            ),
            contentMinutes: numberValue(
              valueAt(row, normHeaders, "Thời gian Viết Content"),
            ),
          });
        }
      }

      setData({ tasks, feedback, norms, fileName: file.name });
      setCollectionMonth("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể đọc file Excel này.",
      );
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const analytics = useMemo(() => {
    if (!data) return null;
    const classified = data.tasks.map((task) => ({
      task,
      ...classifyTask(task, dateWindow),
    }));
    const selectedTasks = classified
      .filter((item) => item.included)
      .map((item) => item.task);
    const startedInWindow = classified.filter((item) => item.started);
    const carriedIntoWindow = classified.filter((item) => item.carried);

    const leaderboard = new Map<string, number>();
    for (const task of selectedTasks) {
      for (const name of assigneeNames(task.assignee)) {
        leaderboard.set(
          name,
          (leaderboard.get(name) ?? 0) + task.expectedMinutes,
        );
      }
    }

    const taskByCode = new Map(data.tasks.map((task) => [task.code, task]));
    const feedbackCount = new Map<string, number>();
    const selectedFeedback = data.feedback.filter((item) =>
      inWindow(item.at, dateWindow),
    );
    for (const item of selectedFeedback) {
      const rawNames = item.assignee || taskByCode.get(item.taskCode)?.assignee;
      if (!rawNames) continue;
      for (const name of assigneeNames(rawNames)) {
        feedbackCount.set(name, (feedbackCount.get(name) ?? 0) + 1);
      }
    }

    const people = new Set<string>();
    classified.forEach((item) => {
      if (item.included && item.task.assignee) {
        assigneeNames(item.task.assignee).forEach((name) => people.add(name));
      }
    });
    feedbackCount.forEach((_, name) => people.add(name));

    const staffRows = [...people]
      .map((name) => {
        const rows = classified.filter(
          (item) =>
            assigneeNames(item.task.assignee).includes(name) && item.included,
        );
        return {
          name,
          total: rows.length,
          started: rows.filter((item) => item.started).length,
          carried: rows.filter((item) => item.carried).length,
          feedback: feedbackCount.get(name) ?? 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const months = [
      ...new Set(data.tasks.flatMap(collectionMonths)),
    ].sort((a, b) => {
      const [am, ay] = a.split(".").map(Number);
      const [bm, by] = b.split(".").map(Number);
      return by - ay || bm - am;
    });

    const collectionTasks = collectionMonth
      ? data.tasks.filter((task) =>
          collectionMonths(task).includes(collectionMonth),
        )
      : [];
    const collectionDone = collectionTasks.filter(isCollectionDone);
    const childCollectionMap = new Map<string, Task[]>();
    for (const task of collectionTasks) {
      for (const name of collectionNames(task, collectionMonth)) {
        const rows = childCollectionMap.get(name) ?? [];
        rows.push(task);
        childCollectionMap.set(name, rows);
      }
    }
    const childCollections = [...childCollectionMap.entries()]
      .map(([name, tasks]) => {
        const doneTasks = tasks.filter(isCollectionDone);
        return {
          name,
          tasks,
          doneTasks,
          taskTotal: tasks.length,
          taskDone: doneTasks.length,
          minuteTotal: tasks.reduce(
            (sum, task) => sum + task.expectedMinutes,
            0,
          ),
          minuteDone: doneTasks.reduce(
            (sum, task) => sum + task.expectedMinutes,
            0,
          ),
        };
      })
      .sort((a, b) => b.taskTotal - a.taskTotal);

    const backlogCutoff = inputDate(backlogDate, true) ?? endOfDay(new Date());
    const backlog = data.tasks.filter((task) => {
      if (!task.startDate || task.startDate > backlogCutoff) return false;
      return !EXCLUDED_BACKLOG_STATUSES.has(normalizedKey(task.status));
    });
    const pieTaskSets: Record<PieScope, Task[]> = {
      started: startedInWindow.map((item) => item.task),
      carried: carriedIntoWindow.map((item) => item.task),
      combined: selectedTasks,
    };
    const metricsFor = (tasks: Task[]) => ({
      tasks,
      status: groupCount(tasks, (task) => task.status),
      handoff: groupCount(tasks, (task) => task.handoffRating),
      overall: groupCount(tasks, (task) => task.overallRating),
      stages: groupCount(tasks, (task) => task.stage),
      outsource: groupCount(
        tasks.filter((task) => Boolean(task.outsource)),
        outsourceName,
      ),
      videoFormats: groupCount(
        tasks.filter(isVideoPublication),
        (task) => task.formatType,
      ),
      videoTypes: groupCount(
        tasks.filter(isVideoPublication),
        (task) => task.type,
      ),
      graphicFormats: groupCount(
        tasks.filter(isGraphicPublication),
        (task) => task.formatType,
      ),
      graphicTypes: groupCount(
        tasks.filter(isGraphicPublication),
        (task) => task.type,
      ),
    });
    const pieMetrics = Object.fromEntries(
      Object.entries(pieTaskSets).map(([scope, tasks]) => [
        scope,
        {
          all: metricsFor(tasks),
          withoutOutsource: metricsFor(
            tasks.filter((task) => !task.outsource),
          ),
        },
      ]),
    ) as Record<
      PieScope,
      {
        all: ReturnType<typeof metricsFor>;
        withoutOutsource: ReturnType<typeof metricsFor>;
      }
    >;

    const completedCohort = data.tasks.filter(
      (task) => task.completedDate && inWindow(task.completedDate, dateWindow),
    );
    const cycleRows = completedCohort
      .map((task) => ({
        task,
        days: calendarDaysBetween(task.startDate, task.completedDate),
      }))
      .filter(
        (row): row is { task: Task; days: number } => row.days !== null,
      );
    const openAgingRows = data.tasks
      .filter(
        (task) =>
          task.startDate &&
          !EXCLUDED_BACKLOG_STATUSES.has(normalizedKey(task.status)),
      )
      .map((task) => ({
        task,
        days: calendarDaysBetween(task.startDate, new Date()),
      }))
      .filter(
        (row): row is { task: Task; days: number } =>
          row.days !== null && row.days >= 0,
      );
    const checkingToDoneRows = completedCohort
      .map((task) => ({
        task,
        minutes: businessMinutesBetween(
          task.inspectionDate,
          task.completedDate,
        ),
      }))
      .filter(
        (row): row is { task: Task; minutes: number } =>
          row.minutes !== null,
      );
    const reviewingRows = completedCohort
      .map((task) => ({
        task,
        queueMinutes: businessMinutesBetween(
          task.inspectionDate,
          task.receivedCheckingDate,
        ),
        reviewMinutes: businessMinutesBetween(
          task.receivedCheckingDate,
          task.completedDate,
        ),
      }))
      .filter(
        (
          row,
        ): row is {
          task: Task;
          queueMinutes: number;
          reviewMinutes: number;
        } => row.queueMinutes !== null && row.reviewMinutes !== null,
      );
    const normMap = new Map(
      data.norms.map((norm) => [normalizedKey(norm.formatType), norm]),
    );
    const normStages = new Set([
      "quay",
      "chụp",
      "edit",
      "graphic design",
      "viết content",
    ]);
    const normRows = selectedTasks
      .filter((task) => normStages.has(normalizedKey(task.stage)))
      .map((task) => {
        const normMinutes = normMinutesFor(task, normMap);
        const label =
          normMinutes === null
            ? "Không map được định mức"
            : Math.abs(task.expectedMinutes - normMinutes) < 0.01
              ? "Phút dự kiến bằng chuẩn"
              : task.expectedMinutes > normMinutes
                ? "Phút dự kiến cao hơn chuẩn"
                : "Phút dự kiến thấp hơn chuẩn";
        return { task, normMinutes, label };
      });
    const mappedNormRows = normRows.filter(
      (
        row,
      ): row is {
        task: Task;
        normMinutes: number;
        label: string;
      } => row.normMinutes !== null,
    );

    return {
      selectedTasks,
      startedInWindow,
      carriedIntoWindow,
      classified,
      selectedFeedback,
      taskByCode,
      collectionTasks,
      collectionDone,
      childCollections,
      backlogTasks: backlog,
      pieMetrics,
      sla: {
        completedCohort,
        cycleRows,
        cycleDistribution: groupCount(cycleRows, (row) =>
          cycleBucket(row.days),
        ),
        cycleP50: percentile(
          cycleRows.map((row) => row.days),
          0.5,
        ),
        cycleP90: percentile(
          cycleRows.map((row) => row.days),
          0.9,
        ),
        openAgingRows,
        agingDistribution: groupCount(openAgingRows, (row) =>
          agingBucket(row.days),
        ),
        checkingToDoneRows,
        checkingToDoneP50: percentile(
          checkingToDoneRows.map((row) => row.minutes),
          0.5,
        ),
        checkingToDoneP90: percentile(
          checkingToDoneRows.map((row) => row.minutes),
          0.9,
        ),
        reviewingRows,
        queueP50: percentile(
          reviewingRows.map((row) => row.queueMinutes),
          0.5,
        ),
        queueP90: percentile(
          reviewingRows.map((row) => row.queueMinutes),
          0.9,
        ),
        reviewP50: percentile(
          reviewingRows.map((row) => row.reviewMinutes),
          0.5,
        ),
        reviewP90: percentile(
          reviewingRows.map((row) => row.reviewMinutes),
          0.9,
        ),
        normRows,
        normDistribution: groupCount(normRows, (row) => row.label),
        normCoverage: normRows.length
          ? (mappedNormRows.length / normRows.length) * 100
          : 0,
        normMapped: mappedNormRows.length,
        normEligible: normRows.length,
        normExpectedMinutes: mappedNormRows.reduce(
          (sum, row) => sum + row.task.expectedMinutes,
          0,
        ),
        normStandardMinutes: mappedNormRows.reduce(
          (sum, row) => sum + row.normMinutes,
          0,
        ),
      },
      leaderboard: [...leaderboard.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      staffRows,
      months,
      missingStart: data.tasks.filter((task) => !task.startDate).length,
      missingAssignee: data.tasks.filter((task) => !task.assignee).length,
      missingEither: data.tasks.filter(
        (task) => !task.startDate || !task.assignee,
      ).length,
      collection: {
        taskDone: collectionDone.length,
        taskTotal: collectionTasks.length,
        minuteDone: collectionDone.reduce(
          (sum, task) => sum + task.expectedMinutes,
          0,
        ),
        minuteTotal: collectionTasks.reduce(
          (sum, task) => sum + task.expectedMinutes,
          0,
        ),
      },
      status: groupCount(selectedTasks, (task) => task.status),
      handoff: groupCount(selectedTasks, (task) => task.handoffRating),
      overall: groupCount(selectedTasks, (task) => task.overallRating),
      types: groupCount(selectedTasks, (task) => task.type),
      stages: groupCount(selectedTasks, (task) => task.stage),
      outsource: groupCount(
        selectedTasks.filter((task) => Boolean(task.outsource)),
        outsourceName,
      ),
      backlog: groupCount(backlog, (task) => task.status),
      backlogTotal: backlog.length,
    };
  }, [data, dateWindow, collectionMonth, backlogDate]);

  function chartScope(key: string): PieScope {
    return pieScopes[key] ?? "combined";
  }

  function setChartScope(key: string, scope: PieScope) {
    setPieScopes((current) => ({ ...current, [key]: scope }));
  }

  function chartMetrics(key: string) {
    if (!analytics) throw new Error("Dashboard data is not loaded.");
    const metrics = analytics.pieMetrics[chartScope(key)];
    return pieExcludeOutsource[key] ? metrics.withoutOutsource : metrics.all;
  }

  function setChartExcludeOutsource(key: string, checked: boolean) {
    setPieExcludeOutsource((current) => ({ ...current, [key]: checked }));
  }

  return (
    <HelpContext.Provider value={setActiveHelp}>
    <main className="dashboard">
      <header className="dashboardHeader">
        <div className="dashboardBrand">
          <span>BB</span>
          <div>
            <strong>Operations Intelligence</strong>
            <small>Task performance dashboard</small>
          </div>
        </div>
        <button className="uploadButton" onClick={() => fileRef.current?.click()}>
          {loading ? "Đang đọc dữ liệu…" : data ? "Đổi file Excel" : "Chọn file Excel"}
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".xlsx"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadWorkbook(file);
          }}
        />
      </header>

      <section className="dashboardHero">
        <div>
          <p className="eyebrow">TASKLIST CONTROL ROOM</p>
          <h1>Hiệu suất công việc,<br />nhìn trong một màn hình.</h1>
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

      {error && <div className="errorBanner">{error}</div>}

      {!data || !analytics ? (
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
      ) : (
        <>
          <section className="filterBar">
            <div className="filterIntro">
              <span className="chartKicker">BỘ LỌC CHUNG</span>
              <strong>{dateWindow.hasFilter ? "Khoảng thời gian tùy chọn" : "Toàn bộ dữ liệu"}</strong>
            </div>
            <label>
              Từ ngày
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <span className="filterArrow">→</span>
            <label>
              Đến ngày
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <label className="backlogFilter">
              Mốc task tồn
              <input
                type="date"
                value={backlogDate}
                onChange={(event) => setBacklogDate(event.target.value)}
              />
              <small>Độc lập · mặc định hôm nay</small>
            </label>
            <button
              className="clearButton"
              disabled={!dateWindow.hasFilter}
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
            >
              Xóa lọc
            </button>
          </section>

          <section className="kpiGrid">
            <button
              type="button"
              className="kpiCard dark interactive"
              onClick={() => setDetail({
                title: "Task trong kỳ",
                subtitle: "Bắt đầu trong kỳ hoặc carry-in hoàn thành trong kỳ",
                tasks: analytics.selectedTasks,
              })}
            >
              <HelpButton help={dashboardHelp("Task trong kỳ")} />
              <span>Task trong kỳ</span>
              <strong>{formatNumber(analytics.selectedTasks.length)}</strong>
              <small>
                <b>{formatNumber(analytics.startedInWindow.length)}</b> bắt đầu trong kỳ
                {" · "}
                <b>{formatNumber(analytics.carriedIntoWindow.length)}</b> carry-in
              </small>
            </button>
            <button
              type="button"
              className="kpiCard interactive"
              onClick={() => setDetail({
                title: "Task thiếu thông tin",
                subtitle: "Chưa có Ngày Bắt Đầu hoặc chưa có Assignee",
                tasks: data.tasks.filter((task) => !task.startDate || !task.assignee),
              })}
            >
              <HelpButton help={dashboardHelp("Task thiếu thông tin")} />
              <span>Thiếu ngày bắt đầu hoặc assignee</span>
              <strong>{formatNumber(analytics.missingEither)}</strong>
              <small>{analytics.missingStart} thiếu ngày · {analytics.missingAssignee} thiếu assignee</small>
            </button>
            <button
              type="button"
              className="kpiCard lime interactive"
              onClick={() => setDetail({
                title: "Task tồn tại mốc chọn",
                subtitle: `Các task tồn tính đến ${formatDate(inputDate(backlogDate))}`,
                tasks: analytics.backlogTasks,
              })}
            >
              <HelpButton help={dashboardHelp("Task tồn tại mốc chọn")} />
              <span>Task tồn tại mốc chọn</span>
              <strong>{formatNumber(analytics.backlogTotal)}</strong>
              <small>Không tính Done, Archived, Pending/Cancel, Kinh Doanh Done</small>
            </button>
          </section>

          <section className="dashboardGrid">
            <header className="dashboardGroupHeader overviewHeader">
              <span>01</span>
              <div>
                <p>TỔNG QUAN VẬN HÀNH</p>
                <h2>Trạng thái, chất lượng &amp; phân bổ task</h2>
              </div>
            </header>
            <header className="dashboardGroupHeader peopleHeader">
              <span>02</span>
              <div>
                <p>NHÂN SỰ &amp; KHỐI LƯỢNG</p>
                <h2>Thời gian, số task &amp; phản hồi</h2>
              </div>
            </header>
            <header className="dashboardGroupHeader productionHeader">
              <span>03</span>
              <div>
                <p>BỘ SƯU TẬP &amp; SẢN LƯỢNG</p>
                <h2>Tiến độ BST, Video &amp; Graphic</h2>
              </div>
            </header>
            <header className="dashboardGroupHeader slaGroupHeader">
              <span>04</span>
              <div>
                <p>SLA &amp; ĐỊNH MỨC</p>
                <h2>Nhịp xử lý, aging &amp; tải công việc</h2>
              </div>
            </header>

            <HorizontalBars
              title="Leaderboard thời gian"
              subtitle="TỔNG PHÚT DỰ KIẾN THEO ASSIGNEE"
              rows={analytics.leaderboard}
              className="groupPeople leaderboardCard"
              format={
                leaderboardUnit === "minutes"
                  ? formatMinutes
                  : leaderboardUnit === "hours"
                    ? formatHours
                    : formatWorkDays
              }
              headerAction={
                <label className="unitSelector">
                  Đơn vị
                  <select
                    value={leaderboardUnit}
                    onChange={(event) =>
                      setLeaderboardUnit(
                        event.target.value as "minutes" | "hours" | "days",
                      )
                    }
                    aria-label="Đơn vị thời gian leaderboard"
                  >
                    <option value="minutes">Phút</option>
                    <option value="hours">Giờ</option>
                    <option value="days">Ngày công (8 giờ)</option>
                  </select>
                </label>
              }
              onSelect={(label) => setDetail({
                title: `Thời gian của ${label}`,
                subtitle: "Các task tạo nên tổng số phút dự kiến",
                tasks: analytics.selectedTasks.filter(
                  (task) => assigneeNames(task.assignee).includes(label),
                ),
              })}
            />

            <article className="chartCard collectionCard fullWidth groupProduction">
              <div className="chartTitle">
                <div>
                  <span className="chartKicker">BỘ SƯU TẬP</span>
                  <h3>Tiến độ hoàn thành</h3>
                </div>
                <div className="chartHeaderTools">
                  <select
                    value={collectionMonth}
                    onChange={(event) => setCollectionMonth(event.target.value)}
                    aria-label="Chọn tháng bộ sưu tập"
                  >
                    <option value="">Chọn tháng bắt buộc</option>
                    {analytics.months.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <HelpButton help={dashboardHelp("Tiến độ hoàn thành")} />
                </div>
              </div>
              {collectionMonth ? (
                <div className="collectionProgressArea">
                  <div className="progressGrid">
                    <div className="metricHoverGroup tasks">
                      <ProgressDonut
                        title="THEO SỐ TASK"
                        done={analytics.collection.taskDone}
                        total={analytics.collection.taskTotal}
                        unit="task"
                        onSelect={(scope) => setDetail({
                          title: scope === "done" ? `Task Done · ${collectionMonth}` : `Tất cả task · ${collectionMonth}`,
                          subtitle: "Tiến độ Bộ Sưu Tập theo số lượng task",
                          tasks: scope === "done" ? analytics.collectionDone : analytics.collectionTasks,
                        })}
                      />
                      <CollectionChildrenPanel
                        month={collectionMonth}
                        metric="tasks"
                        rows={analytics.childCollections}
                        onSelect={(child) => setDetail({
                          title: `${child.name} · Số task`,
                          subtitle: "Các task thuộc BST con đã chọn",
                          tasks: child.tasks,
                        })}
                      />
                    </div>
                    <div className="metricHoverGroup minutes">
                      <ProgressDonut
                        title="THEO TỔNG PHÚT"
                        done={analytics.collection.minuteDone}
                        total={analytics.collection.minuteTotal}
                        unit="phút"
                        onSelect={(scope) => setDetail({
                          title: scope === "done" ? `Phút đã Done · ${collectionMonth}` : `Tổng phút · ${collectionMonth}`,
                          subtitle: "Danh sách task tạo nên tổng số phút dự kiến",
                          tasks: scope === "done" ? analytics.collectionDone : analytics.collectionTasks,
                        })}
                      />
                      <CollectionChildrenPanel
                        month={collectionMonth}
                        metric="minutes"
                        rows={analytics.childCollections}
                        onSelect={(child) => setDetail({
                          title: `${child.name} · Tổng phút`,
                          subtitle: "Các task tạo nên số phút của BST con",
                          tasks: child.tasks,
                        })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="selectPrompt">
                  <span>01</span>
                  <p>Chọn tháng để tính tiến độ từ các task thuộc Bộ Sưu Tập của tháng đó.</p>
                </div>
              )}
            </article>

            <StaffColumns
              rows={analytics.staffRows}
              className="groupPeople"
              onSelect={(name, metric) => {
                if (metric === "feedback") {
                  setDetail({
                    title: `Lần trả về · ${name}`,
                    subtitle: "Dữ liệu từ sheet 2.9 Lịch sử phản hồi Task trong bộ lọc",
                    feedback: analytics.selectedFeedback
                      .filter((item) =>
                        assigneeNames(
                          item.assignee ||
                            analytics.taskByCode.get(item.taskCode)?.assignee ||
                            "",
                        ).includes(name),
                      )
                      .map((item) => ({ ...item, task: analytics.taskByCode.get(item.taskCode) })),
                  });
                  return;
                }
                const rows = analytics.classified.filter(
                  (item) =>
                    assigneeNames(item.task.assignee).includes(name) &&
                    item.included &&
                    (metric === "total" || item[metric]),
                );
                const labels = {
                  total: "Tổng task",
                  started: "Bắt đầu trong kỳ",
                  carried: "Carry-in hoàn thành",
                };
                setDetail({
                  title: `${labels[metric]} · ${name}`,
                  subtitle: "Các task tạo nên cột đã chọn",
                  tasks: rows.map((item) => item.task),
                });
              }}
            />

            <div className="triplePie fullWidth groupOverview">
              <PieChart
                title="Tình trạng task"
                data={chartMetrics("status").status}
                compact
                scope={chartScope("status")}
                onScopeChange={(scope) => setChartScope("status", scope)}
                excludeOutsource={Boolean(pieExcludeOutsource.status)}
                onExcludeOutsourceChange={(checked) =>
                  setChartExcludeOutsource("status", checked)
                }
                onSelect={(label) => setDetail({
                  title: `Tình trạng · ${label}`,
                  subtitle: "Task trong bộ lọc có cùng trạng thái",
                  tasks: chartMetrics("status").tasks.filter(
                    (task) => matchesGroup(task.status, label),
                  ),
                })}
              />
              <PieChart
                title="Đánh giá bàn giao"
                data={chartMetrics("handoff").handoff}
                compact
                scope={chartScope("handoff")}
                onScopeChange={(scope) => setChartScope("handoff", scope)}
                excludeOutsource={Boolean(pieExcludeOutsource.handoff)}
                onExcludeOutsourceChange={(checked) =>
                  setChartExcludeOutsource("handoff", checked)
                }
                onSelect={(label) => setDetail({
                  title: `Đánh giá bàn giao · ${label}`,
                  subtitle: "Task trong bộ lọc có cùng đánh giá bàn giao",
                  tasks: chartMetrics("handoff").tasks.filter(
                    (task) => matchesGroup(task.handoffRating, label),
                  ),
                })}
              />
              <PieChart
                title="Đánh giá tổng"
                data={chartMetrics("overall").overall}
                compact
                scope={chartScope("overall")}
                onScopeChange={(scope) => setChartScope("overall", scope)}
                excludeOutsource={Boolean(pieExcludeOutsource.overall)}
                onExcludeOutsourceChange={(checked) =>
                  setChartExcludeOutsource("overall", checked)
                }
                onSelect={(label) => setDetail({
                  title: `Đánh giá tổng · ${label}`,
                  subtitle: "Task trong bộ lọc có cùng đánh giá tổng",
                  tasks: chartMetrics("overall").tasks.filter(
                    (task) => matchesGroup(task.overallRating, label),
                  ),
                })}
              />
            </div>

            <HorizontalBars
              title="Task theo Type"
              subtitle="COLUMN TYPE"
              rows={analytics.types}
              className="groupOverview"
              onSelect={(label) => setDetail({
                title: `Type · ${label}`,
                subtitle: "Task trong bộ lọc có cùng Type",
                tasks: analytics.selectedTasks.filter((task) => matchesGroup(task.type, label)),
              })}
            />
            <PieChart
              title="Task theo công đoạn"
              className="groupOverview"
              data={chartMetrics("stages").stages}
              scope={chartScope("stages")}
              onScopeChange={(scope) => setChartScope("stages", scope)}
              excludeOutsource={Boolean(pieExcludeOutsource.stages)}
              onExcludeOutsourceChange={(checked) =>
                setChartExcludeOutsource("stages", checked)
              }
              onSelect={(label) => setDetail({
                title: `Công đoạn · ${label}`,
                subtitle: "Task trong bộ lọc có cùng công đoạn",
                tasks: chartMetrics("stages").tasks.filter(
                  (task) => matchesGroup(task.stage, label),
                ),
              })}
            />
            <PieChart
              title="Task Outsource"
              className="groupOverview"
              data={chartMetrics("outsource").outsource}
              scope={chartScope("outsource")}
              onScopeChange={(scope) => setChartScope("outsource", scope)}
              onSelect={(label) => setDetail({
                title: `Outsource · ${label}`,
                subtitle: "Các task có cùng tên trong cột Outsource",
                tasks: chartMetrics("outsource").tasks.filter(
                  (task) => matchesGroup(outsourceName(task), label),
                ),
              })}
            />
            <section className="publicationSection fullWidth groupProduction videoPublication">
              <div className="publicationHeader">
                <span className="chartKicker">SỐ LƯỢNG ẤN PHẨM</span>
                <h2>Video</h2>
              </div>
              <div className="publicationGrid">
                <PieChart
                  title="Theo Format Type"
                  help={{
                    title: "Ấn phẩm Video theo Format Type",
                    purpose: "Cơ cấu số ấn phẩm video theo từng định dạng đầu ra.",
                    objective: "Giúp quản lý biết đội ngũ đang sản xuất nhiều loại video nào để cân đối năng lực edit và kế hoạch nội dung.",
                    calculation: "Chỉ lấy task có Format Type chứa từ khóa video và Công đoạn là Edit, sau đó nhóm theo Format Type.",
                    example: "Reels Video có 30 trong tổng 50 ấn phẩm video → lát này là 30 và 60%.",
                  }}
                  data={chartMetrics("videoPublications").videoFormats}
                  compact
                  scope={chartScope("videoPublications")}
                  onScopeChange={(scope) =>
                    setChartScope("videoPublications", scope)
                  }
                  excludeOutsource={Boolean(
                    pieExcludeOutsource.videoPublications,
                  )}
                  onExcludeOutsourceChange={(checked) =>
                    setChartExcludeOutsource("videoPublications", checked)
                  }
                  hoverBreakdown={(label) => {
                    const tasks = chartMetrics(
                      "videoPublications",
                    ).tasks.filter(
                      (task) =>
                        isVideoPublication(task) &&
                        matchesGroup(task.formatType, label),
                    );
                    return {
                      title: `${label} · phân bổ theo Type`,
                      data: groupCount(tasks, (task) => task.type),
                    };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Video · Format Type · ${label}`,
                    subtitle: "Format Type chứa “video” và Công đoạn là Edit",
                    tasks: chartMetrics("videoPublications").tasks.filter(
                      (task) =>
                        isVideoPublication(task) &&
                        matchesGroup(task.formatType, label),
                    ),
                  })}
                />
                <PieChart
                  title="Theo Type"
                  help={{
                    title: "Ấn phẩm Video theo Type",
                    purpose: "Cơ cấu cùng tập ấn phẩm video nhưng được phân tích theo cột Type.",
                    objective: "Cho biết video đang phục vụ nhóm công việc hoặc mục đích nào, hỗ trợ ưu tiên nguồn lực theo Type.",
                    calculation: "Lấy task có Format Type chứa video và Công đoạn Edit, sau đó nhóm theo Type.",
                    example: "Type Social có 20 trong tổng 50 video → hiển thị 20 và 40%.",
                  }}
                  data={chartMetrics("videoPublications").videoTypes}
                  compact
                  hoverBreakdown={(label) => {
                    const tasks = chartMetrics(
                      "videoPublications",
                    ).tasks.filter(
                      (task) =>
                        isVideoPublication(task) &&
                        matchesGroup(task.type, label),
                    );
                    return {
                      title: `${label} · phân bổ theo Format Type`,
                      data: groupCount(tasks, (task) => task.formatType),
                    };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Video · Type · ${label}`,
                    subtitle: "Ấn phẩm Video được phân bổ theo cột Type",
                    tasks: chartMetrics("videoPublications").tasks.filter(
                      (task) =>
                        isVideoPublication(task) &&
                        matchesGroup(task.type, label),
                    ),
                  })}
                />
              </div>
            </section>

            <section className="publicationSection fullWidth groupProduction graphicPublication">
              <div className="publicationHeader">
                <span className="chartKicker">SỐ LƯỢNG ẤN PHẨM</span>
                <h2>Graphic</h2>
              </div>
              <div className="publicationGrid">
                <PieChart
                  title="Theo Format Type"
                  help={{
                    title: "Ấn phẩm Graphic theo Format Type",
                    purpose: "Cơ cấu số ấn phẩm hình ảnh theo từng định dạng đầu ra.",
                    objective: "Giúp quản lý nhìn nhu cầu thiết kế theo định dạng để cân đối năng lực graphic và kế hoạch sản xuất.",
                    calculation: "Chỉ lấy task có Công đoạn Graphic Design và Format Type không chứa video, sau đó nhóm theo Format Type.",
                    example: "Banner có 40 trong tổng 100 ấn phẩm graphic → lát Banner là 40 và 40%.",
                  }}
                  data={chartMetrics("graphicPublications").graphicFormats}
                  compact
                  scope={chartScope("graphicPublications")}
                  onScopeChange={(scope) =>
                    setChartScope("graphicPublications", scope)
                  }
                  excludeOutsource={Boolean(
                    pieExcludeOutsource.graphicPublications,
                  )}
                  onExcludeOutsourceChange={(checked) =>
                    setChartExcludeOutsource("graphicPublications", checked)
                  }
                  hoverBreakdown={(label) => {
                    const tasks = chartMetrics(
                      "graphicPublications",
                    ).tasks.filter(
                      (task) =>
                        isGraphicPublication(task) &&
                        matchesGroup(task.formatType, label),
                    );
                    return {
                      title: `${label} · phân bổ theo Type`,
                      data: groupCount(tasks, (task) => task.type),
                    };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Graphic · Format Type · ${label}`,
                    subtitle: "Công đoạn Graphic Design và không phải video",
                    tasks: chartMetrics("graphicPublications").tasks.filter(
                      (task) =>
                        isGraphicPublication(task) &&
                        matchesGroup(task.formatType, label),
                    ),
                  })}
                />
                <PieChart
                  title="Theo Type"
                  help={{
                    title: "Ấn phẩm Graphic theo Type",
                    purpose: "Cơ cấu cùng tập ấn phẩm graphic nhưng được phân tích theo cột Type.",
                    objective: "Cho biết thiết kế hình ảnh đang tập trung vào nhóm công việc nào để điều phối người và lịch sản xuất.",
                    calculation: "Lấy task thuộc Công đoạn Graphic Design, loại Format Type video, rồi nhóm theo Type.",
                    example: "Type Campaign có 25 trong tổng 100 graphic → hiển thị 25 và 25%.",
                  }}
                  data={chartMetrics("graphicPublications").graphicTypes}
                  compact
                  hoverBreakdown={(label) => {
                    const tasks = chartMetrics(
                      "graphicPublications",
                    ).tasks.filter(
                      (task) =>
                        isGraphicPublication(task) &&
                        matchesGroup(task.type, label),
                    );
                    return {
                      title: `${label} · phân bổ theo Format Type`,
                      data: groupCount(tasks, (task) => task.formatType),
                    };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Graphic · Type · ${label}`,
                    subtitle: "Ấn phẩm Graphic được phân bổ theo cột Type",
                    tasks: chartMetrics("graphicPublications").tasks.filter(
                      (task) =>
                        isGraphicPublication(task) &&
                        matchesGroup(task.type, label),
                    ),
                  })}
                />
              </div>
            </section>

            <section className="slaSection fullWidth groupSla">
              <div className="slaHeader">
                <div>
                  <span className="chartKicker">SLA · KHÁM PHÁ DỮ LIỆU</span>
                  <h2>Nhịp xử lý &amp; định mức</h2>
                  <p>
                    Giờ làm việc: Thứ Hai–Thứ Bảy, 08:30–12:00 và
                    13:00–17:30; đã loại lịch nghỉ lễ Việt Nam 2026.
                  </p>
                </div>
                <span className="slaMode">CHƯA GẮN NGƯỠNG ĐẠT / VI PHẠM</span>
              </div>

              <div className="slaMetrics">
                <SlaMetricCard
                  kicker="CYCLE TIME"
                  title="P50 hoàn thành"
                  value={`${analytics.sla.cycleP50} ngày`}
                  note={`P90: ${analytics.sla.cycleP90} ngày · ${formatNumber(analytics.sla.cycleRows.length)} task đủ ngày`}
                  onClick={() => setDetail({
                    title: "Task có dữ liệu Cycle time",
                    subtitle: "Hoàn thành trong kỳ và có Ngày Bắt Đầu",
                    tasks: analytics.sla.cycleRows.map((row) => row.task),
                  })}
                />
                <SlaMetricCard
                  kicker="ĐỊNH MỨC 1.7"
                  title="Độ phủ định mức tham chiếu"
                  value={`${Math.round(analytics.sla.normCoverage)}%`}
                  note={`${formatNumber(analytics.sla.normMapped)} / ${formatNumber(analytics.sla.normEligible)} task map được`}
                  onClick={() => setDetail({
                    title: "Task chưa có định mức",
                    subtitle: "Không tìm thấy Format Type/Công đoạn phù hợp trong sheet 1.7",
                    tasks: analytics.sla.normRows
                      .filter((row) => row.normMinutes === null)
                      .map((row) => row.task),
                  })}
                />
              </div>

              <div className="slaChartGrid cycleChartRow">
                <PieChart
                  title="Cycle time theo ngày"
                  data={analytics.sla.cycleDistribution}
                  compact
                  onSelect={(label) => setDetail({
                    title: `Cycle time · ${label}`,
                    subtitle: "Task hoàn thành trong kỳ",
                    tasks: analytics.sla.cycleRows
                      .filter((row) => cycleBucket(row.days) === label)
                      .map((row) => row.task),
                  })}
                />
              </div>

              <div className="slaChartGrid agingBacklogRow">
                <PieChart
                  title="Aging task đang mở"
                  data={analytics.sla.agingDistribution}
                  compact
                  hoverBreakdown={(label) => {
                    const rows = analytics.sla.openAgingRows.filter(
                      (row) => agingBucket(row.days) === label,
                    );
                    return {
                      title: `${label} · phân bổ theo trạng thái`,
                      data: groupCount(rows, (row) => row.task.status),
                    };
                  }}
                  onSelect={(label) => setDetail({
                    title: `Aging · ${label}`,
                    subtitle: "Task đang mở tính đến hôm nay",
                    tasks: analytics.sla.openAgingRows
                      .filter((row) => agingBucket(row.days) === label)
                      .map((row) => row.task),
                  })}
                />
                <PieChart
                  title="Trạng thái task tồn"
                  data={analytics.backlog}
                  compact
                  hoverBreakdown={(label) => {
                    const rows = analytics.sla.openAgingRows.filter((row) =>
                      matchesGroup(row.task.status, label),
                    );
                    return {
                      title: `${label} · phân bổ theo Aging`,
                      data: groupCount(rows, (row) => agingBucket(row.days)),
                    };
                  }}
                  help={{
                    ...dashboardHelp("Trạng thái task tồn"),
                    note: `Mốc task tồn đang chọn: ${formatDate(inputDate(backlogDate))}. Task chưa có ngày bắt đầu không nằm trong chỉ số này; trạng thái dùng là trạng thái hiện tại.`,
                  }}
                  onSelect={(label) => setDetail({
                    title: `Task tồn · ${label}`,
                    subtitle: `Task tồn trước mốc ${formatDate(inputDate(backlogDate))}`,
                    tasks: analytics.backlogTasks.filter((task) =>
                      matchesGroup(task.status, label),
                    ),
                  })}
                />
              </div>

              <article className="checkingCard">
                <div className="checkingHeader">
                  <div>
                    <span className="chartKicker">CHECKING / REVIEWING</span>
                    <h3>Tốc độ tiếp nhận và kiểm duyệt task</h3>
                  </div>
                  <small>
                    Số phút chỉ tính trong giờ làm việc. P50 là mức 50% task
                    không vượt quá; P90 là mức 90% task không vượt quá.
                  </small>
                  <HelpButton help={dashboardHelp("Checking → Done · P50")} />
                </div>
                <div className="checkingMetrics">
                  <SlaMetricCard
                    kicker="TOÀN BỘ THỜI GIAN KIỂM DUYỆT"
                    title="Từ chuyển Checking đến hoàn thành"
                    value={formatSlaMinutes(
                      analytics.sla.checkingToDoneP50,
                    )}
                    note={`50% task không vượt quá mức trên · 90% không vượt quá ${formatSlaMinutes(analytics.sla.checkingToDoneP90)} · Mẫu ${formatNumber(analytics.sla.checkingToDoneRows.length)} task`}
                    help={dashboardHelp("Checking → Done · P50")}
                    onClick={() => setDetail({
                      title: "Checking → Done",
                      subtitle: "Task hoàn thành trong kỳ có đủ hai mốc",
                      tasks: analytics.sla.checkingToDoneRows.map(
                        (row) => row.task,
                      ),
                    })}
                  />
                  <SlaMetricCard
                    kicker="THỜI GIAN CHỜ ĐƯỢC NHẬN KIỂM TRA"
                    title="Từ chuyển Checking đến được nhận Reviewing"
                    value={formatSlaMinutes(analytics.sla.queueP50)}
                    note={`50% task không chờ quá mức trên · 90% không chờ quá ${formatSlaMinutes(analytics.sla.queueP90)} · Mẫu ${formatNumber(analytics.sla.reviewingRows.length)} task`}
                    help={dashboardHelp("Checking → Reviewing · P50")}
                    onClick={() => setDetail({
                      title: "Checking → Reviewing",
                      subtitle: "Thời gian chờ người checker nhận task",
                      tasks: analytics.sla.reviewingRows.map(
                        (row) => row.task,
                      ),
                    })}
                  />
                  <SlaMetricCard
                    kicker="THỜI GIAN CHECKER XỬ LÝ"
                    title="Từ nhận Reviewing đến hoàn thành"
                    value={formatSlaMinutes(analytics.sla.reviewP50)}
                    note={
                      analytics.sla.reviewP50 === 0
                        ? `50% task có hai mốc trùng nhau · 90% không vượt quá ${formatSlaMinutes(analytics.sla.reviewP90)} · Mẫu ${formatNumber(analytics.sla.reviewingRows.length)} task · Cần kiểm tra chất lượng timestamp`
                        : `50% task không vượt quá mức trên · 90% không vượt quá ${formatSlaMinutes(analytics.sla.reviewP90)} · Mẫu ${formatNumber(analytics.sla.reviewingRows.length)} task`
                    }
                    help={dashboardHelp("Reviewing → Done · P50")}
                    onClick={() => setDetail({
                      title: "Reviewing → Done",
                      subtitle: "Thời gian checker xử lý sau khi nhận task",
                      tasks: analytics.sla.reviewingRows.map(
                        (row) => row.task,
                    ),
                  })}
                />
              </div>
              </article>

              <div className="slaChartGrid">
                <PieChart
                  title="Đối chiếu kế hoạch với định mức 1.7"
                  data={analytics.sla.normDistribution}
                  compact
                  onSelect={(label) => setDetail({
                    title: `Kế hoạch phút · ${label}`,
                    subtitle: "Đối chiếu phút dự kiến với chuẩn tham chiếu theo Format Type/Công đoạn; không phải thời gian làm thực tế",
                    tasks: analytics.sla.normRows
                      .filter((row) => row.label === label)
                      .map((row) => row.task),
                  })}
                />
                <article className="normSummary">
                  <HelpButton help={dashboardHelp("Đối chiếu kế hoạch với định mức 1.7")} />
                  <span className="chartKicker">ĐỐI CHIẾU KẾ HOẠCH</span>
                  <h3>Phút dự kiến và phút chuẩn tham chiếu</h3>
                  <div className="normDisclaimer">
                    <strong>Không phải đánh giá năng suất thực tế</strong>
                    <span>
                      Chưa có thời điểm bắt đầu và hoàn thành công việc thực tế,
                      nên các số liệu dưới đây chỉ so sánh kế hoạch nhập trên
                      Tasklist với bảng chuẩn 1.7.
                    </span>
                  </div>
                  <div>
                    <span>
                      <small>PHÚT DỰ KIẾN TRÊN TASKLIST</small>
                      <strong>
                        {formatNumber(analytics.sla.normExpectedMinutes)}
                      </strong>
                      <em>
                        {formatWorkDays(analytics.sla.normExpectedMinutes)}
                      </em>
                    </span>
                    <span>
                      <small>PHÚT CHUẨN THAM CHIẾU 1.7</small>
                      <strong>
                        {formatNumber(analytics.sla.normStandardMinutes)}
                      </strong>
                      <em>
                        {formatWorkDays(analytics.sla.normStandardMinutes)}
                      </em>
                    </span>
                  </div>
                  <p>
                    Chỉ đối chiếu các task map được Format Type và Công đoạn.
                    Quy đổi 480 phút bằng một ngày công chỉ để dễ đọc tổng tải
                    kế hoạch, không phải số ngày làm thực tế.
                  </p>
                </article>
              </div>
            </section>
          </section>

          <section className="logicNote">
            <span>LOGIC TEST V0.1</span>
            <p>
              “Tổng task trong kỳ” = task có Ngày Bắt Đầu nằm trong bộ lọc +
              task bắt đầu ngoài bộ lọc nhưng Ngày Hoàn Thành nằm trong bộ lọc.
              Khi không chọn ngày, dashboard lấy toàn bộ dữ liệu.
            </p>
          </section>
        </>
      )}
      {detail && <DetailDrawer detail={detail} onClose={() => setDetail(null)} />}
      {activeHelp && <HelpDialog help={activeHelp} onClose={() => setActiveHelp(null)} />}
    </main>
    </HelpContext.Provider>
  );
}
