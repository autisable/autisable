import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = q.trim();

  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, date, image")
    .eq("is_published", true)
    .or(`title.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
    .order("date", { ascending: false })
    .limit(20);

  return NextResponse.json({ results: data || [] });
}
