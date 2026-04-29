/**
 * Migrate Yoast SEO metadata into existing blog_posts:
 *  _yoast_wpseo_title       → meta_title
 *  _yoast_wpseo_metadesc    → meta_description
 *  _yoast_wpseo_canonical   → canonical_url (only when explicitly set)
 *  _yoast_wpseo_opengraph-image → og_image
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SQL_FILE = resolve(__dirname, "../10_204_132_8.sql");
const TABLE_PREFIX = "wp_fcvr0hzgpz_";

function cleanValue(val: string): string {
  if (val === "NULL") return "";
  return val.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function parseTable(sql: string, tableName: string): string[][] {
  const fullName = `${TABLE_PREFIX}${tableName}`;
  const allRows: string[][] = [];
  let searchFrom = 0;
  while (true) {
    const insertIdx = sql.indexOf("INSERT INTO \`" + fullName + "\`", searchFrom);
    if (insertIdx === -1) break;
    const valuesIdx = sql.indexOf("VALUES", insertIdx);
    if (valuesIdx === -1) break;
    let pos = valuesIdx + 6;
    while (pos < sql.length && (sql[pos] === " " || sql[pos] === "\n" || sql[pos] === "\r")) pos++;
    while (pos < sql.length && sql[pos] === "(") {
      pos++;
      const values: string[] = [];
      let current = "";
      let inString = false;
      let escaped = false;
      while (pos < sql.length) {
        const ch = sql[pos];
        if (escaped) { current += ch; escaped = false; pos++; continue; }
        if (ch === "\\" && inString) { escaped = true; current += ch; pos++; continue; }
        if (ch === "'" && !inString) { inString = true; pos++; continue; }
        if (ch === "'" && inString) {
          if (pos + 1 < sql.length && sql[pos + 1] === "'") { current += "'"; pos += 2; continue; }
          inString = false; pos++; continue;
        }
        if (inString) { current += ch; pos++; continue; }
        if (ch === ",") { values.push(current.trim()); current = ""; pos++; continue; }
        if (ch === ")") { values.push(current.trim()); allRows.push(values); pos++; break; }
        current += ch; pos++;
      }
      while (pos < sql.length && (sql[pos] === "," || sql[pos] === "\n" || sql[pos] === "\r" || sql[pos] === " ")) pos++;
      if (pos < sql.length && sql[pos] === ";") { pos++; break; }
    }
    searchFrom = pos;
  }
  return allRows;
}

async function main() {
  console.log("Reading SQL dump...");
  const sql = readFileSync(SQL_FILE, "utf-8");

  // Build wpId → slug map for published posts
  console.log("Mapping WordPress post IDs to slugs...");
  const postRows = parseTable(sql, "posts");
  const wpIdToSlug = new Map<string, string>();
  for (const row of postRows) {
    if (cleanValue(row[7]) === "publish" && cleanValue(row[20]) === "post") {
      wpIdToSlug.set(row[0], cleanValue(row[11]));
    }
  }
  console.log(`  ${wpIdToSlug.size} published posts mapped`);

  // Parse postmeta and extract Yoast SEO fields
  console.log("Parsing Yoast SEO metadata...");
  const metaRows = parseTable(sql, "postmeta");

  // Build attachment map for OG image lookup
  const attachmentUrls = new Map<string, string>();
  for (const row of postRows) {
    if (cleanValue(row[20]) === "attachment") {
      attachmentUrls.set(row[0], cleanValue(row[18]));
    }
  }

  // Per post ID, collect SEO data
  const seoByPost = new Map<string, {
    meta_title?: string;
    meta_description?: string;
    canonical_url?: string;
    og_image?: string;
  }>();

  for (const row of metaRows) {
    const postId = row[1];
    const key = cleanValue(row[2]);
    const val = cleanValue(row[3]);

    if (!val) continue;
    if (!seoByPost.has(postId)) seoByPost.set(postId, {});
    const entry = seoByPost.get(postId)!;

    if (key === "_yoast_wpseo_title") entry.meta_title = val;
    else if (key === "_yoast_wpseo_metadesc") entry.meta_description = val;
    else if (key === "_yoast_wpseo_canonical") entry.canonical_url = val;
    else if (key === "_yoast_wpseo_opengraph-image") entry.og_image = val;
    else if (key === "_yoast_wpseo_opengraph-image-id") {
      // Only set OG image if not already set, look up attachment URL
      if (!entry.og_image) {
        const url = attachmentUrls.get(val);
        if (url) entry.og_image = url;
      }
    }
  }
  console.log(`  ${seoByPost.size} posts have at least one SEO field`);

  // Map to slugs and update Supabase
  console.log("Updating blog posts in Supabase...");
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches
  const updates: { slug: string; data: Record<string, string | null> }[] = [];
  for (const [wpId, seo] of seoByPost) {
    const slug = wpIdToSlug.get(wpId);
    if (!slug) { skipped++; continue; }

    const update: Record<string, string | null> = {};
    if (seo.meta_title) update.meta_title = seo.meta_title;
    if (seo.meta_description) update.meta_description = seo.meta_description;
    if (seo.canonical_url) update.canonical_url = seo.canonical_url;
    if (seo.og_image) update.og_image = seo.og_image;

    if (Object.keys(update).length === 0) continue;
    updates.push({ slug, data: update });
  }

  console.log(`  ${updates.length} posts to update with SEO data`);

  for (let i = 0; i < updates.length; i++) {
    const { slug, data } = updates[i];
    const { error } = await supabase.from("blog_posts").update(data).eq("slug", slug);
    if (error) errors++;
    else updated++;

    if ((i + 1) % 200 === 0 || i === updates.length - 1) {
      console.log(`  Progress: ${i + 1}/${updates.length} (${updated} updated, ${errors} errors)`);
    }
  }

  console.log(`\n  Updated ${updated} posts with Yoast SEO metadata`);
  console.log(`  Skipped ${skipped} (post not migrated)`);
  console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
