/**
 * Migrate Yoast focus keyphrases:
 *   _yoast_wpseo_focuskw       → focus_keyword (primary keyphrase)
 *   _yoast_wpseo_keywordsynonyms → keywords[] (synonyms — additional keyphrases)
 *   _yoast_wpseo_focuskeywords  → keywords[] (Premium: multi-keyphrase JSON)
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

  console.log("Mapping post IDs to slugs...");
  const postRows = parseTable(sql, "posts");
  const wpIdToSlug = new Map<string, string>();
  for (const row of postRows) {
    if (cleanValue(row[20]) === "post") {
      wpIdToSlug.set(row[0], cleanValue(row[11]));
    }
  }

  console.log("Parsing postmeta for keyword fields...");
  const metaRows = parseTable(sql, "postmeta");

  // Per-post keyword data
  const keywordData = new Map<string, { focus: string; extras: string[] }>();

  for (const row of metaRows) {
    const postId = row[1];
    const key = cleanValue(row[2]);
    const val = cleanValue(row[3]);
    if (!val) continue;

    if (!keywordData.has(postId)) keywordData.set(postId, { focus: "", extras: [] });
    const entry = keywordData.get(postId)!;

    if (key === "_yoast_wpseo_focuskw") {
      entry.focus = val;
    } else if (key === "_yoast_wpseo_keywordsynonyms") {
      // JSON array of strings
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) {
          arr.forEach((k) => { if (typeof k === "string" && k.trim()) entry.extras.push(k.trim()); });
        }
      } catch {/* ignore */}
    } else if (key === "_yoast_wpseo_focuskeywords") {
      // Yoast Premium: JSON array of {keyword, score}
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) {
          arr.forEach((k) => {
            if (typeof k === "object" && k && typeof k.keyword === "string" && k.keyword.trim()) {
              entry.extras.push(k.keyword.trim());
            }
          });
        }
      } catch {/* ignore */}
    }
  }

  console.log(`  ${keywordData.size} posts have at least one keyword field`);

  // Update Supabase
  console.log("Updating posts...");
  let updated = 0;
  let skipped = 0;
  const entries = [...keywordData.entries()];

  for (let i = 0; i < entries.length; i++) {
    const [wpId, kw] = entries[i];
    const slug = wpIdToSlug.get(wpId);
    if (!slug) { skipped++; continue; }
    if (!kw.focus && kw.extras.length === 0) continue;

    const update: Record<string, unknown> = {};
    if (kw.focus) update.focus_keyword = kw.focus;
    if (kw.extras.length > 0) update.keywords = [...new Set(kw.extras)];

    const { error } = await supabase.from("blog_posts").update(update).eq("slug", slug);
    if (!error) updated++;

    if ((i + 1) % 500 === 0 || i === entries.length - 1) {
      console.log(`  Progress: ${i + 1}/${entries.length} (${updated} updated, ${skipped} skipped)`);
    }
  }

  console.log(`\nDone. Updated ${updated} posts, skipped ${skipped}`);
}

main().catch(console.error);
