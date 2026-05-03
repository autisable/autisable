import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Match the same env-loading pattern as the other scripts in this folder.
const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Per Joel's note: legacy syndicated posts (imported from RSS during the WP
 * migration) carry a "Read Original Post" link in their body that points back
 * to the canonical source. We use that as the syndication signal and as a
 * unique identifier of the original article.
 *
 * Match the anchor with case-insensitive, allowing:
 *   - whitespace inside attributes
 *   - extra attrs (rel, target, class, etc.) before/after href
 *   - either Read Original Post / Read original post / read original post
 *
 * Capture the href so we can store it as canonical_url.
 */
const READ_ORIGINAL_RE =
  /<a[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>\s*Read\s+Original\s+Post\s*<\/a>/i;

const PAGE_SIZE = 500;

async function main() {
  let from = 0;
  let totalScanned = 0;
  let flagged = 0;
  let urlsBackfilled = 0;
  let alreadyFlagged = 0;

  while (true) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, content, is_syndicated, canonical_url")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Fetch error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const post of data) {
      totalScanned++;
      const content: string = post.content || "";
      const match = content.match(READ_ORIGINAL_RE);
      if (!match) continue;

      const detectedUrl = match[1].trim();
      const update: { is_syndicated?: boolean; canonical_url?: string } = {};
      // Don't clobber a canonical_url already set; per Joel's note we only use
      // the link as a unique identifier — never modify it.
      if (!post.is_syndicated) update.is_syndicated = true;
      if (!post.canonical_url) update.canonical_url = detectedUrl;

      if (post.is_syndicated && post.canonical_url) {
        alreadyFlagged++;
        continue;
      }

      const { error: upErr } = await supabase
        .from("blog_posts")
        .update(update)
        .eq("id", post.id);

      if (upErr) {
        console.error(`Update failed for ${post.id}:`, upErr.message);
        continue;
      }
      if (update.is_syndicated) flagged++;
      if (update.canonical_url) urlsBackfilled++;
    }

    process.stdout.write(`\rscanned ${totalScanned} / 5097…`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`\nDone.`);
  console.log(`  Scanned:               ${totalScanned}`);
  console.log(`  Newly flagged:         ${flagged}`);
  console.log(`  Already flagged:       ${alreadyFlagged}`);
  console.log(`  canonical_url filled:  ${urlsBackfilled}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
