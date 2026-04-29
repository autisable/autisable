import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";
import { FUNNELS } from "@/app/lib/analyticsConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const params = req.nextUrl.searchParams;
  const metric = params.get("metric") || "overview";
  const days = parseInt(params.get("days") || "30", 10);
  const pagePath = params.get("page");

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();

  switch (metric) {
    case "overview":
      return await overview(startDate, endDate);
    case "scroll_depth":
      return await scrollDepth(pagePath, startDate, endDate);
    case "rage_clicks":
      return await frictionEvents("rage_click", startDate, endDate);
    case "dead_clicks":
      return await frictionEvents("dead_click", startDate, endDate);
    case "funnel":
      return await funnel(params.get("name"), startDate, endDate);
    case "session_flow":
      return await sessionFlow(startDate, endDate);
    case "cta_rankings":
      return await ctaRankings(startDate, endDate);
    case "pages":
      return await pages(startDate, endDate);
    default:
      return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
  }
}

async function overview(start: string, end: string) {
  const { count: sessions } = await supabaseAdmin
    .from("analytics_sessions")
    .select("session_id", { count: "exact", head: true })
    .gte("started_at", start);

  const { count: pageviews } = await supabaseAdmin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("type", "pageview")
    .gte("ts", start);

  const { count: clicks } = await supabaseAdmin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("type", "click")
    .gte("ts", start);

  const { count: rageClicks } = await supabaseAdmin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("type", "rage_click")
    .gte("ts", start);

  const { count: deadClicks } = await supabaseAdmin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("type", "dead_click")
    .gte("ts", start);

  return NextResponse.json({
    sessions: sessions || 0,
    pageviews: pageviews || 0,
    clicks: clicks || 0,
    rage_clicks: rageClicks || 0,
    dead_clicks: deadClicks || 0,
    range: { start, end },
  });
}

async function scrollDepth(pagePath: string | null, start: string, end: string) {
  const { data, error } = await supabaseAdmin.rpc("get_scroll_depth", {
    p_page_path: pagePath,
    p_start_date: start,
    p_end_date: end,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

async function frictionEvents(type: "rage_click" | "dead_click", start: string, end: string) {
  // Top pages with the most rage/dead clicks
  const { data } = await supabaseAdmin
    .from("analytics_events")
    .select("page_path, metadata, ts")
    .eq("type", type)
    .gte("ts", start)
    .lte("ts", end)
    .limit(500);

  if (!data) return NextResponse.json({ data: [] });

  const counts = new Map<string, { count: number; selectors: Map<string, number> }>();
  for (const e of data) {
    if (!counts.has(e.page_path)) counts.set(e.page_path, { count: 0, selectors: new Map() });
    const entry = counts.get(e.page_path)!;
    entry.count++;
    const sel = (e.metadata as { selector?: string })?.selector || "unknown";
    entry.selectors.set(sel, (entry.selectors.get(sel) || 0) + 1);
  }

  const aggregated = Array.from(counts.entries())
    .map(([page_path, { count, selectors }]) => ({
      page_path,
      count,
      top_selectors: Array.from(selectors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([selector, n]) => ({ selector, count: n })),
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ data: aggregated });
}

async function funnel(name: string | null, start: string, end: string) {
  const def = FUNNELS.find((f) => f.name === name) || FUNNELS[0];
  if (!def) return NextResponse.json({ error: "No funnels defined" }, { status: 404 });

  const stepResults: { step: string; count: number }[] = [];
  let prevSessionIds: Set<string> | null = null;

  for (const step of def.steps) {
    const isExternal = step === "external";
    let query = supabaseAdmin
      .from("analytics_events")
      .select("session_id")
      .gte("ts", start)
      .lte("ts", end);

    if (isExternal) {
      query = query.eq("type", "click").contains("metadata", { is_cta: true });
    } else {
      query = query.eq("type", "pageview").eq("page_path", step);
    }

    const { data } = await query;
    const sids = new Set((data || []).map((d) => d.session_id));
    const filtered = prevSessionIds ? new Set([...sids].filter((s) => prevSessionIds!.has(s))) : sids;
    stepResults.push({ step, count: filtered.size });
    prevSessionIds = filtered;
  }

  return NextResponse.json({ name: def.name, steps: stepResults });
}

async function sessionFlow(start: string, end: string) {
  const { data, error } = await supabaseAdmin.rpc("get_session_flow", {
    p_start_date: start,
    p_end_date: end,
    p_limit: 30,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

async function ctaRankings(start: string, end: string) {
  const { data } = await supabaseAdmin
    .from("analytics_events")
    .select("metadata, page_path")
    .eq("type", "click")
    .contains("metadata", { is_cta: true })
    .gte("ts", start)
    .lte("ts", end)
    .limit(2000);

  if (!data) return NextResponse.json({ data: [] });

  const counts = new Map<string, { href: string; count: number; pages: Set<string> }>();
  for (const e of data) {
    const href = (e.metadata as { href?: string })?.href || "(none)";
    if (!counts.has(href)) counts.set(href, { href, count: 0, pages: new Set() });
    const entry = counts.get(href)!;
    entry.count++;
    entry.pages.add(e.page_path);
  }

  const ranked = Array.from(counts.values())
    .map((e) => ({ href: e.href, count: e.count, page_count: e.pages.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return NextResponse.json({ data: ranked });
}

async function pages(start: string, end: string) {
  const { data } = await supabaseAdmin
    .from("analytics_events")
    .select("page_path, session_id")
    .eq("type", "pageview")
    .gte("ts", start)
    .lte("ts", end)
    .limit(5000);

  if (!data) return NextResponse.json({ data: [] });

  const map = new Map<string, { views: number; sessions: Set<string> }>();
  for (const e of data) {
    if (!map.has(e.page_path)) map.set(e.page_path, { views: 0, sessions: new Set() });
    const entry = map.get(e.page_path)!;
    entry.views++;
    entry.sessions.add(e.session_id);
  }

  const ranked = Array.from(map.entries())
    .map(([page_path, { views, sessions }]) => ({
      page_path,
      pageviews: views,
      unique_sessions: sessions.size,
    }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 50);

  return NextResponse.json({ data: ranked });
}
