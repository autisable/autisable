import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";
import { isRole } from "@/app/lib/roles";

export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set(["pending_approval", "active", "suspended", "removed"]);

/**
 * PATCH /api/admin/members/[id]
 * Updates a member's role and/or status. Admin-only. Uses service role to
 * bypass user_profiles RLS, which only allows users to update their own row —
 * admin role/status changes have to go through here.
 *
 * Guardrails:
 * - Caller must be an admin (requireAdmin)
 * - Cannot demote the last admin (would lock everyone out)
 * - Cannot promote someone above their own current role would still leave the
 *   caller in control, so we don't restrict that — admins can promote to admin.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: { role?: string; status?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (body.role !== undefined) {
    if (!isRole(body.role)) {
      return NextResponse.json({ error: `Invalid role: ${body.role}` }, { status: 400 });
    }
    updates.role = body.role;
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (!updates.role && !updates.status) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // If demoting an admin, make sure another admin still exists. Without this
  // check it's possible to lock everyone out of admin tooling — there's no
  // recovery path short of going into the database directly.
  if (updates.role && updates.role !== "admin") {
    const { data: target } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", id)
      .single();
    if (target?.role === "admin") {
      const { count } = await supabaseAdmin
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last remaining admin." },
          { status: 409 }
        );
      }
    }
  }

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[admin/members PATCH] update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...updates });
}
