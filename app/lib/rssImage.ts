/**
 * Pull the most likely featured-image URL from a parsed RSS entry. Different
 * publishers use different tags; we try them in priority order:
 *
 *   1. media:content — usually the largest/branded image. Often carries
 *      width/height attributes too.
 *   2. media:thumbnail — fallback when media:content is absent.
 *   3. enclosure — RSS 2.0 standard. Only used when the type indicates an
 *      image; podcasts use enclosure for audio, which we don't want here.
 *   4. First <img src> in the content body — last-resort scrape.
 *
 * feed-extractor uses fast-xml-parser internally with `@_` as the attribute
 * prefix, so attribute reads look like `node["@_url"]`. Tags can also appear
 * as arrays when the publisher emits multiples; we just take the first.
 */
export function extractRssImage(
  entry: Record<string, unknown>,
  contentHtml: string
): string | null {
  const firstUrlFromTag = (key: string, requireImageType = false): string | null => {
    const node = entry[key];
    if (!node) return null;
    const one = (Array.isArray(node) ? node[0] : node) as Record<string, unknown> | undefined;
    if (!one) return null;
    const url = one["@_url"] as string | undefined;
    if (!url) return null;
    if (requireImageType) {
      const type = (one["@_type"] as string | undefined) || "";
      if (!type.startsWith("image/")) return null;
    }
    return url;
  };

  const fromMediaContent = firstUrlFromTag("media:content");
  if (fromMediaContent) return fromMediaContent;

  const fromMediaThumbnail = firstUrlFromTag("media:thumbnail");
  if (fromMediaThumbnail) return fromMediaThumbnail;

  // Enclosure must be an image — podcasts use the same tag for audio.
  const fromEnclosure = firstUrlFromTag("enclosure", true);
  if (fromEnclosure) return fromEnclosure;

  // Last resort: scrape the first <img> in the body. Skip 1×1 tracking
  // pixels by ignoring obviously tiny ones.
  const imgMatch = contentHtml.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (imgMatch) {
    const tag = imgMatch[0];
    const isTracker = /\b(width|height)\s*=\s*["']?1["']?/i.test(tag);
    if (!isTracker) return imgMatch[1];
  }

  return null;
}
