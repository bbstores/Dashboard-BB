import type { ClassifiedPublication, PublicationSource } from "../../analytics/calculatePublicationStats";

export const publicationSourceLabels: Record<PublicationSource, string> = {
  reup: "Bài reup",
  video: "Media · Video",
  graphic: "Media · Hình ảnh",
  unknown: "Chưa xác định",
};

export function sourceFromChartLabel(label: string): PublicationSource {
  return (
    Object.entries(publicationSourceLabels).find(
      ([, sourceLabel]) => sourceLabel === label,
    )?.[0] as PublicationSource | undefined
  ) ?? "unknown";
}

export function publicationEvidence(items: ClassifiedPublication[]) {
  return items.map((item) => ({
    post: item.post,
    task: item.task,
    reason: `${publicationSourceLabels[item.source]} · ${
      item.post.posted ? "Đã đăng" : "Chưa đăng"
    }`,
  }));
}

export function formatNormValue(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value);
}
