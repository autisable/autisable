import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/contact-messages/[id]
 *
 * Body: { resolve: true } to mark resolved, { resolve: false } to reopen.
 * Service-role write so RLS can't silently swallow the change — the old
 * client-side update path was failing for the same reason GET was failing.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { resolve?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Need the acting admin's user id for resolved_by_user_id.
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  let actingUserId: string | null = null;
  if (accessToken) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    actingUserId = user?.id || null;
  }

  const updates =
    body.resolve === false
      ? { resolved_at: null, resolved_by_user_id: null }
      : { resolved_at: new Date().toISOString(), resolved_by_user_id: actingUserId };

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .update(updates)
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...updates });
}
