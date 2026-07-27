// ─── Dashboard Help Content ─────────────────────────────────────────────────

import type { DashboardHelp } from "../model/types";

export function dashboardObjective(title: string) {
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
    "Tuân thủ ngày bàn giao": "Đo tỷ lệ người thực hiện bàn giao task trong đúng ngày bắt đầu, đồng thời tách task trễ ngày và quá hạn chưa bàn giao.",
    "Tuân thủ hạn hoàn thành": "Theo dõi task có hoàn thành trước cuối ngày làm việc kế tiếp hay không và nhận diện phần trễ của toàn quy trình.",
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
  if (title.includes("Checking")) {
    return "Đo toàn bộ thời gian từ khi task chuyển sang Checking đến khi hoàn thành, giúp nhận diện nút thắt trong quy trình kiểm duyệt.";
  }
  if (title.includes("Format Type")) {
    return "Hiểu sản lượng theo định dạng đầu ra để lập kế hoạch năng lực sản xuất và phân bổ đúng nhóm chuyên môn.";
  }
  if (title.includes("Type")) {
    return "Hiểu cơ cấu loại công việc trong nhóm đang xem để phục vụ phân bổ nguồn lực và so sánh sản lượng.";
  }
  return "Biến dữ liệu task thành một cơ cấu dễ đọc, giúp quản lý phát hiện nhóm chiếm tỷ trọng lớn hoặc bất thường và mở dữ liệu dẫn chứng để kiểm tra.";
}

