import { supabaseAdmin } from "@/app/lib/supabase";

/**
 * Auto-follow rule: Joel (or whoever AUTO_FOLLOW_OWNER_EMAIL points at)
 * should be in a mutual-follow with every approved member. Joel asked
 * for this so the community feed always has at least one shared
 * connection per member, and so DMs / notifications between him and
 * new members work out of the box.
 *
 * Lookup priority for the "owner":
 *   1. env AUTO_FOLLOW_OWNER_USER_ID — explicit UUID override
 *   2. env AUTO_FOLLOW_OWNER_EMAIL — looked up in user_profiles.email
 *   3. fallback to 'joel@autisable.com' — the production owner
 *
 * Both writes go through supabaseAdmin so they bypass the follows RLS
 * insert policy (which requires auth.uid() = follower_id). The follows
 * table's UNIQUE (follower_id, following_id) constraint makes
 * re-applying this a no-op, so it's safe to call repeatedly during
 * backfill or if a member is approved → suspended → reactivated.
 */

const DEFAULT_OWNER_EMAIL = "joel@autisable.com";

let cachedOwnerId: string | null = null;

async function resolveOwnerId(): Promise<string | null> {
  if (cachedOwnerId) return cachedOwnerId;

  const overrideId = process.env.AUTO_FOLLOW_OWNER_USER_ID?.trim();
  if (overrideId) {
    cachedOwnerId = overrideId;
    return cachedOwnerId;
  }

  if (!supabaseAdmin) return null;
  const email = process.env.AUTO_FOLLOW_OWNER_EMAIL?.trim() || DEFAULT_OWNER_EMAIL;
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (data?.id) {
    cachedOwnerId = data.id;
    return cachedOwnerId;
  }
  return null;
}

export interface AutoFollowResult {
  ownerId: string | null;
  ownerFollowedMember: boolean;
  memberFollowedOwner: boolean;
  skippedReason?: string;
}

export async function ensureOwnerFollowsMember(memberId: string): Promise<AutoFollowResult> {
  if (!supabaseAdmin) {
    return { ownerId: null, ownerFollowedMember: false, memberFollowedOwner: false, skippedReason: "no-admin-client" };
  }
  const ownerId = await resolveOwnerId();
  if (!ownerId) {
    return { ownerId: null, ownerFollowedMember: false, memberFollowedOwner: false, skippedReason: "owner-not-found" };
  }
  if (ownerId === memberId) {
    return { ownerId, ownerFollowedMember: false, memberFollowedOwner: false, skippedReason: "owner-is-member" };
  }

  // Use upsert with onConflict so the UNIQUE (follower_id, following_id)
  // constraint silently no-ops on re-run instead of erroring.
  const { error: e1 } = await supabaseAdmin
    .from("follows")
    .upsert(
      { follower_id: ownerId, following_id: memberId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true }
    );
  const { error: e2 } = await supabaseAdmin
    .from("follows")
    .upsert(
      { follower_id: memberId, following_id: ownerId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true }
    );

  if (e1) console.error("[autoFollow] owner→member insert failed", e1);
  if (e2) console.error("[autoFollow] member→owner insert failed", e2);

  return {
    ownerId,
    ownerFollowedMember: !e1,
    memberFollowedOwner: !e2,
  };
}
