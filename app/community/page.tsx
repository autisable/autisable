"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface FeedItem {
  id: string;
  user_id: string;
  display_name: string;
  content: string;
  type: "journal" | "post";
  created_at: string;
  reactions_count: number;
  replies_count: number;
}

// Preview feed items for logged-out users
const previewFeed = [
  {
    name: "Sarah M.",
    time: "2 hours ago",
    content: "Today was a good day. My son tried a new food at dinner — voluntarily. It's been 3 years of the same 5 foods. I know it sounds small but I cried.",
    reactions: 24,
    replies: 8,
    type: "Journal",
  },
  {
    name: "David R.",
    time: "5 hours ago",
    content: "Just finished our first IEP meeting of the year. The new teacher actually listened. Actually asked questions. It shouldn't feel rare but it does.",
    reactions: 31,
    replies: 12,
    type: "Post",
  },
  {
    name: "Michelle K.",
    time: "Yesterday",
    content: "Does anyone else struggle with the transition from school year to summer? We're 3 days in and the routine change has been really hard on everyone.",
    reactions: 47,
    replies: 19,
    type: "Post",
  },
];

export default function CommunityPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!supabase) { setLoading(false); return; }
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) setUser({ id: u.id });

      if (u) {
        // Pull from BOTH sources and merge:
        //  - activity_feed (status updates, future post types)
        //  - journal_entries directly (anything not private + member can always
        //    see their own non-private entries)
        // Followers visibility: until the follow system ships, only the author
        // sees their own followers-only entries; everyone sees all_members.
        const [activityRes, journalsRes] = await Promise.all([
          supabase
            .from("activity_feed")
            .select("id, user_id, display_name, content, type, created_at, reactions_count, replies_count")
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("journal_entries")
            .select("id, user_id, title, content, visibility, created_at")
            .neq("visibility", "private")
            .order("created_at", { ascending: false })
            .limit(30),
        ]);

        const activityItems: FeedItem[] = (activityRes.data || []).map((a) => ({
          id: a.id,
          user_id: a.user_id,
          display_name: a.display_name,
          content: a.content,
          type: a.type as "journal" | "post",
          created_at: a.created_at,
          reactions_count: a.reactions_count || 0,
          replies_count: a.replies_count || 0,
        }));

        // Resolve display names for journal authors (single batched lookup).
        const journalUserIds = [...new Set((journalsRes.data || []).map((j) => j.user_id))];
        const { data: profiles } = journalUserIds.length > 0
          ? await supabase.from("user_profiles").select("id, display_name").in("id", journalUserIds)
          : { data: [] as { id: string; display_name: string }[] };
        const nameById = new Map((profiles || []).map((p) => [p.id, p.display_name]));

        const journalItems: FeedItem[] = (journalsRes.data || [])
          // followers visibility: until follow system ships, show only own entries
          .filter((j) => j.visibility === "all_members" || j.user_id === u.id)
          .map((j) => ({
            id: j.id,
            user_id: j.user_id,
            display_name: nameById.get(j.user_id) || "Member",
            content: j.title ? `<strong>${j.title}</strong><br/>${j.content || ""}` : (j.content || ""),
            type: "journal",
            created_at: j.created_at,
            reactions_count: 0,
            replies_count: 0,
          }));

        const merged = [...activityItems, ...journalItems].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setFeed(merged);
      }
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Community</h1>
        <p className="mt-1 text-zinc-500">A community built around real conversation.</p>
      </div>

      {!user && (
        <>
          {/* Logged-out preview state */}
          <div className="mb-6 p-6 bg-gradient-to-br from-brand-blue-light to-white rounded-2xl border border-brand-blue/10 text-center">
            <h2 className="text-xl font-bold text-zinc-900 mb-2">This is what community looks like</h2>
            <p className="text-zinc-600 text-sm mb-1">
              Real conversations. Real support. Here&apos;s a preview of what members are sharing.
            </p>
          </div>

          {/* Preview feed cards */}
          <div className="space-y-4 mb-8 relative">
            {previewFeed.map((item, i) => (
              <div
                key={i}
                className={`p-6 bg-white rounded-2xl border border-zinc-100 ${i === 2 ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-zinc-900">{item.name}</span>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{item.time}</span>
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-medium">
                        {item.type}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed">{item.content}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                    {item.reactions}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                    </svg>
                    {item.replies}
                  </span>
                </div>
              </div>
            ))}

            {/* Fade overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>

          <div className="text-center py-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-blue/25"
            >
              Join the Community
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <p className="mt-3 text-sm text-zinc-500">Free to join. Always will be.</p>
          </div>
        </>
      )}

      {user && (
        <>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-6 bg-white rounded-2xl border border-zinc-100 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full" />
                    <div className="h-4 bg-zinc-100 rounded w-24" />
                  </div>
                  <div className="h-4 bg-zinc-100 rounded w-full mb-2" />
                  <div className="h-4 bg-zinc-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-500">No activity yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((item) => (
                <div key={item.id} className="p-6 bg-white rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold">
                      {item.display_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-zinc-900">{item.display_name}</span>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <time>
                          {new Date(item.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                        {item.type === "journal" && (
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-medium">
                            Journal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                    {item.content?.replace(/<[^>]*>/g, "").slice(0, 500)}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                    <button className="inline-flex items-center gap-1 hover:text-brand-blue transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                      </svg>
                      {item.reactions_count || 0}
                    </button>
                    <button className="inline-flex items-center gap-1 hover:text-brand-blue transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                      </svg>
                      {item.replies_count || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
