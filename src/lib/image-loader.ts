"use client";

/**
 * Image loader for next/image.
 *
 * Unsplash runs its own image CDN, so we ask it directly for a resized,
 * compressed copy (auto=format serves WebP/AVIF where supported). This is
 * faster than routing through the Next.js optimizer, which would download the
 * full-size original first. That timed out on slower connections, and it
 * matters for customers on mobile data.
 *
 * When real organiser uploads arrive, add a branch here for our own image
 * storage/CDN in the same way.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 70));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    return url.toString();
  }
  // Local files in /public: served as-is.
  return `${src}?w=${width}`;
}
