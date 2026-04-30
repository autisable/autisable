/**
 * Two-phase image-URL hygiene script:
 *
 *   1. Decode `&amp;` (and a few other common HTML entities) inside `image`
 *      values that were written with un-decoded entities.
 *   2. Audit `image` values that still point at `https://autisable.com/wp-content/uploads/...`
 *      (legacy WP paths). After DNS cutover those will 404. Map each through
 *      .media-cache/migrated-urls.json when possible. Anything we can't map
 *      gets reported so it can be re-uploaded manually before launch.
 *
 * Pass `--dry-run` to preview without writing.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const dryRun = process.argv.includes("--dry-run");

const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

async function fixHtmlEntities() {
  console.log(dryRun ? "\n[DRY RUN] Phase 1: HTML entities" : "\nPhase 1: HTML entities");
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, image")
    .or("image.like.%&amp;%,image.like.%&#038;%,image.like.%&quot;%");

  if (!posts || posts.length === 0) {
    console.log("  No rows with un-decoded entities.");
    return;
  }
  console.log(`  Found ${posts.length} rows`);

  let updated = 0;
  for (const post of posts) {
    const decoded = decodeHtmlEntities(post.image as string);
    if (decoded === post.image) continue;
    if (dryRun) {
      console.log(`  [dry] ${post.slug}: ${post.image} → ${decoded}`);
      updated++;
      continue;
    }
    const { error } = await supabase.from("blog_posts").update({ image: decoded }).eq("id", post.id);
    if (error) {
      console.error(`  [fail] ${post.slug}: ${error.message}`);
    } else {
      console.log(`  [ok]   ${post.slug}`);
      updated++;
    }
  }
  console.log(`  ${dryRun ? "Would update" : "Updated"} ${updated} rows`);
}

async function auditLegacyAutisableUrls() {
  console.log(dryRun ? "\n[DRY RUN] Phase 2: Legacy autisable.com URLs" : "\nPhase 2: Legacy autisable.com URLs");

  let mediaCache: Record<string, string> = {};
  try {
    const cachePath = resolve(__dirname, "../.media-cache/migrated-urls.json");
    mediaCache = JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    console.log("  WARN: no .media-cache/migrated-urls.json — won't be able to remap anything.");
  }

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, image")
    .like("image", "https://autisable.com/wp-content/%");

  if (!posts || posts.length === 0) {
    console.log("  No rows pointing at autisable.com/wp-content/.");
    return;
  }
  console.log(`  Found ${posts.length} rows pointing at autisable.com/wp-content/`);

  let mapped = 0;
  const unmapped: { slug: string; image: string }[] = [];

  for (const post of posts) {
    const oldUrl = post.image as string;
    const newUrl = mediaCache[oldUrl];
    if (!newUrl) {
      unmapped.push({ slug: post.slug, image: oldUrl });
      continue;
    }
    if (dryRun) {
      console.log(`  [dry] ${post.slug}: ${oldUrl} → ${newUrl}`);
      mapped++;
      continue;
    }
    const { error } = await supabase.from("blog_posts").update({ image: newUrl }).eq("id", post.id);
    if (error) {
      console.error(`  [fail] ${post.slug}: ${error.message}`);
    } else {
      console.log(`  [ok]   ${post.slug}`);
      mapped++;
    }
  }

  console.log(`\n  ${dryRun ? "Would remap" : "Remapped"} ${mapped} rows via media cache.`);
  console.log(`  ${unmapped.length} rows could not be remapped (image not in media cache).`);
  if (unmapped.length > 0) {
    console.log("\n  Unmapped URLs (these will 404 after DNS cutover unless re-uploaded):");
    for (const u of unmapped) {
      console.log(`    ${u.slug}\n      ${u.image}`);
    }
  }
}

async function main() {
  await fixHtmlEntities();
  await auditLegacyAutisableUrls();
  if (dryRun) console.log("\n(Dry run — no rows modified. Re-run without --dry-run to apply.)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
