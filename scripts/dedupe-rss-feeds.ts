/**
 * Dedupe rss_feeds back to the canonical WPeMatico campaign list.
 *
 * Why: scripts/migrate-rss-feeds.ts ran two passes when it imported feeds
 * from the WP dump. The second pass (lines 109-114 of the original) was
 * overly broad — it scanned EVERY postmeta row for URLs containing /feed,
 * /rss, .xml, or atom. That picked up comment feeds, related-posts widget
 * URLs, and other plugin junk. Result: ~200 feeds when Joel curated ~65.
 *
 * This script computes the canonical set from `campaign_feeds` postmeta
 * keys ONLY (the WPeMatico campaigns Joel actually configured), then
 * deletes every rss_feeds row whose URL isn't in that set. Any author_id
 * assignments that Joel has already made are preserved on rows that
 * survive.
 *
 * Pass --dry-run to preview without deleting.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const dryRun = process.argv.includes("--dry-run");

const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
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
    const insertIdx = sql.indexOf("INSERT INTO `" + fullName + "`", searchFrom);
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

  // Build canonical URL set from WPeMatico's `campaign_data` meta values.
  // The original migrate-rss-feeds.ts looked at `campaign_feeds`, but this
  // dump doesn't contain that key — WPeMatico stores feed URLs inside the
  // serialized `campaign_data` blob (one per campaign post, 72 in this dump).
  const metaRows = parseTable(sql, "postmeta");
  let campaignDataRows = 0;
  const canonical = new Set<string>();

  for (const row of metaRows) {
    const key = cleanValue(row[2]);
    if (key !== "campaign_data") continue;
    campaignDataRows++;
    const val = cleanValue(row[3]);
    const urlMatches = val.match(/https?:\/\/[^\s"';\\}]+/g);
    if (!urlMatches) continue;
    for (const url of urlMatches) {
      const clean = url.replace(/[\\}].*$/, "").replace(/["';]+$/, "");
      if (clean.match(/\/feed|\/rss|\.xml|\/atom|feedburner|fetchrss/i)) {
        canonical.add(clean);
      }
    }
  }

  console.log(`postmeta rows with key='campaign_data': ${campaignDataRows}`);
  console.log(`Canonical feed URLs from campaign_data: ${canonical.size}`);

  // Normalize URLs for matching (case, trailing slash, www).
  function norm(u: string): string {
    return u
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  }
  const canonicalNormalized = new Set([...canonical].map(norm));

  // Pull current rss_feeds.
  const { data: current, error } = await supabase
    .from("rss_feeds")
    .select("id, url, name, author_id");
  if (error) {
    console.error("Failed to read rss_feeds:", error.message);
    process.exit(1);
  }
  console.log(`rss_feeds rows in DB: ${current?.length ?? 0}`);

  const orphans = (current ?? []).filter((r) => !canonicalNormalized.has(norm(r.url)));
  const keepers = (current ?? []).filter((r) => canonicalNormalized.has(norm(r.url)));

  console.log(`  Keepers (in canonical set): ${keepers.length}`);
  console.log(`  Orphans (not in canonical set): ${orphans.length}`);
  const orphansWithAuthor = orphans.filter((r) => r.author_id);
  if (orphansWithAuthor.length > 0) {
    console.log(`  WARNING: ${orphansWithAuthor.length} orphan(s) have an author_id set — these will be deleted:`);
    for (const o of orphansWithAuthor) console.log(`    - ${o.name} (${o.url})`);
  }

  // Also report any canonical URLs that AREN'T in the DB (cron will re-add when polled).
  const dbNormalized = new Set((current ?? []).map((r) => norm(r.url)));
  const missing = [...canonical].filter((u) => !dbNormalized.has(norm(u)));
  if (missing.length > 0) {
    console.log(`\n  ${missing.length} canonical URL(s) are not in rss_feeds (would be re-added by next migrate or on first poll):`);
    for (const u of missing.slice(0, 5)) console.log(`    - ${u}`);
    if (missing.length > 5) console.log(`    ... ${missing.length - 5} more`);
  }

  if (dryRun) {
    console.log(`\n[dry-run] Would delete ${orphans.length} orphan(s). No changes made.`);
    return;
  }

  if (orphans.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  console.log(`\nDeleting ${orphans.length} orphan feed(s)...`);
  const ids = orphans.map((o) => o.id);
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const { error: delErr } = await supabase.from("rss_feeds").delete().in("id", slice);
    if (delErr) {
      console.error("  Batch delete failed:", delErr.message);
      continue;
    }
    deleted += slice.length;
  }
  console.log(`Deleted ${deleted} feed(s). rss_feeds now has ${(current?.length ?? 0) - deleted} row(s).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
