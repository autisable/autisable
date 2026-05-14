#!/usr/bin/env -S npx tsx
/*
 * One-time seed for the products table from Joel's "Autisable Shop Products"
 * spreadsheet. Reads the local .xlsx (gitignored) and inserts each row.
 *
 *   Sheet 1: "Bookshop.org affiliate links" — full data (title, URL, image,
 *            description, category, tags, price).
 *   Sheet 2: "Special-Learning affiliate URL" — name + URL only.
 *   Sheet 3: "Amazon Topic Structure" — not products yet; skipped.
 *
 * Defaults to dry-run. Pass `--apply` to actually write to Supabase. The
 * `--clear` flag wipes existing rows for the targeted storefronts first so
 * re-running gives a clean reseed instead of duplicating titles.
 *
 *   npx tsx scripts/seed-products.ts                  # dry-run summary
 *   npx tsx scripts/seed-products.ts --apply          # insert (additive)
 *   npx tsx scripts/seed-products.ts --apply --clear  # wipe + reseed
 */
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

// Minimal .env.local loader so this script doesn't require dotenv as a dep.
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const [, key, raw] = m;
    if (key in process.env) continue;
    const value = raw.replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const XLSX_PATH = path.resolve("Autisable Shop Products.xlsx");
if (!fs.existsSync(XLSX_PATH)) {
  console.error(`Spreadsheet not found at ${XLSX_PATH}`);
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const clear = process.argv.includes("--clear");

type ProductRow = {
  storefront: "bookshop" | "special_learning";
  title: string;
  click_url: string;
  image_url: string | null;
  price_label: string | null;
  category_filter: string[] | null;
  tag_filter: string[] | null;
};

const wb = XLSX.readFile(XLSX_PATH);
const bookshopSheet = wb.Sheets[wb.SheetNames[0]];
const specialSheet = wb.Sheets[wb.SheetNames[1]];

// Bookshop: header row at index 0; data starts at row 1. Columns: SKU,
// Name, Product URL, Product Description, Category, Tags, Image URL,
// Regular price ($), Button text.
const bookshopRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(bookshopSheet, {
  defval: "",
});

// Special-Learning: header row at index 1 (row 0 is alphabetic column
// placeholders); pull rows directly as arrays so we can ignore the
// weird header.
const specialRaw = XLSX.utils.sheet_to_json<unknown[]>(specialSheet, {
  header: 1,
  defval: "",
});

const products: ProductRow[] = [];

for (const row of bookshopRaw) {
  const title = String(row["Name"] || "").trim();
  const url = String(row["Product URL"] || "").trim();
  if (!title || !url) continue;
  const image = String(row["Image URL"] || "").trim() || null;
  const priceNum = Number(row["Regular price ($)"]);
  const price = Number.isFinite(priceNum) && priceNum > 0 ? `$${priceNum.toFixed(2)}` : null;
  const category = String(row["Category"] || "").trim();
  const tags = String(row["Tags"] || "").trim();
  products.push({
    storefront: "bookshop",
    title,
    click_url: url,
    image_url: image,
    price_label: price,
    category_filter: category ? [category] : null,
    tag_filter: tags
      ? tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
      : null,
  });
}

// Special-Learning rows: row 1 is labels ("Name", "URL"); data starts at
// row 2. Only the first two columns are populated.
for (let i = 2; i < specialRaw.length; i++) {
  const row = specialRaw[i] || [];
  const title = String(row[0] || "").trim();
  const url = String(row[1] || "").trim();
  if (!title || !url) continue;
  products.push({
    storefront: "special_learning",
    title,
    click_url: url,
    image_url: null,
    price_label: null,
    category_filter: null,
    tag_filter: null,
  });
}

const summary = products.reduce(
  (acc, p) => {
    acc[p.storefront] = (acc[p.storefront] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

console.log("--- Parsed ---");
for (const [storefront, count] of Object.entries(summary)) {
  console.log(`  ${storefront}: ${count}`);
}
console.log(`  total: ${products.length}`);
console.log();
console.log("Sample row (Bookshop):", products.find((p) => p.storefront === "bookshop"));
console.log(
  "Sample row (Special-Learning):",
  products.find((p) => p.storefront === "special_learning")
);

if (!apply) {
  console.log();
  console.log("Dry-run only. Re-run with --apply to insert.");
  console.log("Add --clear to wipe existing rows for these storefronts first.");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  if (clear) {
    const storefronts = [...new Set(products.map((p) => p.storefront))];
    console.log(`\nClearing existing rows for: ${storefronts.join(", ")}`);
    const { error } = await supabase.from("products").delete().in("storefront", storefronts);
    if (error) {
      console.error("Clear failed:", error.message);
      process.exit(1);
    }
  }

  // Chunked inserts — Supabase REST has a 1MB payload limit and a row
  // count cap; 200 per chunk leaves headroom for the longer Bookshop
  // descriptions if we ever add them to the schema.
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < products.length; i += CHUNK) {
    const batch = products.slice(i, i + CHUNK);
    const { error } = await supabase.from("products").insert(batch);
    if (error) {
      console.error(`Insert failed at offset ${i}:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`  inserted ${inserted}/${products.length}\r`);
  }
  console.log(`\nDone. Inserted ${inserted} products.`);
})();
