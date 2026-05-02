"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface FollowerRow {
  follower_id: string;
  display_name: string;
  avatar_url: string | null;
}

export default function FollowersList({ profileUserId }: { profileUserId: string }) {
  const [followers, setFollowers] = useState<FollowerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      // Fetch follower IDs first
      const { data: follows } = await supabase
        .from("follows")
        .select("follower_id, created_at")
        .eq("following_id", profileUserId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!follows || follows.length === 0) {
        setLoading(false);
        return;
      }
      // Then fetch the profiles in one batched query
      const ids = follows.map((f) => f.follower_id);
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const ordered = follows
        .map((f) => {
          const p = profileMap.get(f.follower_id);
          return p ? { follower_id: p.id, display_name: p.display_name, avatar_url: p.avatar_url } : null;
        })
        .filter((x): x is FollowerRow => !!x);
      setFollowers(ordered);
      setLoading(false);
    })();
  }, [profileUserId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (followers.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50 rounded-2xl">
        <p className="text-zinc-500 text-sm">No followers yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {followers.map((f) => (
        <li key={f.follower_id}>
          <Link
            href={`/member/${f.follower_id}`}
            className="flex items-center gap-3 p-3 bg-white border border-zinc-100 rounded-xl hover:border-zinc-200 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden shrink-0">
              {f.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-400">
                  {f.display_name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{f.display_name}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
