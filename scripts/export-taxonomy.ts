#!/usr/bin/env -S npx tsx
/*
 * Exports the blog taxonomy — every distinct category and every distinct
 * tag actually in use on published posts, with usage counts — to an
 * Excel workbook Joel can hand-match against the product catalog.
 *
 * Output: autisable-taxonomy-<YYYY-MM-DD>.xlsx in the project root.
 * Two sheets: "Categories" and "Tags". Each is sorted by usage count
 * (most-used first) so the long tail sits at the bottom.
 *
 *   npx tsx scripts/export-taxonomy.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const [, key, raw] = m;
    if (key in process.env) continue;
    process.env[key] = raw.replace(/^['"]|['"]$/g, "");
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  // Pull every published post's category + tags. Supabase caps a single
  // response at ~1000 rows by default, so page through with .range()
  // until we drain the table — the post inventory is on the order of
  // 4,000+ and we don't want partial counts.
  const PAGE = 1000;
  const all: Array<{ category: string | null; tags: string[] | null }> = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("category, tags")
      .eq("is_published", true)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Query failed:", error.message);
      process.exit(1);
    }
    const rows = (data || []) as Array<{ category: string | null; tags: string[] | null }>;
    all.push(...rows);
    if (rows.length < PAGE) break;
  }

  const categoryCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const row of all) {
    if (row.category && row.category.trim()) {
      const cat = row.category.trim();
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
    if (Array.isArray(row.tags)) {
      for (const raw of row.tags) {
        if (!raw || typeof raw !== "string") continue;
        const t = raw.trim();
        if (!t) continue;
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }
  }

  const categoryRows = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ Category: name, "Posts using this": count }));

  const tagRows = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ Tag: name, "Posts using this": count }));

  const wb = XLSX.utils.book_new();
  const categorySheet = XLSX.utils.json_to_sheet(categoryRows);
  XLSX.utils.book_append_sheet(wb, categorySheet, "Categories");
  const tagSheet = XLSX.utils.json_to_sheet(tagRows);
  XLSX.utils.book_append_sheet(wb, tagSheet, "Tags");

  const today = new Date().toISOString().slice(0, 10);
  const outPath = path.resolve(`autisable-taxonomy-${today}.xlsx`);
  XLSX.writeFile(wb, outPath);

  console.log(`--- Taxonomy export ---`);
  console.log(`  Published posts scanned: ${all.length}`);
  console.log(`  Distinct categories: ${categoryRows.length}`);
  console.log(`  Distinct tags: ${tagRows.length}`);
  console.log(`  Wrote: ${outPath}`);
})();
