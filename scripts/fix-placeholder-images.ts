/**
 * Fix posts whose `image` column is a base64 placeholder GIF (left over from
 * the WordPress migration when the source HTML used a lazy-loading plugin).
 *
 * Strategy per post:
 *   1. Re-parse the post content, preferring real-URL attributes
 *      (data-src, data-lazy-src, data-original, data-actualsrc, srcset)
 *      over `src` (which is the 1x1 placeholder).
 *   2. Map the resulting URL through .media-cache/migrated-urls.json so it
 *      points at Supabase Storage when the migration already uploaded it.
 *   3. If no real URL is extractable, set image to NULL so the existing
 *      fix-featured-images.ts script can backfill from WP _thumbnail_id.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const LAZY_ATTRS = ["data-src", "data-lazy-src", "data-original", "data-actualsrc"];

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function findRealFirstImage(content: string): string | null {
  const tags = content.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    for (const attr of LAZY_ATTRS) {
      const m = tag.match(new RegExp(`\\b${attr}=["']([^"']+)["']`, "i"));
      if (m && !m[1].startsWith("data:")) return decodeHtmlEntities(m[1]);
    }
    const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcset) {
      const first = srcset[1].split(",")[0]?.trim().split(/\s+/)[0];
      if (first && !first.startsWith("data:")) return decodeHtmlEntities(first);
    }
    const src = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (src && !src[1].startsWith("data:")) return decodeHtmlEntities(src[1]);
  }
  return null;
}

async function main() {
  let mediaCache: Record<string, string> = {};
  try {
    const cachePath = resolve(__dirname, "../.media-cache/migrated-urls.json");
    mediaCache = JSON.parse(readFileSync(cachePath, "utf-8"));
    console.log(`Loaded ${Object.keys(mediaCache).length} URL mappings from media cache`);
  } catch {
    console.log("No .media-cache/migrated-urls.json found — will use original URLs as-is");
  }

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, content, image")
    .like("image", "data:image%");

  if (error) {
    console.error("Failed to fetch posts:", error.message);
    process.exit(1);
  }
  if (!posts || posts.length === 0) {
    console.log("No posts with placeholder images. Nothing to do.");
    return;
  }

  console.log(`Found ${posts.length} posts with placeholder images`);

  let resolved = 0;
  let cleared = 0;
  let failed = 0;

  for (const post of posts) {
    const realUrl = findRealFirstImage(post.content || "");
    const mappedUrl = realUrl && mediaCache[realUrl] ? mediaCache[realUrl] : realUrl;
    const newValue = mappedUrl || null;

    const { error: updateErr } = await supabase
      .from("blog_posts")
      .update({ image: newValue })
      .eq("id", post.id);

    if (updateErr) {
      console.error(`  [fail] ${post.slug}: ${updateErr.message}`);
      failed++;
      continue;
    }

    if (newValue) {
      console.log(`  [ok]   ${post.slug} → ${newValue}`);
      resolved++;
    } else {
      console.log(`  [null] ${post.slug} (no real image found, cleared for fix-featured-images backfill)`);
      cleared++;
    }
  }

  console.log(`\nDone. Resolved: ${resolved} / Cleared: ${cleared} / Failed: ${failed}`);
  if (cleared > 0) {
    console.log(`\nNext step: run \`npx tsx scripts/fix-featured-images.ts\` to backfill the ${cleared} cleared posts from WordPress _thumbnail_id metadata.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
