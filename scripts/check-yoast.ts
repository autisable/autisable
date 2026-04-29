import { readFileSync } from "fs";
import { resolve } from "path";

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

const sql = readFileSync(SQL_FILE, "utf-8");

console.log("Scanning postmeta for SEO-related keys...");
const metaRows = parseTable(sql, "postmeta");

const seoKeys = new Map<string, number>();
for (const row of metaRows) {
  const key = cleanValue(row[2]);
  if (key.includes("yoast") || key.includes("rankmath") || key.includes("aioseo") || key.includes("seo") || key.includes("metadesc") || key.includes("opengraph")) {
    seoKeys.set(key, (seoKeys.get(key) || 0) + 1);
  }
}

console.log("\nSEO meta keys found:");
[...seoKeys.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${k}: ${n} entries`));

// Sample yoast title for one post
console.log("\nSample Yoast metadata for first few posts:");
const yoastTitles = metaRows.filter(r => cleanValue(r[2]) === "_yoast_wpseo_title").slice(0, 5);
const yoastDescs = metaRows.filter(r => cleanValue(r[2]) === "_yoast_wpseo_metadesc").slice(0, 5);
yoastTitles.forEach(r => console.log(`  Post ${r[1]} title: ${cleanValue(r[3]).slice(0, 80)}`));
console.log();
yoastDescs.forEach(r => console.log(`  Post ${r[1]} desc:  ${cleanValue(r[3]).slice(0, 80)}`));
