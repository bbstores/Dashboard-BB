"use client";

import { COLORS } from "../model/constants";
import { formatMinutes, formatPercent } from "@/shared/formatting/format";
import type {
  AssigneeStageDatum,
  AssigneeStageProfile,
} from "../analytics/types";
import { HelpButton } from "./HelpButton";

/**
 * Cơ cấu công đoạn theo nhân sự trên một trục dùng chung.
 *
 * Bản radar trước đây chuẩn hoá theo đỉnh cao nhất của riêng từng người nên ai
 * cũng có một đỉnh đạt 100%, số trục lại đổi theo người và thứ tự trục sắp theo
 * giá trị — hình dạng là sản phẩm của phép sắp xếp, không so sánh được giữa
 * người với người. Thanh 100% xếp lớp giữ được cơ cấu, cộng thêm cột tổng task
 * để vẫn thấy khác biệt về khối lượng.
 */
export function AssigneeStageMix({
  profiles,
  onSelect,
}: {
  profiles: AssigneeStageProfile[];
  onSelect?: (assignee: string, stage: AssigneeStageDatum) => void;
}) {
  const stageOrder = Array.from(
    new Set(
      profiles.flatMap((profile) =>
        profile.stages.map((stage) => stage.label),
      ),
    ),
  ).sort((left, right) => {
    const total = (label: string) =>
      profiles.reduce(
        (sum, profile) =>
          sum +
          (profile.stages.find((stage) => stage.label === label)?.value ?? 0),
        0,
      );
    return total(right) - total(left) || left.localeCompare(right, "vi");
  });
  const colorFor = (label: string) =>
    COLORS[stageOrder.indexOf(label) % COLORS.length];
  const maxTotal = Math.max(1, ...profiles.map((row) => row.totalTasks));

  return (
    <article className="chartCard fullWidth groupPeople assigneeStageCard">
      <div className="chartTitle">
        <div>
          <span className="chartKicker">PHÂN BỔ TASK THEO CÔNG ĐOẠN</span>
          <h3>Chân dung công việc của nhân sự</h3>
          <span className="chartSubtitle">
            Mỗi thanh là cơ cấu công đoạn của một nhân sự; cột bên phải là tổng
            số task để so sánh cả khối lượng.
          </span>
        </div>
        <HelpButton
          help={{
            title: "Công đoạn thường được giao",
            purpose:
              "Nhìn nhanh một nhân sự thường đảm nhiệm những công đoạn nào trong kỳ đang lọc.",
            objective:
              "Đoạn dài thể hiện công đoạn chiếm nhiều task của nhân sự; dùng để nhận biết mức độ chuyên môn hóa hoặc phân bổ công việc.",
            calculation:
              "Đếm task theo cột Công đoạn (Stage) của từng assignee. Task nhiều assignee được tính cho từng người. Mỗi thanh chuẩn hoá về 100% để so cơ cấu; thanh tổng task bên phải dùng trục chung để so khối lượng.",
            example:
              "Nếu Edit có 12 task và Graphic Design có 6 task, đoạn Edit chiếm 2/3 thanh và tổng task là 18.",
            note: "Task chưa có assignee được gom vào nhóm Chưa có assignee.",
          }}
        />
      </div>

      {profiles.length ? (
        <>
          <div className="stageMixLegend">
            {stageOrder.map((label) => (
              <span key={label}>
                <i style={{ backgroundColor: colorFor(label) }} />
                {label}
              </span>
            ))}
          </div>
          <div className="stageMixRows">
            {profiles.map((profile) => (
              <div className="stageMixRow" key={profile.assignee}>
                <strong title={profile.assignee}>{profile.assignee}</strong>
                <div className="stageMixBar">
                  {profile.stages.map((stage) => (
                    <button
                      type="button"
                      key={stage.label}
                      className="stageMixSegment"
                      style={{
                        width: `${(stage.value / Math.max(1, profile.totalTasks)) * 100}%`,
                        backgroundColor: colorFor(stage.label),
                      }}
                      title={`${stage.label}: ${stage.value} task · ${formatPercent(stage.value, profile.totalTasks)} · ${formatMinutes(stage.minutes)}`}
                      aria-label={`${stage.label} của ${profile.assignee}: ${stage.value} task`}
                      onClick={() => onSelect?.(profile.assignee, stage)}
                    >
                      <span>{stage.value}</span>
                    </button>
                  ))}
                </div>
                <div className="stageMixTotal">
                  <i
                    style={{
                      width: `${(profile.totalTasks / maxTotal) * 100}%`,
                    }}
                  />
                  <b>{profile.totalTasks}</b>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="emptyText">Chưa có dữ liệu công đoạn theo nhân sự.</p>
      )}
    </article>
  );
}
