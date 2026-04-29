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

    return NextResponse.json({
      total: total.count || 0,
      missing_meta_description: noMeta.count || 0,
      missing_focus_keyword: noKw.count || 0,
      missing_og_image: noOg.count || 0,
      missing_excerpt: noExcerpt.count || 0,
      missing_featured_image: noImage.count || 0,
      syndicated_no_canonical: syndicatedNoCanonical.count || 0,
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
    default:
      return NextResponse.json({ error: "Unknown issue" }, { status: 400 });
  }

  const { data } = await query;
  return NextResponse.json({ data: data || [] });
}
