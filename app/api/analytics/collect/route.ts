import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 50 * 1024;
const MAX_EVENTS = 100;

interface CollectBody {
  session: {
    session_id: string;
    entry_page?: string;
    referrer?: string;
    user_agent?: string;
    viewport_w?: number;
    viewport_h?: number;
    device_type?: string;
    page_count?: number;
  };
  events: {
    type: string;
    page_path: string;
    ts: number;
    metadata?: Record<string, unknown>;
  }[];
}

export async function POST(req: NextRequest) {
  // Body size guard
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Body too large" }, { status: 413 });
  }

  let body: CollectBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.session?.session_id || !Array.isArray(body.events)) {
    return NextResponse.json({ error: "Missing session or events" }, { status: 400 });
  }

  if (body.events.length > MAX_EVENTS) {
    body.events = body.events.slice(0, MAX_EVENTS);
  }

  const sid = body.session.session_id;
  if (sid.length > 100) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  // Upsert session — sets started_at on first insert, updates last_seen_at + page_count after
  await supabaseAdmin.from("analytics_sessions").upsert(
    {
      session_id: sid,
      last_seen_at: new Date().toISOString(),
      entry_page: body.session.entry_page?.slice(0, 500) || null,
      referrer: body.session.referrer?.slice(0, 500) || null,
      user_agent: body.session.user_agent?.slice(0, 500) || null,
      viewport_w: body.session.viewport_w || null,
      viewport_h: body.session.viewport_h || null,
      device_type: body.session.device_type?.slice(0, 20) || null,
      page_count: body.session.page_count || 1,
    },
    { onConflict: "session_id", ignoreDuplicates: false }
  );

  // Insert events in batch
  if (body.events.length > 0) {
    const rows = body.events.map((e) => ({
      session_id: sid,
      type: (e.type || "").slice(0, 30),
      page_path: (e.page_path || "/").slice(0, 500),
      ts: e.ts ? new Date(e.ts).toISOString() : new Date().toISOString(),
      metadata: e.metadata || {},
    }));

    await supabaseAdmin.from("analytics_events").insert(rows);
  }

  return NextResponse.json({ ok: true });
}
