/**
 * Migrate WordPress tags to a `tags` text array column on blog_posts.
 *
 * BEFORE RUNNING:
 * In Supabase SQL Editor run:
 *   ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tags TEXT[];
 *   CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN (tags);
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

  console.log("Parsing terms...");
  const termsRows = parseTable(sql, "terms");
  const termsMap = new Map<string, string>();
  termsRows.forEach((r) => termsMap.set(r[0], cleanValue(r[1])));

  console.log("Parsing term_taxonomy for tags...");
  const taxonomyRows = parseTable(sql, "term_taxonomy");
  const tagTaxIds = new Map<string, string>();
  taxonomyRows.forEach((r) => {
    const taxonomy = cleanValue(r[2]);
    if (taxonomy === "post_tag") tagTaxIds.set(r[0], r[1]);
  });
  console.log(`  Found ${tagTaxIds.size} tag taxonomies`);

  console.log("Parsing term_relationships...");
  const relRows = parseTable(sql, "term_relationships");

  // Build wp post ID → tags map
  const postTags = new Map<string, string[]>();
  for (const row of relRows) {
    const objectId = row[0];
    const termTaxId = row[1];
    if (tagTaxIds.has(termTaxId)) {
      const termId = tagTaxIds.get(termTaxId)!;
      const tagName = termsMap.get(termId);
      if (tagName) {
        if (!postTags.has(objectId)) postTags.set(objectId, []);
        postTags.get(objectId)!.push(tagName);
      }
    }
  }
  console.log(`  Mapped ${postTags.size} posts with tags`);

  // Map wp post ID → slug
  console.log("Mapping post IDs to slugs...");
  const postRows = parseTable(sql, "posts");
  const wpIdToSlug = new Map<string, string>();
  for (const row of postRows) {
    const t = cleanValue(row[20]);
    if (t === "post") wpIdToSlug.set(row[0], cleanValue(row[11]));
  }

  // Update Supabase
  console.log("Updating posts with tags...");
  let updated = 0;
  let skipped = 0;
  const entries = [...postTags.entries()];

  for (let i = 0; i < entries.length; i++) {
    const [wpId, tags] = entries[i];
    const slug = wpIdToSlug.get(wpId);
    if (!slug) { skipped++; continue; }

    const uniqueTags = [...new Set(tags)];
    const { error } = await supabase
      .from("blog_posts")
      .update({ tags: uniqueTags })
      .eq("slug", slug);

    if (!error) updated++;
    if ((i + 1) % 200 === 0 || i === entries.length - 1) {
      console.log(`  Progress: ${i + 1}/${entries.length} (${updated} updated, ${skipped} skipped)`);
    }
  }

  console.log(`\nDone. Updated ${updated} posts with tags, skipped ${skipped}`);
}

main().catch(console.error);
