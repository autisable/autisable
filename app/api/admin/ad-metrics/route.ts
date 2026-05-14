import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  ad_id: string;
  ad_type: "product" | "affiliate";
  event_type: "impression" | "click";
  created_at: string;
}

type Totals = {
  ad_id: string;
  ad_type: "product" | "affiliate";
  impressions: number;
  clicks: number;
  label: string;
};

/**
 * Aggregates ad_events for the admin metrics dashboard. Default window is
 * 30 days; the UI passes ?days=N to widen or narrow. We do the rollup in
 * application code rather than SQL so this stays portable across the
 * Supabase free-tier limits (no analytical views needed).
 */
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const days = Math.max(1, Math.min(365, Number(req.nextUrl.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await supabaseAdmin
    .from("ad_events")
    .select("ad_id, ad_type, event_type, created_at")
    .gte("created_at", since)
    .limit(100_000);

  const rows = (events || []) as Row[];

  const totalsByAd = new Map<string, Totals>();
  const dailyByType = new Map<string, { date: string; impressions: number; clicks: number }>();

  for (const row of rows) {
    const key = `${row.ad_type}:${row.ad_id}`;
    if (!totalsByAd.has(key)) {
      totalsByAd.set(key, {
        ad_id: row.ad_id,
        ad_type: row.ad_type,
        impressions: 0,
        clicks: 0,
        label: "",
      });
    }
    const t = totalsByAd.get(key)!;
    if (row.event_type === "impression") t.impressions += 1;
    else t.clicks += 1;

    const dayKey = `${row.ad_type}:${row.created_at.slice(0, 10)}`;
    if (!dailyByType.has(dayKey)) {
      dailyByType.set(dayKey, {
        date: row.created_at.slice(0, 10),
        impressions: 0,
        clicks: 0,
      });
    }
    const d = dailyByType.get(dayKey)!;
    if (row.event_type === "impression") d.impressions += 1;
    else d.clicks += 1;
  }

  // Resolve ad labels from the source tables in batched lookups.
  const productIds = [...totalsByAd.values()]
    .filter((t) => t.ad_type === "product")
    .map((t) => t.ad_id);
  const affiliateIds = [...totalsByAd.values()]
    .filter((t) => t.ad_type === "affiliate")
    .map((t) => t.ad_id);

  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, title, storefront")
      .in("id", productIds);
    for (const p of products || []) {
      const key = `product:${p.id}`;
      const row = totalsByAd.get(key);
      if (row) row.label = `${p.title} · ${p.storefront}`;
    }
  }
  if (affiliateIds.length > 0) {
    const { data: affiliates } = await supabaseAdmin
      .from("affiliates")
      .select("id, name")
      .in("id", affiliateIds);
    for (const a of affiliates || []) {
      const key = `affiliate:${a.id}`;
      const row = totalsByAd.get(key);
      if (row) row.label = a.name;
    }
  }

  const productDaily = [...dailyByType.entries()]
    .filter(([k]) => k.startsWith("product:"))
    .map(([, v]) => v)
    .sort((a, b) => a.date.localeCompare(b.date));
  const affiliateDaily = [...dailyByType.entries()]
    .filter(([k]) => k.startsWith("affiliate:"))
    .map(([, v]) => v)
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    days,
    totals: [...totalsByAd.values()].sort(
      (a, b) => b.impressions - a.impressions || b.clicks - a.clicks
    ),
    daily: {
      product: productDaily,
      affiliate: affiliateDaily,
    },
  });
}
