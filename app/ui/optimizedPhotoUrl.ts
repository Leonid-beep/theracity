const DEFAULT_QUALITY = 72;

const warmedPhotoUrls = new Set<string>();

export function getOptimizedPhotoUrl(
  src: string,
  width: number,
  quality = DEFAULT_QUALITY,
): string {
  const url = new URL(src, "https://theracity.local");
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality));
  return `${url.pathname}${url.search}`;
}

export function preloadOptimizedPhoto(
  src: string,
  width: number,
  quality = DEFAULT_QUALITY,
): void {
  if (typeof window === "undefined" || !src) return;

  const optimizedUrl = getOptimizedPhotoUrl(src, width, quality);
  if (warmedPhotoUrls.has(optimizedUrl)) return;

  warmedPhotoUrls.add(optimizedUrl);

  const image = new window.Image();
  image.decoding = "async";
  image.src = optimizedUrl;
  void image.decode?.().catch(() => {});
}
