import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const params = req.nextUrl.searchParams;
  const pagePath = params.get("page");
  const days = parseInt(params.get("days") || "30", 10);

  if (!pagePath) {
    return NextResponse.json({ error: "page param required" }, { status: 400 });
  }

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin.rpc("get_heatmap_data", {
    p_page_path: pagePath,
    p_start_date: startDate,
    p_end_date: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
