import { createClient } from "@supabase/supabase-js";
import { extract } from "@extractus/feed-extractor";
import { readFileSync } from "fs";
import { resolve } from "path";

// Match the env-loading pattern of the other scripts in this folder.
const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * One-off: VizyPlan's RSS originally only emitted <description> (1-paragraph
 * summary). We queued the article based on description; then VizyPlan added
 * <content:encoded> with the full body. This script re-fetches the feed,
 * mirroring the cron's parse logic, and refreshes any rss_queue rows whose
 * source_url matches a current feed entry — pulling in the full body if it
 * wasn't there before.
 *
 * Idempotent: if the queued content is already populated and equals what
 * the feed gives, the row is left untouched.
 */
const FEED_URL = "https://vizyplan.com/rss.xml";

async function main() {
  const result = await extract(FEED_URL, {
    getExtraEntryFields: (feedEntry: object) => {
      const entry = feedEntry as Record<string, unknown>;
      const content = entry["content:encoded"] || entry.content || "";
      return { fullContent: content as string };
    },
  });

  if (!result?.entries || result.entries.length === 0) {
    console.log("No entries in feed.");
    return;
  }

  let refreshed = 0;
  let alreadyFull = 0;
  let notQueued = 0;

  for (const entry of result.entries) {
    const sourceUrl = entry.link || "";
    if (!sourceUrl) continue;

    const fullContent =
      ((entry as unknown as Record<string, unknown>).fullContent as string) ||
      entry.description ||
      "";
    const excerpt = entry.description?.slice(0, 300) || "";

    const { data: queued } = await supabase
      .from("rss_queue")
      .select("id, content")
      .eq("source_url", sourceUrl)
      .single();

    if (!queued) {
      notQueued++;
      continue;
    }

    if (queued.content === fullContent) {
      alreadyFull++;
      continue;
    }

    const { error } = await supabase
      .from("rss_queue")
      .update({ content: fullContent, excerpt })
      .eq("id", queued.id);

    if (error) {
      console.error(`Failed to update ${sourceUrl}:`, error.message);
      continue;
    }
    refreshed++;
    console.log(
      `Refreshed: ${entry.title}\n  ${sourceUrl}\n  content length: ${fullContent.length} chars`
    );
  }

  console.log(`\nDone.`);
  console.log(`  Refreshed:        ${refreshed}`);
  console.log(`  Already up-to-date: ${alreadyFull}`);
  console.log(`  Not in queue:     ${notQueued}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
