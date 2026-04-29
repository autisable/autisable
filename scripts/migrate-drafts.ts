/**
 * Migrate unpublished posts (draft, pending, in-progress, ready-for-scheduling)
 * as drafts in Supabase. These will appear in admin under "Drafts" filter.
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

function estimateReadTime(content: string): string {
  const text = content.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 250))} min read`;
}

function makeExcerpt(content: string, maxLen = 300): string {
  const text = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return text.length <= maxLen ? text : text.slice(0, maxLen).replace(/\s\S*$/, "") + "...";
}

function extractFirstImage(content: string): string | null {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
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

// Map WP statuses → draft_status field
const STATUS_MAP: Record<string, string> = {
  "draft": "draft",
  "pending": "pending_review",
  "in-progress": "in_progress",
  "ready-for-scheduling": "ready_for_scheduling",
};

function _useStatusMap() { return STATUS_MAP; }

async function main() {
  console.log("Reading SQL dump...");
  const sql = readFileSync(SQL_FILE, "utf-8");

  // Need authors map (paginated — Supabase default limit is 1,000)
  const allAuthors: { id: string; display_name: string }[] = [];
  let authorsFrom = 0;
  while (true) {
    const { data } = await supabase.from("authors").select("id, display_name").range(authorsFrom, authorsFrom + 999);
    if (!data || data.length === 0) break;
    allAuthors.push(...data);
    if (data.length < 1000) break;
    authorsFrom += 1000;
  }
  const nameToAuthorId = new Map<string, string>();
  allAuthors.forEach((a) => nameToAuthorId.set(a.display_name, a.id));
  console.log(`  Loaded ${allAuthors.length} authors`);

  console.log("Parsing users...");
  const users = parseTable(sql, "users");
  const userIdToName = new Map<string, string>();
  users.forEach((row) => userIdToName.set(row[0], cleanValue(row[9])));

  console.log("Parsing posts...");
  const postRows = parseTable(sql, "posts");

  // Filter: not published, type=post, has slug
  const draftStatuses = Object.keys(STATUS_MAP);
  const drafts = postRows.filter((row) => {
    const postStatus = cleanValue(row[7]);
    const postType = cleanValue(row[20]);
    return draftStatuses.includes(postStatus) && postType === "post";
  });

  console.log(`  Found ${drafts.length} unpublished posts to migrate`);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  drafts.forEach((r) => {
    const s = cleanValue(r[7]);
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  console.log("  Breakdown:", statusCounts);

  // Parse term_taxonomy and term_relationships for categories
  const termsRows = parseTable(sql, "terms");
  const termsMap = new Map<string, string>();
  termsRows.forEach((r) => termsMap.set(r[0], cleanValue(r[1])));

  const taxonomyRows = parseTable(sql, "term_taxonomy");
  const categoryTaxIds = new Map<string, string>();
  taxonomyRows.forEach((r) => {
    if (cleanValue(r[2]) === "category") categoryTaxIds.set(r[0], r[1]);
  });

  const relRows = parseTable(sql, "term_relationships");
  const postCategories = new Map<string, string>();
  for (const row of relRows) {
    const objectId = row[0];
    const termTaxId = row[1];
    if (categoryTaxIds.has(termTaxId)) {
      const termId = categoryTaxIds.get(termTaxId)!;
      const categoryName = termsMap.get(termId);
      if (categoryName && categoryName !== "Uncategorized") {
        postCategories.set(objectId, categoryName);
      }
    }
  }

  // Insert drafts
  console.log("Inserting drafts...");
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < drafts.length; i++) {
    const row = drafts[i];
    const wpId = row[0];
    const authorId = row[1];
    const content = cleanValue(row[4]);
    const title = cleanValue(row[5]);
    const excerpt = cleanValue(row[6]);
    const wpStatus = cleanValue(row[7]);
    const slug = cleanValue(row[11]);
    const postDate = cleanValue(row[3]);
    const postModified = cleanValue(row[15]);

    if (!title.trim()) { skipped++; continue; }

    const authorName = userIdToName.get(authorId);
    const authorIdSb = authorName ? nameToAuthorId.get(authorName) : null;
    const category = postCategories.get(wpId) || "Uncategorized";
    const image = extractFirstImage(content);

    const finalSlug = slug && slug.length > 0 ? slug : `draft-${wpId}`;

    const draftStatus = STATUS_MAP[wpStatus] || "draft";

    const { error } = await supabase.from("blog_posts").upsert({
      slug: finalSlug,
      title,
      content,
      excerpt: excerpt || makeExcerpt(content),
      image,
      category,
      date: postDate && postDate !== "0000-00-00 00:00:00" ? postDate : new Date().toISOString(),
      date_modified: postModified && postModified !== "0000-00-00 00:00:00" ? postModified : null,
      read_time: estimateReadTime(content),
      author_name: authorName || null,
      author_id: authorIdSb || null, // null when author not found — avoids FK violation
      is_published: false,
      is_syndicated: false,
      draft_status: draftStatus,
    }, { onConflict: "slug" });

    if (error) {
      errors++;
      if (errors <= 5) console.error(`  Error: ${error.message}`);
    } else {
      inserted++;
    }

    if ((i + 1) % 100 === 0 || i === drafts.length - 1) {
      console.log(`  Progress: ${i + 1}/${drafts.length} (${inserted} inserted, ${errors} errors)`);
    }
  }

  console.log(`\nDone. Inserted ${inserted} drafts, ${errors} errors, ${skipped} skipped`);
}

main().catch(console.error);
