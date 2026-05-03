import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { extract } from "@extractus/feed-extractor";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active RSS feeds
  const { data: feeds } = await supabaseAdmin
    .from("rss_feeds")
    .select("id, url, name, is_active")
    .eq("is_active", true);

  if (!feeds || feeds.length === 0) {
    return NextResponse.json({ imported: 0 });
  }

  // Hard cap on imports per cron run — keeps the editorial review queue at
  // a manageable size. Loops break out once we hit this. Counts NEW imports
  // only; already-seen entries don't count against the cap.
  const MAX_IMPORTS_PER_RUN = 5;
  let totalImported = 0;

  outer: for (const feed of feeds) {
    if (totalImported >= MAX_IMPORTS_PER_RUN) break;
    try {
      const result = await extract(feed.url, {
        getExtraEntryFields: (feedEntry: object) => {
          const entry = feedEntry as Record<string, unknown>;
          const content = entry["content:encoded"] || entry.content || "";
          return {
            fullContent: content as string,
            extractedImage: extractImage(entry, content as string),
          };
        },
      });

      if (!result?.entries) continue;

      for (const entry of result.entries) {
        if (totalImported >= MAX_IMPORTS_PER_RUN) break outer;

        // Check if already imported
        const { data: existing } = await supabaseAdmin
          .from("rss_queue")
          .select("id")
          .eq("source_url", entry.link || "")
          .single();

        if (existing) continue;

        const extras = entry as unknown as Record<string, unknown>;
        await supabaseAdmin.from("rss_queue").insert({
          feed_id: feed.id,
          feed_name: feed.name,
          title: entry.title || "Untitled",
          content: (extras.fullContent as string) || entry.description || "",
          excerpt: entry.description?.slice(0, 300) || "",
          image_url: (extras.extractedImage as string | null) || null,
          source_url: entry.link || "",
          published_date: entry.published || new Date().toISOString(),
          status: "pending",
        });

        totalImported++;
      }
    } catch (err) {
      // Log error for this feed but continue with others
      await supabaseAdmin.from("rss_feed_errors").insert({
        feed_id: feed.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ imported: totalImported, capped: totalImported >= MAX_IMPORTS_PER_RUN });
}

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
function extractImage(entry: Record<string, unknown>, contentHtml: string): string | null {
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
  // pixels by ignoring obviously tiny ones (height=1 / width=1 in attrs).
  const imgMatch = contentHtml.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (imgMatch) {
    const tag = imgMatch[0];
    const isTracker = /\b(width|height)\s*=\s*["']?1["']?/i.test(tag);
    if (!isTracker) return imgMatch[1];
  }

  return null;
}
