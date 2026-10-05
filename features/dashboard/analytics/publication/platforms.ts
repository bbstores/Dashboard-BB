import type { PublicationPost, Task } from "../../model/types";
import { normalize, normalizedKey } from "../../model/taskUtils";

export function publicationBelongsToPlatform(
  post: PublicationPost,
  platform: string,
) {
  const postPlatform = normalizedKey(post.platform);
  const targetPlatform = normalizedKey(platform);
  if (targetPlatform === "shopee") {
    return (
      postPlatform === "shopee" ||
      (postPlatform.includes("tiktok") &&
        Boolean(post.shopeeSelected))
    );
  }
  return postPlatform === targetPlatform;
}

export function comparablePlatformKey(value: string) {
  return normalizedKey(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

const MEDIA_RESPONSE_EXCLUDED_PLATFORMS = new Set([
  "không đăng social",
  "cửa hàng",
  "tiktok bbstore's",
]);

export function isMediaResponseExcludedPlatform(value: string) {
  const platform = normalizedKey(value).replace(/[’‘`´]/g, "'");
  return MEDIA_RESPONSE_EXCLUDED_PLATFORMS.has(platform);
}

export function taskPlatformNames(task: Task) {
  return Array.from(
    new Map(
      normalize(task.platform)
        .split(/\s*[,;|\n]\s*/)
        .map(normalize)
        .filter(Boolean)
        .filter(
          (platform) =>
            normalizedKey(platform) !== "không đăng social",
        )
        .map((platform) => [comparablePlatformKey(platform), platform]),
    ).values(),
  );
}
