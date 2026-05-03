import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Per Joel: copy blog_posts.image → blog_posts.og_image wherever og_image
 * is currently null and image is not null. Makes the social card mirror
 * the featured image at the data layer instead of relying on the
 * /api/og/featured/[slug]/ runtime fallback.
 *
 * Idempotent. Safe to re-run — only touches rows where og_image IS NULL.
 */

const PAGE_SIZE = 500;

async function main() {
  let totalUpdated = 0;
  const skippedIds: string[] = [];

  while (true) {
    let q = supabase
      .from("blog_posts")
      .select("id, image")
      .is("og_image", null)
      .not("image", "is", null)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);

    if (skippedIds.length > 0) {
      q = q.not("id", "in", `(${skippedIds.join(",")})`);
    }

    const { data, error } = await q;
    if (error) {
      console.error("Fetch error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const post of data) {
      if (!post.image) {
        skippedIds.push(post.id);
        continue;
      }
      const { error: upErr } = await supabase
        .from("blog_posts")
        .update({ og_image: post.image })
        .eq("id", post.id);
      if (upErr) {
        console.error(`Update failed for ${post.id}:`, upErr.message);
        skippedIds.push(post.id);
        continue;
      }
      totalUpdated++;
    }

    process.stdout.write(`\rupdated ${totalUpdated}…`);
  }

  console.log(`\nDone. Copied image -> og_image on ${totalUpdated} posts.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
