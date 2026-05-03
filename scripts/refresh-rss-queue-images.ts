import { createClient } from "@supabase/supabase-js";
import { extract } from "@extractus/feed-extractor";
import { readFileSync } from "fs";
import { resolve } from "path";
import { extractRssImage } from "../app/lib/rssImage";

const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * One-off backfill for queue rows imported before the cron started capturing
 * featured images. For each row with image_url IS NULL, look up its feed,
 * re-fetch the feed, find the matching entry by source_url, and run the same
 * extractRssImage helper the cron uses.
 *
 * Groups queries by feed so each feed only gets fetched once even if multiple
 * queue rows came from it.
 */

interface QueueRow {
  id: string;
  feed_id: string | null;
  source_url: string;
}

async function main() {
  const { data: rows, error } = await supabase
    .from("rss_queue")
    .select("id, feed_id, source_url")
    .is("image_url", null)
    .eq("status", "pending");

  if (error) {
    console.error("Fetch error:", error.message);
    process.exit(1);
  }
  const queue = (rows || []) as QueueRow[];
  if (queue.length === 0) {
    console.log("No queue rows missing image_url. Nothing to do.");
    return;
  }
  console.log(`Found ${queue.length} queue rows missing image_url.`);

  // Group by feed so we fetch each feed once.
  const byFeed = new Map<string, QueueRow[]>();
  for (const row of queue) {
    if (!row.feed_id) continue;
    const list = byFeed.get(row.feed_id) || [];
    list.push(row);
    byFeed.set(row.feed_id, list);
  }

  const feedIds = [...byFeed.keys()];
  const { data: feeds } = await supabase
    .from("rss_feeds")
    .select("id, name, url")
    .in("id", feedIds);

  let updated = 0;
  let noImage = 0;
  let noMatch = 0;
  let feedFailed = 0;

  for (const feed of feeds || []) {
    const feedRows = byFeed.get(feed.id) || [];
    let parsed;
    try {
      parsed = await extract(feed.url, {
        getExtraEntryFields: (feedEntry: object) => {
          const entry = feedEntry as Record<string, unknown>;
          const content = entry["content:encoded"] || entry.content || "";
          return {
            fullContent: content as string,
            extractedImage: extractRssImage(entry, content as string),
          };
        },
      });
    } catch (err) {
      feedFailed += feedRows.length;
      console.error(`Feed fetch failed for ${feed.name}:`, err);
      continue;
    }
    const entries = parsed?.entries || [];
    // Build a lookup table from source URL to extracted image.
    const imageByLink = new Map<string, string | null>();
    for (const entry of entries) {
      const link = entry.link || "";
      const img = ((entry as unknown as Record<string, unknown>).extractedImage as string | null) || null;
      if (link) imageByLink.set(link, img);
    }

    for (const row of feedRows) {
      const img = imageByLink.get(row.source_url);
      if (img === undefined) {
        // Source entry no longer in the feed (feed has rotated past it).
        noMatch++;
        continue;
      }
      if (!img) {
        noImage++;
        continue;
      }
      const { error: upErr } = await supabase
        .from("rss_queue")
        .update({ image_url: img })
        .eq("id", row.id);
      if (upErr) {
        console.error(`Update failed for ${row.id}:`, upErr.message);
        continue;
      }
      updated++;
      console.log(`  ${feed.name} → ${row.source_url}\n    image: ${img}`);
    }
  }

  console.log(`\nDone.`);
  console.log(`  Queue rows missing image: ${queue.length}`);
  console.log(`  Updated:                  ${updated}`);
  console.log(`  Source had no image:      ${noImage}`);
  console.log(`  Entry rotated out:        ${noMatch}`);
  console.log(`  Feed fetch failed:        ${feedFailed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
