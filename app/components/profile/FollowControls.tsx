"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";
import { createNotification } from "@/app/lib/notifications";

const supabase = getSupabase();

interface Props {
  profileUserId: string;
  initialFollowerCount: number;
  initialFollowingCount: number;
}

/**
 * Sidebar element on /member/[id]:
 *  - If viewing your own profile → "Edit profile" link.
 *  - If viewing someone else → Follow / Unfollow button + counts.
 *  - If logged out → counts only.
 *
 * Optimistic update on follow/unfollow so the UI feels instant; rolls back if
 * the supabase call fails.
 */
export default function FollowControls({
  profileUserId,
  initialFollowerCount,
  initialFollowingCount,
}: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        if (user.id !== profileUserId) {
          // Need the actor's name + avatar for the follow notification, plus
          // checking the existing follow state. Single batched grab.
          const [followRes, profileRes] = await Promise.all([
            supabase
              .from("follows")
              .select("id")
              .eq("follower_id", user.id)
              .eq("following_id", profileUserId)
              .maybeSingle(),
            supabase
              .from("user_profiles")
              .select("display_name, avatar_url")
              .eq("id", user.id)
              .single(),
          ]);
          setIsFollowing(!!followRes.data);
          setCurrentUserName(profileRes.data?.display_name || null);
          setCurrentUserAvatar(profileRes.data?.avatar_url || null);
        }
      }
      setChecked(true);
    })();
  }, [profileUserId]);

  const isOwner = currentUserId === profileUserId;

  const toggleFollow = async () => {
    if (!currentUserId || busy) return;
    setBusy(true);

    if (isFollowing) {
      // Optimistic
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profileUserId);
      if (error) {
        // Roll back
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } else {
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: profileUserId });
      if (error) {
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        // Notify the followed user
        void createNotification({
          recipientUserId: profileUserId,
          type: "follow",
          title: `${currentUserName || "Someone"} started following you`,
          link: `/member/${currentUserId}`,
          actorUserId: currentUserId,
          actorDisplayName: currentUserName || undefined,
          actorAvatarUrl: currentUserAvatar,
        });
      }
    }

    setBusy(false);
  };

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5">
      <div className="grid grid-cols-2 gap-3 mb-4 text-center">
        <div>
          <div className="text-xl font-bold text-zinc-900">{followerCount}</div>
          <div className="text-xs text-zinc-500">Followers</div>
        </div>
        <div>
          <div className="text-xl font-bold text-zinc-900">{initialFollowingCount}</div>
          <div className="text-xs text-zinc-500">Following</div>
        </div>
      </div>

      {!checked ? (
        <div className="h-9 bg-zinc-100 rounded-lg animate-pulse" />
      ) : isOwner ? (
        <Link
          href="/dashboard/profile"
          className="block w-full text-center px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 text-sm font-medium rounded-lg"
        >
          Edit profile
        </Link>
      ) : currentUserId ? (
        <button
          onClick={toggleFollow}
          disabled={busy}
          className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
            isFollowing
              ? "bg-white border border-zinc-200 hover:border-brand-red hover:text-brand-red text-zinc-700"
              : "bg-brand-blue hover:bg-brand-blue-dark text-white"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      ) : (
        <Link
          href="/login"
          className="block w-full text-center px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-semibold rounded-lg"
        >
          Log in to follow
        </Link>
      )}
    </div>
  );
}
