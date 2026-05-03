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
 * Per Joel's note: a chunk of legacy posts have og_image set to a stale
 * wp-content/uploads/* URL — leftover from the WP migration. Those URLs now
 * 403 on the new site, so social previews show no image at all.
 *
 * Featured images were migrated correctly (image column points at the new
 * Supabase storage bucket). Strategy: NULL out og_image on any row where it
 * matches /wp-content/uploads/ AND a valid featured image exists. Once og_image
 * is null, the runtime fallback chain in app/blog/[slug]/page.tsx kicks in and
 * serves /api/og/featured/[slug]/ — which renders the featured image at the
 * correct 1200x630 OG dimensions.
 *
 * Why NULL instead of copying image -> og_image: the featured-image URLs
 * aren't 1200x630, so pointing og_image directly at them just hands platforms
 * the same wrong-dimensions problem we're fixing. Letting the route resize is
 * the whole point of the fallback chain we shipped earlier today.
 *
 * Idempotent. Safe to re-run.
 */

const PAGE_SIZE = 500;
const STALE_PATTERN = "/wp-content/uploads/";

async function main() {
  let totalScanned = 0;
  let cleared = 0;
  let skippedNoFeatured = 0;

  // Don't paginate with an offset — as we clear rows they fall out of the
  // ilike filter, so the result set shrinks under us. Always grab the first
  // PAGE_SIZE matches; the loop ends when the filter returns nothing.
  // Skipped rows (no featured image) need to be excluded from subsequent
  // queries via a NOT IN list, otherwise we'd loop forever on them.
  const skippedIds: string[] = [];

  while (true) {
    let q = supabase
      .from("blog_posts")
      .select("id, image, og_image")
      .ilike("og_image", `%${STALE_PATTERN}%`)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);

    if (skippedIds.length > 0) {
      // PostgREST in-list syntax: id=not.in.(uuid1,uuid2,...)
      q = q.not("id", "in", `(${skippedIds.join(",")})`);
    }

    const { data, error } = await q;

    if (error) {
      console.error("Fetch error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const post of data) {
      totalScanned++;

      // Don't clear og_image if there's no featured image to fall back to.
      // We'd be left with the brand-card-only path, which is uglier than
      // leaving the broken URL alone (at least the editor can see it's wrong).
      if (!post.image) {
        skippedNoFeatured++;
        skippedIds.push(post.id);
        continue;
      }

      const { error: upErr } = await supabase
        .from("blog_posts")
        .update({ og_image: null })
        .eq("id", post.id);

      if (upErr) {
        console.error(`Update failed for ${post.id}:`, upErr.message);
        skippedIds.push(post.id); // don't loop on it again
        continue;
      }
      cleared++;
    }

    process.stdout.write(`\rscanned ${totalScanned}, cleared ${cleared}…`);
  }

  console.log(`\nDone.`);
  console.log(`  Scanned (matched wp-content): ${totalScanned}`);
  console.log(`  Cleared og_image (now NULL):  ${cleared}`);
  console.log(`  Skipped — no featured image:  ${skippedNoFeatured}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
