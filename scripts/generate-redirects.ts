/**
 * Generate 301 Redirect Map for SEO preservation
 *
 * WordPress URLs like /2024/04/21/post-slug/ need to 301 redirect
 * to the new /blog/post-slug/ format.
 *
 * This reads the SQL dump and generates a redirect config.
 *
 * RUN: npx tsx scripts/generate-redirects.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const SQL_FILE = resolve(__dirname, "../10_204_132_8.sql");
const TABLE_PREFIX = "wp_fcvr0hzgpz_";

function cleanValue(val: string): string {
  if (val === "NULL") return "";
  return val
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractInsertRows(sql: string, tableName: string): string[][] {
  const rows: string[][] = [];
  const fullTableName = `${TABLE_PREFIX}${tableName}`;
  const regex = new RegExp(`INSERT INTO \`${fullTableName}\`[^V]*VALUES\\s*`, "g");

  let match;
  while ((match = regex.exec(sql)) !== null) {
    let pos = match.index + match[0].length;
    while (pos < sql.length && sql[pos] === "(") {
      pos++;
      const values: string[] = [];
      let current = "";
      let inString = false;
      let escaped = false;
      let depth = 0;

      while (pos < sql.length) {
        const ch = sql[pos];
        if (escaped) { current += ch; escaped = false; pos++; continue; }
        if (ch === "\\") { escaped = true; current += ch; pos++; continue; }
        if (ch === "'" && !inString) { inString = true; pos++; continue; }
        if (ch === "'" && inString) {
          if (pos + 1 < sql.length && sql[pos + 1] === "'") { current += "'"; pos += 2; continue; }
          inString = false; pos++; continue;
        }
        if (inString) { current += ch; pos++; continue; }
        if (ch === "(") { depth++; current += ch; }
        else if (ch === ")") {
          if (depth > 0) { depth--; current += ch; }
          else { values.push(current.trim()); rows.push(values); pos++; break; }
        }
        else if (ch === "," && depth === 0) { values.push(current.trim()); current = ""; }
        else { current += ch; }
        pos++;
      }
      while (pos < sql.length && (sql[pos] === "," || sql[pos] === "\n" || sql[pos] === "\r" || sql[pos] === " ")) pos++;
      if (pos < sql.length && sql[pos] === ";") { pos++; break; }
    }
  }
  return rows;
}

async function main() {
  console.log("Reading SQL dump...");
  const sql = readFileSync(SQL_FILE, "utf-8");
  console.log("Parsing posts...");

  const postRows = extractInsertRows(sql, "posts");
  const publishedPosts = postRows.filter((row) => {
    const postStatus = cleanValue(row[7]);
    const postType = cleanValue(row[21]);
    return postStatus === "publish" && postType === "post";
  });

  console.log(`Found ${publishedPosts.length} published posts`);

  // Build redirect rules
  // WordPress URL format: /YYYY/MM/DD/slug/
  // New URL format: /blog/slug/
  const redirects: { source: string; destination: string; permanent: boolean }[] = [];

  for (const row of publishedPosts) {
    const slug = cleanValue(row[12]);
    const dateGmt = cleanValue(row[3]);

    if (!slug || dateGmt === "0000-00-00 00:00:00") continue;

    const date = new Date(dateGmt);
    if (isNaN(date.getTime())) continue;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // WordPress date-based permalink: /2024/04/21/slug/
    redirects.push({
      source: `/${year}/${month}/${day}/${slug}/`,
      destination: `/blog/${slug}/`,
      permanent: true,
    });

    // Also handle without trailing slash
    redirects.push({
      source: `/${year}/${month}/${day}/${slug}`,
      destination: `/blog/${slug}/`,
      permanent: true,
    });
  }

  // Add common WordPress redirects
  redirects.push(
    { source: "/feed/", destination: "/feed.xml/", permanent: true },
    { source: "/feed", destination: "/feed.xml/", permanent: true },
    { source: "/wp-content/:path*", destination: "/", permanent: false },
    { source: "/wp-admin/:path*", destination: "/admin/", permanent: false },
    { source: "/wp-login.php", destination: "/login/", permanent: true },
    { source: "/category/:slug/", destination: "/blog/?category=:slug", permanent: true },
    { source: "/tag/:slug/", destination: "/blog/", permanent: true },
    { source: "/author/:slug/", destination: "/blog/", permanent: true },
  );

  console.log(`Generated ${redirects.length} redirect rules`);

  // Write to a JSON file for next.config.ts to import
  const outputPath = resolve(__dirname, "../redirects.json");
  writeFileSync(outputPath, JSON.stringify(redirects, null, 2));
  console.log(`Written to: ${outputPath}`);

  // Also generate a next.config.ts compatible version
  // Since there could be thousands of redirects, we use a wildcard pattern instead
  console.log("\n── RECOMMENDED next.config.ts approach ──");
  console.log("For 3000+ posts, use middleware instead of static redirects.");
  console.log("The middleware.ts already handles date-based URL rewrites.");
  console.log("See the updated middleware below.\n");
}

main().catch(console.error);
