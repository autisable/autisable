import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const params = req.nextUrl.searchParams;
  const issue = params.get("issue") || "summary";

  // Counts for summary cards
  if (issue === "summary") {
    const [total, noMeta, noKw, noOg, noExcerpt, noImage, syndicatedNoCanonical] = await Promise.all([
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true).or("meta_description.is.null,meta_description.eq."),
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true).or("focus_keyword.is.null,focus_keyword.eq."),
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true).or("og_image.is.null,og_image.eq."),
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true).or("excerpt.is.null,excerpt.eq."),
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true).or("image.is.null,image.eq."),
      supabaseAdmin.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true).eq("is_syndicated", true).or("canonical_url.is.null,canonical_url.eq."),
    ]);

    // Posts that look like the formatting was stripped on import — long
    // content (≥2000 chars) with ≤1 paragraph break. Heuristic only;
    // false positives are cheap because the admin reviews each one.
    const needsReformat = await needsReformatCount();

    return NextResponse.json({
      total: total.count || 0,
      missing_meta_description: noMeta.count || 0,
      missing_focus_keyword: noKw.count || 0,
      missing_og_image: noOg.count || 0,
      missing_excerpt: noExcerpt.count || 0,
      missing_featured_image: noImage.count || 0,
      syndicated_no_canonical: syndicatedNoCanonical.count || 0,
      needs_reformat: needsReformat,
    });
  }

  // Lists for drill-down — first 100 of each issue
  const limit = 100;
  let query = supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, date, category, author_name")
    .eq("is_published", true)
    .order("date", { ascending: false })
    .limit(limit);

  switch (issue) {
    case "missing_meta_description":
      query = query.or("meta_description.is.null,meta_description.eq.");
      break;
    case "missing_focus_keyword":
      query = query.or("focus_keyword.is.null,focus_keyword.eq.");
      break;
    case "missing_og_image":
      query = query.or("og_image.is.null,og_image.eq.");
      break;
    case "missing_excerpt":
      query = query.or("excerpt.is.null,excerpt.eq.");
      break;
    case "missing_featured_image":
      query = query.or("image.is.null,image.eq.");
      break;
    case "syndicated_no_canonical":
      query = query.eq("is_syndicated", true).or("canonical_url.is.null,canonical_url.eq.");
      break;
    case "needs_reformat": {
      // Postgres doesn't expose a fast "count paragraph tags" predicate
      // without a full-content scan, so fetch a wider candidate set and
      // filter in app code. Capped at 1000 to bound the cost; the audit
      // page is for triage, not exhaustive.
      const { data: candidates } = await supabaseAdmin
        .from("blog_posts")
        .select("id, slug, title, date, category, author_name, content")
        .eq("is_published", true)
        .order("date", { ascending: false })
        .limit(1000);
      const filtered = (candidates || []).filter((p) => looksUnformatted(p.content || ""));
      return NextResponse.json({
        data: filtered.slice(0, limit).map(({ content, ...rest }) => rest),
      });
    }
    default:
      return NextResponse.json({ error: "Unknown issue" }, { status: 400 });
  }

  const { data } = await query;
  return NextResponse.json({ data: data || [] });
}

// Heuristic: a post "looks unformatted" if it has substantial content
// (≥2000 chars of body) but at most one paragraph break. WordPress imports
// commonly land in this shape — the source had paragraphs but the importer
// stripped them, leaving a single wall of text.
function looksUnformatted(content: string): boolean {
  if (content.length < 2000) return false;
  const pCount = (content.match(/<\/p>/gi) || []).length;
  return pCount <= 1;
}

async function needsReformatCount(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("content")
    .eq("is_published", true)
    .limit(2000);
  return (data || []).filter((p) => looksUnformatted(p.content || "")).length;
}
