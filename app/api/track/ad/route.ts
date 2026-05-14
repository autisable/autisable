import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { isBotUserAgent } from "@/app/lib/botDetection";

export const runtime = "nodejs";

// Public endpoint — no auth. Inserts into ad_events with RLS allowing
// `anyone can insert`. We drop bot user-agents at the edge so RPM/CTR
// metrics reflect real traffic, not scanner noise.
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const ua = req.headers.get("user-agent");
  if (isBotUserAgent(ua)) {
    return NextResponse.json({ ok: true, skipped: "bot" });
  }

  let body: {
    ad_type?: string;
    event_type?: string;
    ad_id?: string;
    page_path?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ad_type, event_type, ad_id, page_path } = body;
  if (ad_type !== "product" && ad_type !== "affiliate") {
    return NextResponse.json({ error: "ad_type must be product or affiliate" }, { status: 400 });
  }
  if (event_type !== "impression" && event_type !== "click") {
    return NextResponse.json({ error: "event_type must be impression or click" }, { status: 400 });
  }
  if (!ad_id || !/^[0-9a-f-]{36}$/i.test(ad_id)) {
    return NextResponse.json({ error: "Invalid ad_id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("ad_events").insert({
    ad_type,
    event_type,
    ad_id,
    page_path: page_path?.slice(0, 500) || null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
