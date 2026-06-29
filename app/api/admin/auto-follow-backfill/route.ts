import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";
import { ensureOwnerFollowsMember } from "@/app/lib/autoFollow";

export const runtime = "nodejs";

/**
 * One-shot backfill for the auto-follow rule. Walks every active
 * member and ensures the owner (Joel by default) is in a mutual
 * follow with them. Idempotent — re-running just no-ops on the
 * UNIQUE (follower_id, following_id) constraint.
 *
 * POST /api/admin/auto-follow-backfill — admin only.
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data: members, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("status", "active");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  let ownerSelfSkipped = 0;
  let failures = 0;
  let ownerId: string | null = null;

  for (const m of members || []) {
    const res = await ensureOwnerFollowsMember(m.id);
    ownerId = res.ownerId;
    if (res.skippedReason === "owner-is-member") {
      ownerSelfSkipped++;
      continue;
    }
    if (res.skippedReason === "owner-not-found") {
      return NextResponse.json(
        { error: "Owner user not found — set AUTO_FOLLOW_OWNER_USER_ID or AUTO_FOLLOW_OWNER_EMAIL." },
        { status: 500 }
      );
    }
    if (!res.ownerFollowedMember || !res.memberFollowedOwner) {
      failures++;
    }
    processed++;
  }

  return NextResponse.json({
    ok: true,
    ownerId,
    totalMembers: members?.length || 0,
    processed,
    ownerSelfSkipped,
    failures,
  });
}
