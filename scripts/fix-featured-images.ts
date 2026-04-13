/**
 * Fix featured images by looking up WordPress postmeta (_thumbnail_id)
 * and matching to attachment URLs in wp_posts.
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
    const insertIdx = sql.indexOf(`INSERT INTO \`${fullName}\``, searchFrom);
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

  // Step 1: Parse postmeta to find _thumbnail_id entries
  console.log("Parsing postmeta for _thumbnail_id...");
  const metaRows = parseTable(sql, "postmeta");
  // postmeta cols: meta_id, post_id, meta_key, meta_value
  const thumbnailMap = new Map<string, string>(); // post_id → attachment_id
  for (const row of metaRows) {
    if (cleanValue(row[2]) === "_thumbnail_id") {
      thumbnailMap.set(row[1], cleanValue(row[3]));
    }
  }
  console.log(`  Found ${thumbnailMap.size} posts with _thumbnail_id`);

  // Step 2: Parse posts to find attachment GUIDs (the image URLs)
  console.log("Parsing posts for attachment URLs...");
  const postRows = parseTable(sql, "posts");
  const attachmentUrls = new Map<string, string>(); // post_id → guid (URL)
  for (const row of postRows) {
    if (cleanValue(row[20]) === "attachment") {
      attachmentUrls.set(row[0], cleanValue(row[18])); // guid column
    }
  }
  console.log(`  Found ${attachmentUrls.size} attachments`);

  // Step 3: Build post_id → slug map for published posts
  const publishedSlugs = new Map<string, string>(); // wp post_id → slug
  for (const row of postRows) {
    if (cleanValue(row[7]) === "publish" && cleanValue(row[20]) === "post") {
      publishedSlugs.set(row[0], cleanValue(row[11]));
    }
  }

  // Step 4: Get current posts without images from Supabase
  console.log("Fetching posts without images from Supabase...");
  const posts: { id: string; slug: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug")
      .or("image.is.null,image.eq.")
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    posts.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  ${posts.length} posts missing images in Supabase`);

  // Step 5: Match and update
  let fixed = 0;
  const slugToWpId = new Map<string, string>();
  for (const [wpId, slug] of publishedSlugs) {
    slugToWpId.set(slug, wpId);
  }

  for (const post of posts) {
    const wpId = slugToWpId.get(post.slug);
    if (!wpId) continue;

    const attachmentId = thumbnailMap.get(wpId);
    if (!attachmentId) continue;

    let imageUrl = attachmentUrls.get(attachmentId);
    if (!imageUrl) continue;

    // Check if we have this image in Supabase Storage already
    // The media migration may have uploaded it — check the migrated URLs cache
    const cachePath = resolve(__dirname, "../.media-cache/migrated-urls.json");
    try {
      const cache = JSON.parse(readFileSync(cachePath, "utf-8"));
      if (cache[imageUrl]) {
        imageUrl = cache[imageUrl];
      }
    } catch {}

    const { error } = await supabase
      .from("blog_posts")
      .update({ image: imageUrl })
      .eq("id", post.id);

    if (!error) fixed++;
  }

  console.log(`\nFixed ${fixed} posts with featured images from WordPress metadata`);
  console.log(`Still missing: ${posts.length - fixed}`);
}

main().catch(console.error);