export function dashboardHelp(title: string): DashboardHelp {
  const exact: Record<string, Omit<DashboardHelp, "title">> = {
    "Task trong kỳ": {
      purpose: "Cho biết tổng khối lượng task thuộc khoảng ngày đang lọc.",
      calculation: "Hợp của task bắt đầu trong kỳ, carry-in bàn giao theo Ngày Kiểm Duyệt và carry-in hoàn thành theo Ngày Hoàn Thành. Một task chạm cả hai mốc trong kỳ chỉ được tính một lần vào tổng.",
      example: "Có 200 task bắt đầu, 15 task cũ bàn giao và 12 task cũ hoàn thành; 5 task nằm trong cả hai nhóm carry-in → tổng duy nhất là 222 task.",
    },
    "Task thiếu thông tin": {
      purpose: "Phát hiện task chưa đủ dữ liệu để giao việc và theo dõi.",
      calculation: "Chia thành ba nhóm loại trừ nhau: chỉ thiếu Ngày Bắt Đầu, chỉ thiếu Assignee và thiếu cả hai. Tổng lớn bằng tổng của đúng ba nhóm này.",
      example: "200 task chỉ thiếu ngày, 0 task chỉ thiếu assignee và 92 task thiếu cả hai → tổng 292.",
    },
    "Task tồn tại mốc chọn": {
      purpose: "Cho biết lượng task còn tồn trước ngày mốc độc lập.",
      calculation: "Ngày Bắt Đầu ≤ mốc và trạng thái hiện tại không thuộc Done, Archived, Pending/Cancel, Kinh Doanh Done. Task chưa có ngày bắt đầu không nằm trong chỉ số này.",
      example: "Mốc 01/08, task bắt đầu 30/07 và đang In Progress được tính; task không có ngày bắt đầu không được tính.",
      note: "Chỉ số dùng trạng thái hiện tại, không tái dựng trạng thái lịch sử tại ngày mốc.",
    },
    "Leaderboard thời gian": {
      purpose: "Xếp hạng tải công việc dự kiến theo nhân sự.",
      calculation: "Cộng toàn bộ Số phút dự kiến của task vào từng Assignee. Thanh được tách thành task trong kỳ đang hoạt động, carry-in và nhóm To Do/Pending-Cancel; ba nhóm không đếm trùng. Task nhiều người được cộng nguyên số phút cho từng người.",
      example: "Một người có tổng 4.000 phút gồm 2.500 phút task trong kỳ, 1.000 phút carry-in và 500 phút To Do/Pending-Cancel → lần lượt 62,5%, 25% và 12,5%.",
    },
    "Tiến độ hoàn thành": {
      purpose: "Theo dõi tiến độ từng Bộ Sưu Tập của tháng đã chọn.",
      calculation: "Chỉ lấy task có ô BST chứa tháng đã chọn. Vòng task = task Done/Kinh Doanh Done ÷ tổng task; vòng phút = phút dự kiến của task Done/Kinh Doanh Done ÷ tổng phút dự kiến.",
      example: "BST 08.2026 có 100 task, 80 Done → 80%. Nếu 8.000/10.000 phút thuộc task Done → 80% theo phút.",
      note: "Rê vào từng vòng cha để xem các vòng con theo đúng tiêu chí của vòng đó.",
    },
    "Số task thực hiện & số lần trả về": {
      purpose: "So sánh khối lượng thực hiện và phản hồi theo từng nhân sự.",
      calculation: "Tổng task là hợp khử trùng của task bắt đầu, carry-in bàn giao theo Ngày Kiểm Duyệt và carry-in hoàn thành theo Ngày Hoàn Thành. Hai cột carry-in là các mốc riêng nên có thể cùng ghi nhận một task. Task nhiều assignee được tính cho từng người.",
      example: "Task cũ của An kiểm duyệt và hoàn thành cùng trong kỳ: Tổng task của An tăng 1, cột Carry-in bàn giao tăng 1 và Carry-in hoàn thành tăng 1.",
    },
    "Tình trạng task": {
      purpose: "Biểu đồ cơ cấu task theo trạng thái hiện tại như In Progress, Checking, Reviewing hoặc Done.",
      calculation: "Chọn Bắt đầu trong kỳ, Carry-in bàn giao, Carry-in hoàn thành hoặc Tổng hợp khử trùng. Tùy chọn Trừ Outsource áp dụng độc lập.",
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
    "Tuân thủ ngày bàn giao": {
      purpose: "Đánh giá task có được chuyển sang kiểm duyệt trong cùng ngày bắt đầu hay không.",
      calculation: "Cohort ban đầu là tổng task thuộc bộ lọc chung đã khử trùng. Mẫu số của tỷ lệ chỉ gồm task đã bàn giao hợp lệ: có Ngày Bắt Đầu từ 15/06/2026, có Ngày Kiểm Duyệt và thứ tự ngày hợp lệ. Tử số là các task có Ngày Kiểm Duyệt cùng ngày Ngày Bắt Đầu, bất kể giờ.",
      example: "Có 371 task trong cohort nhưng chỉ 286 task đã bàn giao hợp lệ; 145 task bàn giao cùng ngày → tỷ lệ đúng ngày = 145 / 286 ≈ 51%. 85 task còn lại vẫn được giữ trong các nhóm chưa bàn giao, chưa bắt đầu, không tính KPI hoặc sai dữ liệu.",
      note: "Mẫu số không phải tổng task trong kỳ. Task chưa có Ngày Kiểm Duyệt, quá hạn chưa bàn giao, đang thực hiện, bắt đầu trước 15/06/2026 hoặc thiếu/sai dữ liệu không được đưa vào tỷ lệ đúng/trễ. Đây là tuân thủ milestone bàn giao, không phải thời gian người thực hiện thực sự làm task.",
    },
    "Tuân thủ hạn hoàn thành": {
      purpose: "Đánh giá toàn bộ task có hoàn thành trước hạn quy trình hay không.",
      calculation: "Hạn hoàn thành là cuối ngày làm việc kế tiếp sau Ngày Bắt Đầu. Chủ nhật và ngày lễ được bỏ qua. Done/Kinh Doanh Done được so với Ngày Hoàn Thành.",
      example: "Bắt đầu thứ Bảy → hạn là cuối thứ Hai nếu Chủ nhật không làm việc.",
      note: "Kết quả toàn quy trình còn chịu ảnh hưởng của người kiểm duyệt; không dùng riêng để quy trách nhiệm cho người thực hiện.",
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
      calculation: "Lấy task có ô Outsource không rỗng; mỗi lát là một tên outsource. Giá trị chung 'Outsource' được xếp vào Chưa xác định người outsource.",
      example: "A có 12 task, B có 8 task → tổng 20, hai lát lần lượt 60% và 40%.",
    },
    "Cycle time theo ngày": {
      purpose: "Đo số ngày lịch từ Ngày Bắt Đầu đến Ngày Hoàn Thành.",
      calculation: "Chỉ lấy task đã hoàn thành trong bộ lọc và có đủ hai ngày; xếp vào các khoảng ngày trên biểu đồ.",
      example: "Bắt đầu 01/08, hoàn thành 04/08 → cycle time 3 ngày.",
    },
    "Aging task đang mở": {
      purpose: "Nhận diện task mở lâu tính đến Mốc task tồn đang chọn.",
      calculation: "Task có ngày bắt đầu không sau mốc, trạng thái hiện tại chưa hoàn tất; Aging = Mốc task tồn − Ngày Bắt Đầu.",
      example: "Chọn mốc 11/08, task bắt đầu 01/08 và hiện vẫn In Progress → Aging 10 ngày.",
      note: "Đây là tuổi task theo trạng thái hiện tại, không phải thời gian thực tế nhân sự thao tác và không tái dựng trạng thái lịch sử.",
    },
    "Đối chiếu kế hoạch với định mức 1.7": {
      purpose: "Đối chiếu Số phút dự kiến được nhập trên Tasklist với số phút chuẩn tham chiếu trong bảng 1.7.",
      calculation: "Map Format Type + Công đoạn sang định mức rồi phân loại phút dự kiến bằng, thấp hoặc cao hơn phút chuẩn. Đây không phải thời gian làm việc thực tế.",
      example: "Chuẩn tham chiếu 60 phút, Tasklist nhập dự kiến 75 phút → kế hoạch đang cao hơn chuẩn 15 phút; không có nghĩa nhân sự thực tế làm chậm 15 phút.",
      note: "Không dùng biểu đồ này để kết luận nhân sự đạt hay không đạt định mức. Muốn đánh giá năng suất cần có timestamp bắt đầu làm thực tế, kết thúc thực tế và thời gian tạm dừng.",
    },
  };
  if (exact[title]) return { title, ...exact[title] };

  if (title.includes("Checking")) {
    return {
      title,
      purpose: "Đo thời gian xử lý ở bước kiểm duyệt trong giờ làm việc.",
      calculation: "Tính thời gian từ Ngày Kiểm Duyệt đến Ngày Hoàn Thành, chỉ trong Thứ 2–Thứ 7, 08:30–12:00 và 13:00–17:30, loại ngày nghỉ lễ Việt Nam đã cấu hình. P50 là trung vị; P90 là mốc 90% task không vượt quá.",
      example: "Checking 17:00, Done 09:30 hôm sau → tính 30 phút chiều + 60 phút sáng = 90 phút.",
      note: "Luồng hiện tại chỉ sử dụng hai mốc Checking và Done.",
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
