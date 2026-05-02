import { getSupabase } from "./supabase-browser";

export type NotificationType =
  | "reply"
  | "like"
  | "follow"
  | "editorial_approved"
  | "editorial_rejected"
  | "editorial_published";

interface CreateNotificationInput {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  actorUserId?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string | null;
}

/**
 * Fire-and-forget notification creator. Never throws — notifications are
 * non-critical infrastructure, so a failure here should not break the
 * underlying social action that triggered it.
 *
 * Self-notifications (someone liking their own post) are dropped here so
 * callers don't have to remember to check.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (!input.recipientUserId) return;
  if (input.actorUserId && input.actorUserId === input.recipientUserId) return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from("notifications").insert({
      user_id: input.recipientUserId,
      type: input.type,
      title: input.title,
      message: input.message || null,
      link: input.link || null,
      actor_user_id: input.actorUserId || null,
      actor_display_name: input.actorDisplayName || null,
      actor_avatar_url: input.actorAvatarUrl || null,
    });
  } catch (e) {
    // Swallow — this is fire-and-forget. Logging once for diagnostics.
    console.warn("[notifications] insert failed:", e);
  }
}
