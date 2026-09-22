import type { PieMetricSet } from "../analytics/types";
import { HorizontalBars } from "../components/HorizontalBars";
import { PieChart } from "../components/PieChart";
import {
  groupCount,
  groupWithOther,
  isGraphicPublication,
  isOtherGroupLabel,
  isVideoPublication,
  matchesGroup,
  otherGroupLabels,
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

/** Bộ chọn phạm vi và trừ outsource, tách ra để bar dùng lại của PieChart. */
function PublicationScopeTools({
  scope,
  excludeOutsource,
  onScopeChange,
  onExcludeOutsourceChange,
}: {
  scope: PieScope;
  excludeOutsource: boolean;
  onScopeChange: (scope: PieScope) => void;
  onExcludeOutsourceChange: (checked: boolean) => void;
}) {
  return (
    <>
      <select
        className="scopeSelector"
        value={scope}
        onChange={(event) => onScopeChange(event.target.value as PieScope)}
        aria-label="Phạm vi dữ liệu"
      >
        <option value="combined">Tổng khử trùng</option>
        <option value="started">Bắt đầu trong kỳ</option>
        <option value="inspectionCarry">Carry-in bàn giao</option>
        <option value="completionCarry">Carry-in hoàn thành</option>
      </select>
      <label className="checkboxLabel">
        <input
          type="checkbox"
          checked={excludeOutsource}
          onChange={(event) =>
            onExcludeOutsourceChange(event.target.checked)
          }
        />
        Trừ outsource
      </label>
    </>
  );
}

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
          <HorizontalBars
            title="Theo Format Type"
            subtitle="SỐ ẤN PHẨM VIDEO"
            className="publicationFormatBars"
            rows={groupWithOther(videoMetrics.videoFormats)}
            help={{
              title: "Ấn phẩm Video theo Format Type",
              purpose: "Cơ cấu số ấn phẩm video theo từng định dạng đầu ra.",
              objective:
                "Giúp quản lý biết đội ngũ đang sản xuất nhiều loại video nào để cân đối năng lực edit và kế hoạch nội dung.",
              calculation:
                "Chỉ lấy task có Format Type chứa từ khóa video và Công đoạn là Edit, sau đó nhóm theo Format Type. Các định dạng ngoài 9 nhóm lớn nhất được gom vào lát Khác.",
              example:
                "Reels Video có 30 trong tổng 50 ấn phẩm video → thanh này là 30.",
              note: "Dùng thanh ngang vì số định dạng thường vượt quá số màu của biểu đồ tròn.",
            }}
            headerAction={
              <PublicationScopeTools
                scope={videoScope}
                excludeOutsource={videoExcludeOutsource}
                onScopeChange={(scope) =>
                  onScopeChange("videoPublications", scope)
                }
                onExcludeOutsourceChange={(checked) =>
                  onExcludeOutsourceChange("videoPublications", checked)
                }
              />
            }
            onSelect={(label) => {
              const others = otherGroupLabels(videoMetrics.videoFormats);
              const tasks = videoMetrics.tasks.filter(
                (task) =>
                  isVideoPublication(task) &&
                  (isOtherGroupLabel(label)
                    ? others.some((name) =>
                        matchesGroup(task.formatType, name),
                      )
                    : matchesGroup(task.formatType, label)),
              );
              onOpenDetail({
                title: `Video · Format Type · ${label}`,
                subtitle: "Format Type chứa 'video' và Công đoạn là Edit",
                tasks,
              });
            }}
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
          <HorizontalBars
            title="Theo Format Type"
            subtitle="SỐ ẤN PHẨM GRAPHIC"
            className="publicationFormatBars"
            rows={groupWithOther(graphicMetrics.graphicFormats)}
            help={{
              title: "Ấn phẩm Graphic theo Format Type",
              purpose:
                "Cơ cấu số ấn phẩm hình ảnh theo từng định dạng đầu ra.",
              objective:
                "Giúp quản lý nhìn nhu cầu thiết kế theo định dạng để cân đối năng lực graphic và kế hoạch sản xuất.",
              calculation:
                "Chỉ lấy task có Công đoạn Graphic Design và Format Type không chứa video, sau đó nhóm theo Format Type. Các định dạng ngoài 9 nhóm lớn nhất được gom vào lát Khác.",
              example:
                "Banner có 40 trong tổng 100 ấn phẩm graphic → thanh Banner là 40.",
              note: "Dùng thanh ngang vì số định dạng thường vượt quá số màu của biểu đồ tròn.",
            }}
            headerAction={
              <PublicationScopeTools
                scope={graphicScope}
                excludeOutsource={graphicExcludeOutsource}
                onScopeChange={(scope) =>
                  onScopeChange("graphicPublications", scope)
                }
                onExcludeOutsourceChange={(checked) =>
                  onExcludeOutsourceChange("graphicPublications", checked)
                }
              />
            }
            onSelect={(label) => {
              const others = otherGroupLabels(graphicMetrics.graphicFormats);
              const tasks = graphicMetrics.tasks.filter(
                (task) =>
                  isGraphicPublication(task) &&
                  (isOtherGroupLabel(label)
                    ? others.some((name) =>
                        matchesGroup(task.formatType, name),
                      )
                    : matchesGroup(task.formatType, label)),
              );
              onOpenDetail({
                title: `Graphic · Format Type · ${label}`,
                subtitle: "Công đoạn Graphic Design và không phải video",
                tasks,
              });
            }}
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
