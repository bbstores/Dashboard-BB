import type { PieMetricSet } from "../analytics/types";
import { PieChart } from "../components/PieChart";
import {
  groupCount,
  isGraphicPublication,
  isVideoPublication,
  matchesGroup,
} from "../model/taskUtils";
import type {
  DetailView,
  PieScope,
} from "../model/types";

export type PublicationSectionProps = {
  videoMetrics: PieMetricSet;
  graphicMetrics: PieMetricSet;
  videoScope: PieScope;
  graphicScope: PieScope;
  videoExcludeOutsource: boolean;
  graphicExcludeOutsource: boolean;
  onScopeChange: (key: string, scope: PieScope) => void;
  onExcludeOutsourceChange: (key: string, checked: boolean) => void;
  onOpenDetail: (detail: DetailView) => void;
};

export function PublicationSection({
  videoMetrics,
  graphicMetrics,
  videoScope,
  graphicScope,
  videoExcludeOutsource,
  graphicExcludeOutsource,
  onScopeChange,
  onExcludeOutsourceChange,
  onOpenDetail,
}: PublicationSectionProps) {
  return (
    <>
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
              objective:
                "Giúp quản lý biết đội ngũ đang sản xuất nhiều loại video nào để cân đối năng lực edit và kế hoạch nội dung.",
              calculation:
                "Chỉ lấy task có Format Type chứa từ khóa video và Công đoạn là Edit, sau đó nhóm theo Format Type.",
              example:
                "Reels Video có 30 trong tổng 50 ấn phẩm video → lát này là 30 và 60%.",
            }}
            data={videoMetrics.videoFormats}
            compact
            scope={videoScope}
            onScopeChange={(scope) =>
              onScopeChange("videoPublications", scope)
            }
            excludeOutsource={videoExcludeOutsource}
            onExcludeOutsourceChange={(checked) =>
              onExcludeOutsourceChange("videoPublications", checked)
            }
            hoverBreakdown={(label) => {
              const tasks = videoMetrics.tasks.filter(
                (task) =>
                  isVideoPublication(task) &&
                  matchesGroup(task.formatType, label),
              );
              return {
                title: `${label} · phân bổ theo Type`,
                data: groupCount(tasks, (task) => task.type),
              };
            }}
            onSelect={(label) =>
              onOpenDetail({
                title: `Video · Format Type · ${label}`,
                subtitle:
                  "Format Type chứa 'video' và Công đoạn là Edit",
                tasks: videoMetrics.tasks.filter(
                  (task) =>
                    isVideoPublication(task) &&
                    matchesGroup(task.formatType, label),
                ),
              })
            }
          />
          <PieChart
            title="Theo Type"
            help={{
              title: "Ấn phẩm Video theo Type",
              purpose:
                "Cơ cấu cùng tập ấn phẩm video nhưng được phân tích theo cột Type.",
              objective:
                "Cho biết video đang phục vụ nhóm công việc hoặc mục đích nào, hỗ trợ ưu tiên nguồn lực theo Type.",
              calculation:
                "Lấy task có Format Type chứa video và Công đoạn Edit, sau đó nhóm theo Type.",
              example:
                "Type Social có 20 trong tổng 50 video → hiển thị 20 và 40%.",
            }}
            data={videoMetrics.videoTypes}
            compact
            hoverBreakdown={(label) => {
              const tasks = videoMetrics.tasks.filter(
                (task) =>
                  isVideoPublication(task) &&
                  matchesGroup(task.type, label),
              );
              return {
                title: `${label} · phân bổ theo Format Type`,
                data: groupCount(tasks, (task) => task.formatType),
              };
            }}
            onSelect={(label) =>
              onOpenDetail({
                title: `Video · Type · ${label}`,
                subtitle: "Ấn phẩm Video được phân bổ theo cột Type",
                tasks: videoMetrics.tasks.filter(
                  (task) =>
                    isVideoPublication(task) &&
                    matchesGroup(task.type, label),
                ),
              })
            }
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
              purpose:
                "Cơ cấu số ấn phẩm hình ảnh theo từng định dạng đầu ra.",
              objective:
                "Giúp quản lý nhìn nhu cầu thiết kế theo định dạng để cân đối năng lực graphic và kế hoạch sản xuất.",
              calculation:
                "Chỉ lấy task có Công đoạn Graphic Design và Format Type không chứa video, sau đó nhóm theo Format Type.",
              example:
                "Banner có 40 trong tổng 100 ấn phẩm graphic → lát Banner là 40 và 40%.",
            }}
            data={graphicMetrics.graphicFormats}
            compact
            scope={graphicScope}
            onScopeChange={(scope) =>
              onScopeChange("graphicPublications", scope)
            }
            excludeOutsource={graphicExcludeOutsource}
            onExcludeOutsourceChange={(checked) =>
              onExcludeOutsourceChange("graphicPublications", checked)
            }
            hoverBreakdown={(label) => {
              const tasks = graphicMetrics.tasks.filter(
                (task) =>
                  isGraphicPublication(task) &&
                  matchesGroup(task.formatType, label),
              );
              return {
                title: `${label} · phân bổ theo Type`,
                data: groupCount(tasks, (task) => task.type),
              };
            }}
            onSelect={(label) =>
              onOpenDetail({
                title: `Graphic · Format Type · ${label}`,
                subtitle:
                  "Công đoạn Graphic Design và không phải video",
                tasks: graphicMetrics.tasks.filter(
                  (task) =>
                    isGraphicPublication(task) &&
                    matchesGroup(task.formatType, label),
                ),
              })
            }
          />
          <PieChart
            title="Theo Type"
            help={{
              title: "Ấn phẩm Graphic theo Type",
              purpose:
                "Cơ cấu cùng tập ấn phẩm graphic nhưng được phân tích theo cột Type.",
              objective:
                "Cho biết thiết kế hình ảnh đang tập trung vào nhóm công việc nào để điều phối người và lịch sản xuất.",
              calculation:
                "Lấy task thuộc Công đoạn Graphic Design, loại Format Type video, rồi nhóm theo Type.",
              example:
                "Type Campaign có 25 trong tổng 100 graphic → hiển thị 25 và 25%.",
            }}
            data={graphicMetrics.graphicTypes}
            compact
            hoverBreakdown={(label) => {
              const tasks = graphicMetrics.tasks.filter(
                (task) =>
                  isGraphicPublication(task) &&
                  matchesGroup(task.type, label),
              );
              return {
                title: `${label} · phân bổ theo Format Type`,
                data: groupCount(tasks, (task) => task.formatType),
              };
            }}
            onSelect={(label) =>
              onOpenDetail({
                title: `Graphic · Type · ${label}`,
                subtitle: "Ấn phẩm Graphic được phân bổ theo cột Type",
                tasks: graphicMetrics.tasks.filter(
                  (task) =>
                    isGraphicPublication(task) &&
                    matchesGroup(task.type, label),
                ),
              })
            }
          />
        </div>
      </section>
    </>
  );
}
