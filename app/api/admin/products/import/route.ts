import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Storefront = "bookshop" | "special_learning" | "amazon";

interface ParsedRow {
  storefront: Storefront;
  title: string;
  click_url: string;
  image_url: string | null;
  price_label: string | null;
  category_filter: string[] | null;
  tag_filter: string[] | null;
}

/**
 * Bulk product importer. Accepts a CSV with the column shape from Joel's
 * "Autisable Shop Products" spreadsheet so editors can re-export the
 * sheet → upload → reseed without touching the database directly.
 *
 * Expected columns (case-insensitive, any order; only Name + Product URL
 * are strictly required):
 *
 *   - Storefront           (bookshop | special_learning | amazon — defaults
 *                           to a value picked by `?storefront=` query param
 *                           when omitted on the row)
 *   - Name                 (required) → products.title
 *   - Product URL          (required) → products.click_url
 *   - Image URL            → products.image_url
 *   - Regular price ($)    → products.price_label (formatted as $X.XX)
 *   - Category             → products.category_filter[]
 *   - Tags                 → products.tag_filter[] (split on comma/semicolon)
 *
 * Query params:
 *   - storefront: default storefront for rows missing the Storefront column
 *   - clear:      "true" to wipe existing rows for the imported storefronts
 *                 before insert (annual/quarterly reseed pattern)
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const defaultStorefrontRaw = req.nextUrl.searchParams.get("storefront") || "";
  const defaultStorefront = isStorefront(defaultStorefrontRaw) ? defaultStorefrontRaw : null;
  const clear = req.nextUrl.searchParams.get("clear") === "true";

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { error: `CSV parse error: ${parsed.errors[0].message}` },
      { status: 400 }
    );
  }

  const rows: ParsedRow[] = [];
  const skipped: Array<{ rowNum: number; reason: string }> = [];

  parsed.data.forEach((raw, idx) => {
    // 1-based, +1 for the header row, so it matches what an editor sees
    // in their spreadsheet app.
    const rowNum = idx + 2;
    const pick = (...names: string[]): string => {
      for (const name of names) {
        const key = Object.keys(raw).find((k) => k.toLowerCase() === name.toLowerCase());
        if (key && raw[key]) return String(raw[key]).trim();
      }
      return "";
    };

    const title = pick("Name", "Title", "Product Name");
    const url = pick("Product URL", "URL", "Click URL", "Link");
    if (!title || !url) {
      skipped.push({ rowNum, reason: "missing Name or Product URL" });
      return;
    }

    const storefrontRaw = pick("Storefront").toLowerCase().replace(/[\s-]+/g, "_");
    const storefront = isStorefront(storefrontRaw)
      ? (storefrontRaw as Storefront)
      : defaultStorefront;
    if (!storefront) {
      skipped.push({
        rowNum,
        reason: "no Storefront column and no ?storefront= default provided",
      });
      return;
    }

    const image = pick("Image URL", "Image") || null;
    const priceNum = Number(pick("Regular price ($)", "Price", "Regular Price"));
    const price = Number.isFinite(priceNum) && priceNum > 0 ? `$${priceNum.toFixed(2)}` : null;
    const category = pick("Category");
    const tags = pick("Tags");

    rows.push({
      storefront,
      title,
      click_url: url,
      image_url: image,
      price_label: price,
      category_filter: category ? [category] : null,
      tag_filter: tags ? tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : null,
    });
  });

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows to import", skipped },
      { status: 400 }
    );
  }

  if (clear) {
    const storefronts = [...new Set(rows.map((r) => r.storefront))];
    const { error: deleteErr } = await supabaseAdmin
      .from("products")
      .delete()
      .in("storefront", storefronts);
    if (deleteErr) {
      return NextResponse.json(
        { error: `Clear failed: ${deleteErr.message}` },
        { status: 500 }
      );
    }
  }

  // Chunked insert — same 200-row chunk size as the seed script.
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const { error } = await supabaseAdmin.from("products").insert(batch);
    if (error) {
      return NextResponse.json(
        {
          error: `Insert failed after ${inserted} rows: ${error.message}`,
          inserted,
          skipped,
        },
        { status: 500 }
      );
    }
    inserted += batch.length;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    cleared: clear,
    skipped,
    skippedCount: skipped.length,
  });
}

function isStorefront(v: string): v is Storefront {
  return v === "bookshop" || v === "special_learning" || v === "amazon";
}
