import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/contact-messages?tab=open|author|resolved
 *
 * Why this exists: the admin page used to read contact_messages via
 * the browser supabase client. With RLS on the table (no public
 * SELECT policy), every admin saw an empty inbox even though
 * messages were landing in Postgres — Joel reported this as
 * "emails received but nothing shows in admin." Service-role read
 * here bypasses RLS; admin authorization is enforced by
 * requireAdmin.
 *
 * Also joins user_profiles by email so the list can surface "this
 * sender is also a member" without an extra round trip.
 */
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const tab = req.nextUrl.searchParams.get("tab") || "open";

  let q = supabaseAdmin
    .from("contact_messages")
    .select("id, first_name, last_name, email, reason, message, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (tab === "open") q = q.is("resolved_at", null);
  else if (tab === "resolved") q = q.not("resolved_at", "is", null);
  else if (tab === "author") q = q.in("reason", ["author_post_removal", "author_account_removal"]);

  const { data: messages, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const emails = [...new Set((messages || []).map((m) => m.email.toLowerCase()))];
  let memberByEmail: Record<string, { id: string; display_name: string | null }> = {};
  if (emails.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("user_profiles")
      .select("id, display_name, email")
      .in("email", emails);
    if (profiles) {
      memberByEmail = Object.fromEntries(
        profiles.map((p) => [
          (p.email as string).toLowerCase(),
          { id: p.id as string, display_name: (p.display_name as string) || null },
        ])
      );
    }
  }

  return NextResponse.json({
    messages: messages || [],
    memberByEmail,
  });
}
