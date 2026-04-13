/**
 * Extract RSS feed URLs from WordPress wpematico tables and load into rss_feeds
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
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

  // WPeMatico stores feed URLs in wp_postmeta with key 'campaign_feeds' or in post_content
  // The wpematico posts are type 'wpematico' — let's find them
  console.log("Parsing posts for wpematico campaigns...");
  const postRows = parseTable(sql, "posts");
  const wpematicoPosts = postRows.filter(r => cleanValue(r[20]) === "wpematico");
  console.log("  Found", wpematicoPosts.length, "WPeMatico campaign posts");

  // Get their IDs and titles
  const campaignIds = wpematicoPosts.map(r => ({ id: r[0], title: cleanValue(r[5]) }));

  // Parse postmeta to find feed URLs for these campaigns
  console.log("Parsing postmeta for feed URLs...");
  const metaRows = parseTable(sql, "postmeta");

  const feedUrls = new Set<string>();
  const feedsByName = new Map<string, string[]>();

  for (const row of metaRows) {
    const postId = row[1];
    const key = cleanValue(row[2]);
    const val = cleanValue(row[3]);

    // WPeMatico stores feeds in serialized PHP arrays under 'campaign_feeds'
    if (key === "campaign_feeds") {
      const campaign = campaignIds.find(c => c.id === postId);
      const name = campaign?.title || "Unknown";

      // Extract URLs from serialized PHP array
      const urlMatches = val.match(/https?:\/\/[^\s"';]+/g);
      if (urlMatches) {
        const urls: string[] = [];
        for (const url of urlMatches) {
          const clean = url.replace(/[\\}].*$/, "").replace(/["';]+$/, "");
          if (clean.includes("feed") || clean.includes("rss") || clean.includes("atom") || clean.includes(".xml") || clean.includes("/feed")) {
            feedUrls.add(clean);
            urls.push(clean);
          }
        }
        if (urls.length > 0) feedsByName.set(name, urls);
      }
    }
  }

  // Also check for any other feed-like URLs in postmeta
  for (const row of metaRows) {
    const val = cleanValue(row[3]);
    if (val.startsWith("http") && (val.includes("/feed") || val.includes("/rss") || val.includes(".xml") || val.includes("atom"))) {
      if (val.length < 300) feedUrls.add(val);
    }
  }

  console.log("  Found", feedUrls.size, "unique feed URLs");
  console.log("  Campaigns:", [...feedsByName.entries()].map(([name, urls]) => `${name}: ${urls.length} feeds`));

  // Insert into rss_feeds
  console.log("Inserting into rss_feeds...");
  let inserted = 0;
  for (const url of feedUrls) {
    // Try to derive a name from the URL
    let name = "";
    try {
      const parsed = new URL(url);
      name = parsed.hostname.replace("www.", "").replace(".com", "").replace(".org", "").replace(".net", "");
    } catch {
      name = url.slice(0, 50);
    }

    const { error } = await supabase.from("rss_feeds").upsert(
      { url, name, is_active: true },
      { onConflict: "url" }
    );
    if (!error) inserted++;
  }

  console.log("  Inserted", inserted, "feeds");
  console.log("\nDone!");
}

main().catch(console.error);
