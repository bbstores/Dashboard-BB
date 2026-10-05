import type { DashboardHelp } from "../../model/types";

export const capacityHelp: Record<
  | "demand"
  | "sessions"
  | "outputCount"
  | "shoot"
  | "output"
  | "trend"
  | "mix"
  | "quality"
  | "shootTypes"
  | "staffContribution",
  DashboardHelp
> = {
  demand: {
    title: "Luồng task quay/chụp",
    purpose:
      "Đếm lượng việc team Media được yêu cầu quay hoặc chụp trong khoảng riêng đang chọn.",
    objective:
      "Cho biết đầu vào đang tạo ra bao nhiêu nhu cầu và bao nhiêu task chưa được gắn vào lịch quay.",
    calculation:
      "Tổng cần xử lý = task tồn đầu kỳ + task Quay/Chụp có Ngày Bắt Đầu trong kỳ. Task tồn đầu kỳ đã bắt đầu trước kỳ nhưng chưa có Ngày Kiểm Duyệt trước kỳ. Vùng thường P25–P75 và P50 dùng đúng cùng công thức này trên 12 tuần hoàn chỉnh trước tháng báo cáo.",
    example:
      "Tuần có 60 task Quay/Chụp, 52 task có Ca Quay và 8 task chưa gắn → độ phủ lịch quay 86,7%.",
    note:
      "Đây là nhu cầu theo Tasklist, không phải số task thực tế đã quay. Nhãn dưới/trong/vượt vùng so sánh tổng cần xử lý hiện tại với vùng P25–P75 của lịch sử, không dùng baseline chỉ tính task mới.",
  },
  sessions: {
    title: "Buổi quay và số mã thực tế",
    purpose:
      "Đo năng lực quay/chụp từ sheet 2.11 Lịch Quay bằng một đơn vị chung.",
    objective:
      "Trả lời trong khoảng đang chọn team thực hiện bao nhiêu buổi quay, bao nhiêu task và bao nhiêu mã sản phẩm.",
    calculation:
      "Một buổi được quy đổi 4 giờ; Một ngày bằng 2 buổi. Nhân sự là số tên không trùng lặp trong các ca của kỳ; một người tham gia nhiều ca vẫn chỉ tính một lần. Số task lấy Tổng Số Task, sau đó mỗi cặp Ảnh Manocanh + Video Manocanh cùng mã sản phẩm trong cùng ca được gộp thành 1 task. Hai dòng gốc vẫn hiện trong bảng dẫn chứng. Số mã là hợp không trùng của Danh Sách Mã SP. Baseline tháng lấy P25/P50/P75 của 12 tuần hoàn chỉnh trước tháng báo cáo, yêu cầu tối thiểu 8 tuần có dữ liệu tương ứng và được khóa suốt tháng.",
    example:
      "5 buổi, 49 task và 16 mã; nếu P50 lần lượt là 5, 49 và 16 thì tuần đạt đúng nhịp trung vị lịch sử.",
    note:
      "Khoảng đang chạy: thực tế chỉ tính ca đến hôm nay; dự kiến tính mọi ca đã xếp lịch đến cuối khoảng. Ca chưa có Thời Lượng vẫn xuất hiện trong bảng dẫn chứng nhưng đóng góp 0 buổi.",
  },
  outputCount: {
    title: "Ấn phẩm bàn giao trong tuần",
    purpose:
      "Đếm số Video và Graphic đã được người làm bàn giao ở mốc Ngày Kiểm Duyệt trong khoảng riêng.",
    objective:
      "Trả lời một tuần team trả ra bao nhiêu ấn phẩm và đang cao hay thấp hơn nhịp lịch sử.",
    calculation:
      "Tổng cần xử lý = task Edit/Graphic tồn đầu kỳ + task bắt đầu trong kỳ. Ấn phẩm bàn giao dùng Ngày Kiểm Duyệt và được tách thành xử lý task tồn hoặc task mới. Tồn cuối kỳ là phần trong tổng cần xử lý chưa được kiểm duyệt tại mốc kết thúc thực tế. Baseline đầu ra vẫn lấy 12 tuần hoàn chỉnh trước tháng báo cáo.",
    example:
      "Tuần bàn giao 117 ấn phẩm và P50 lịch sử cũng là 117 → đạt 100% nhịp trung vị.",
    note:
      "Dự báo là phép ngoại suy theo tốc độ, không phải cam kết. P50 Video và P50 Graphic là hai trung vị độc lập nên không bắt buộc cộng lại bằng P50 tổng.",
  },
  shoot: {
    title: "Tải quay/chụp quy đổi",
    purpose:
      "Quy đổi nhu cầu Quay/Chụp sang phút chuẩn để nhìn độ nặng nhẹ của cơ cấu task.",
    objective:
      "Bổ sung góc nhìn tải công việc; không dùng chỉ số này để suy ra số buổi quay.",
    calculation:
      "Lấy task nội bộ có Công đoạn Quay/Chụp và Ngày Bắt Đầu thuộc khoảng riêng. Chế độ Giờ map Format Type sang định mức 1.7; chế độ Task đếm chính tập task đó. P25–P50–P75 được tính độc lập theo đơn vị đang chọn từ nhịp mỗi ngày làm việc của 8 tuần trước.",
    example:
      "Tuần có 4.800 phút chuẩn, vùng lịch sử là 4.200–5.100 phút → nằm trong vùng thông thường.",
    note:
      "Switch chỉ đổi góc nhìn và mốc P50, không đổi tập task. Số buổi quay thực tế được tính riêng từ sheet 2.11 Lịch Quay ở chart phía trên.",
  },
  output: {
    title: "Tải bàn giao quy đổi",
    purpose:
      "Đo khối lượng Video và Graphic được người làm bàn giao trong tuần.",
    objective:
      "Cho biết đầu ra của team đang thấp, bình thường hay cao hơn nhịp lịch sử.",
    calculation:
      "Lấy task Video–Edit hoặc Graphic–Graphic Design có Ngày Kiểm Duyệt trong khoảng riêng, loại Outsource và Pending/Cancel. Chế độ Giờ cộng định mức 1.7; chế độ Task đếm chính tập task đó. P25–P50–P75 đổi theo đơn vị đang chọn.",
    example:
      "Tuần bàn giao 6.000 phút chuẩn, P50 lịch sử là 5.400 phút → đạt 111,1% mức tham chiếu.",
    note:
      "Switch chỉ đổi thứ tự Giờ/Task và chuẩn so sánh. Ngày Kiểm Duyệt vẫn là mốc bàn giao của người thực hiện; không dùng Ngày Hoàn Thành vì còn phụ thuộc người đánh giá.",
  },
  trend: {
    title: "Xu hướng công suất theo thời gian",
    purpose:
      "Đặt tải quay/chụp và đầu ra ấn phẩm trên cùng trục thời gian.",
    objective:
      "Phát hiện xu hướng tăng/giảm, độ trễ giữa tuần quay và tuần trả ấn phẩm, cùng các tuần bất thường.",
    calculation:
      "Quay/Chụp dùng Ngày Bắt Đầu; Bàn giao dùng Ngày Kiểm Duyệt. Tổng tải = giờ chuẩn Quay/Chụp + giờ chuẩn Bàn giao trong từng mốc. P50 tổng được tính trực tiếp từ tổng tải của các mốc hoàn chỉnh, không cộng hai P50 riêng. Trung bình trượt chỉ xuất hiện từ khi có đủ 4 mốc hoàn chỉnh và lấy trung bình tổng tải của 4 mốc gần nhất.",
    example:
      "Tuần 1 tải quay tăng mạnh nhưng đầu ra chỉ tăng ở tuần 2 có thể phản ánh độ trễ sản xuất.",
    note:
      "Bộ lọc này chỉ tác động chart. 1W và khoảng tối đa 14 ngày hiển thị theo ngày; 15–100 ngày theo tuần; dài hơn 100 ngày theo tháng. Chủ nhật không phát sinh bị ẩn ở chế độ ngày. Điểm viền rỗng là mốc chưa hoàn tất và không tham gia P50 hay trung bình trượt. Nhấn chú thích Quay/Chụp, Bàn giao hoặc Tổng tải để làm nổi riêng đường đó; nhấn lại để hiện tất cả. Nhấn điểm Tổng tải để mở hợp không trùng của task quay/chụp và task bàn giao trong mốc.",
  },
  mix: {
    title: "Cơ cấu sản lượng bàn giao",
    purpose:
      "Cho biết đầu ra tuần đang nghiêng về Video hay Graphic.",
    objective:
      "Giải thích vì sao hai tuần có cùng số task nhưng khối lượng phút chuẩn khác nhau.",
    calculation:
      "Trên cùng tập task có Ngày Kiểm Duyệt trong tuần, Video là Format Type chứa Video và Công đoạn Edit; phần còn lại là Graphic Design.",
    example:
      "80 Video và 20 Graphic trên tổng 100 đầu ra → tỷ trọng lần lượt 80% và 20%.",
  },
  quality: {
    title: "Sản lượng và kiểm soát bàn giao",
    purpose:
      "Đặt số ấn phẩm bàn giao cạnh kết quả đúng hạn và phản hồi trả về.",
    objective:
      "Tránh kết luận tuần vượt công suất là tốt nếu tỷ lệ trễ hoặc số lần trả về cũng tăng.",
    calculation:
      "Phân nhóm task đầu ra theo cột Đánh Giá Bàn Giao: đúng hạn, trễ/quá hạn và chưa đủ đánh giá. Số lần trả về lấy từ sheet 2.9 trong đúng tuần và đúng các task đầu ra này.",
    example:
      "100 task bàn giao gồm 78 đúng hạn, 15 trễ và 7 chưa đủ đánh giá; có 12 lượt trả về.",
    note:
      "Chỉ số này phản ánh tín hiệu kiểm soát, chưa thay thế đánh giá chất lượng nội dung chuyên môn.",
  },
  shootTypes: {
    title: "Baseline theo loại ca quay",
    purpose:
      "Cho biết một buổi 4 giờ từng loại ca thường xử lý bao nhiêu task, bao nhiêu mã và tổng hợp thành baseline tuần.",
    objective:
      "Tách khác biệt giữa các loại ca nhưng vẫn có một mốc chung để đánh giá tuần đang vượt hay dưới năng lực thực nghiệm.",
    calculation:
      "P50 chung và P50 từng loại được tính theo đơn vị buổi 4 giờ: ca một ngày có trọng số 2 buổi, số task và mã của ca được chia cho 2 trước khi lấy P50. Trước bước này, mỗi cặp Ảnh Manocanh + Video Manocanh cùng mã trong cùng ca được tính là 1 task. Năng suất đầu người chia tiếp cho số nhân sự tham gia ca. Ca thiếu nhân sự vẫn tính sản lượng ca nhưng bị loại khỏi P50 task/người và mã/người. Baseline theo cơ cấu = P50 buổi/tuần × tỷ trọng loại × năng suất loại.",
    example:
      "Nếu P50 là 5 buổi/tuần, cơ cấu Bộ Sưu Tập chiếm 40% và đạt 8 task/buổi thì phần đóng góp dự kiến là 5 × 40% × 8 = 16 task.",
    note:
      "Tạm thời không áp dụng ngưỡng số buổi tối thiểu: mỗi loại ca dùng trực tiếp P50 của chính các buổi đang có trong khoảng lọc. Vì vậy loại chỉ có 1–2 buổi có thể dao động mạnh. Bộ lọc này chỉ tác động chart và không đổi baseline khóa tháng phía trên.",
  },
  staffContribution: {
    title: "Thời gian tham gia theo ca quay",
    purpose:
      "Theo dõi tổng số phút dự kiến của từng người thực hiện trong mỗi ca quay, dựa trên task liên kết từ Tasklist.",
    objective:
      "Cho biết trong từng ca assignee hoặc outsource nào đang thực hiện những task nào và tổng khối lượng phút dự kiến tương ứng.",
    calculation:
      "Task được liên kết bằng danh sách mã task trong Lịch Quay hoặc cột Ca Quay trong Tasklist. Nếu cột Outsource có giá trị, hệ thống nhóm và cộng Số phút dự kiến theo giá trị Outsource; Assignee của task đó chỉ là người follow và không được cộng. Nếu Outsource trống, hệ thống nhóm theo Assignee.",
    example:
      "Trong ca CQ-081, An có ba task nội bộ 30, 45 và 60 phút thì cột của An là 135 phút. Một task khác 90 phút có Outsource là Agency A sẽ tạo cột Agency A 90 phút, không cộng cho Assignee đang follow task.",
    note:
      "Nhân sự có tên trong lịch nhưng không có task được giao sẽ ở mức 0. Task không có cả Outsource lẫn Assignee được gom vào nhóm Chưa có assignee để không thất thoát khối lượng.",
  },
};
