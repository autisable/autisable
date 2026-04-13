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

const sql = readFileSync(SQL_FILE, "utf-8");

// Check users table: ID, user_login, user_pass, user_nicename, user_email, user_url, user_registered, user_activation_key, user_status, display_name
console.log("=== Sample users with URLs ===");
const users = parseTable(sql, "users");
let withUrl = 0;
for (const row of users.slice(0, 20)) {
  const url = cleanValue(row[5]);
  if (url) withUrl++;
  console.log(`  ${cleanValue(row[9])} | ${cleanValue(row[4])} | ${url || "(no url)"}`);
}
console.log(`\nTotal users: ${users.length}, with URL: ${users.filter(r => cleanValue(r[5])).length}`);

// Check usermeta for social links
console.log("\n=== Checking usermeta for social keys ===");
const metaRows = parseTable(sql, "usermeta");
const socialKeys = new Set<string>();
for (const row of metaRows) {
  const key = cleanValue(row[2]);
  if (key.includes("social") || key.includes("twitter") || key.includes("facebook") || 
      key.includes("instagram") || key.includes("linkedin") || key.includes("youtube") ||
      key.includes("website") || key.includes("url") || key.includes("description") ||
      key.includes("bio")) {
    socialKeys.add(key);
  }
}
console.log("Social/bio meta keys found:", [...socialKeys].sort());

// Show sample social data for first user
const user1Meta = metaRows.filter(r => r[1] === "1");
console.log("\n=== Joel Manzer (user 1) meta ===");
for (const row of user1Meta) {
  const key = cleanValue(row[2]);
  const val = cleanValue(row[3]);
  if (key.includes("social") || key.includes("twitter") || key.includes("facebook") || 
      key.includes("bio") || key.includes("description") || key.includes("url") ||
      key.includes("website") || key.includes("instagram") || key.includes("linkedin") ||
      key.includes("youtube")) {
    console.log(`  ${key} = ${val.slice(0, 100)}`);
  }
}
