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
          return { fullContent: content as string };
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

        await supabaseAdmin.from("rss_queue").insert({
          feed_id: feed.id,
          feed_name: feed.name,
          title: entry.title || "Untitled",
          content: (entry as unknown as Record<string, unknown>).fullContent as string || entry.description || "",
          excerpt: entry.description?.slice(0, 300) || "",
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
