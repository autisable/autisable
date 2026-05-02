"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";
import FeedActions from "@/app/components/community/FeedActions";
import FeedCompose from "@/app/components/community/FeedCompose";

const supabase = getSupabase();

interface FeedItem {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  title?: string | null;
  content: string;
  image_url?: string | null;
  type: "journal" | "post";
  // Source table — distinct from `type`. Used to scope reactions / replies.
  source: "activity" | "journal";
  created_at: string;
  reactions_count: number;
  replies_count: number;
}

type FilterTab = "all" | "updates" | "journals";
const PAGE_SIZE = 20;

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
  const [user, setUser] = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /**
   * Loads one page of feed items. Pagination strategy: fetch the next page
   * from each underlying source, merge, sort, and slice to PAGE_SIZE so the
   * user sees a stable count regardless of which sources are mixed in.
   * `before` = ISO timestamp; load items strictly older than it.
   * `tab` filters which sources to query.
   */
  const loadPage = useCallback(
    async (before: string | null, currentTab: FilterTab, currentUserId: string) => {
      if (!supabase) return { items: [] as FeedItem[], reachedEnd: true };

      const wantUpdates = currentTab === "all" || currentTab === "updates";
      const wantJournals = currentTab === "all" || currentTab === "journals";

      const fetchUpdates = async () => {
        if (!wantUpdates) return { data: [] as Array<{ id: string; user_id: string; display_name: string; content: string; image_url: string | null; type: string; created_at: string; reactions_count: number; replies_count: number }> };
        let q = supabase
          .from("activity_feed")
          .select("id, user_id, display_name, content, image_url, type, created_at, reactions_count, replies_count")
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (before) q = q.lt("created_at", before);
        return q;
      };

      const fetchJournals = async () => {
        if (!wantJournals) return { data: [] as Array<{ id: string; user_id: string; title: string | null; content: string | null; visibility: string; created_at: string }> };
        let q = supabase
          .from("journal_entries")
          .select("id, user_id, title, content, visibility, created_at")
          .neq("visibility", "private")
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (before) q = q.lt("created_at", before);
        return q;
      };

      const [activityRes, journalsRes] = await Promise.all([fetchUpdates(), fetchJournals()]);

      const activityItems: FeedItem[] = (activityRes.data || []).map((a) => ({
        id: a.id,
        user_id: a.user_id,
        display_name: a.display_name,
        content: a.content,
        image_url: a.image_url,
        type: (a.type as "post" | "journal") || "post",
        source: "activity",
        created_at: a.created_at,
        reactions_count: a.reactions_count || 0,
        replies_count: a.replies_count || 0,
      }));

      // Resolve display names + avatars for everyone shown in the feed (both
      // activity_feed posters and journal authors). One batched lookup so we
      // don't fan out per-card.
      const allUserIds = [
        ...new Set([
          ...activityItems.map((a) => a.user_id),
          ...(journalsRes.data || []).map((j) => j.user_id),
        ]),
      ];
      const { data: profiles } = allUserIds.length > 0
        ? await supabase.from("user_profiles").select("id, display_name, avatar_url").in("id", allUserIds)
        : { data: [] as { id: string; display_name: string; avatar_url: string | null }[] };
      const profileById = new Map(
        (profiles || []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }])
      );

      // Hydrate avatars onto activity items (display_name was already on the row)
      activityItems.forEach((a) => {
        a.avatar_url = profileById.get(a.user_id)?.avatar_url || null;
      });

      const journalItems: FeedItem[] = (journalsRes.data || [])
        // Followers visibility: until follow system ships, show only own entries
        .filter((j) => j.visibility === "all_members" || j.user_id === currentUserId)
        .map((j) => {
          const profile = profileById.get(j.user_id);
          return {
            id: j.id,
            user_id: j.user_id,
            display_name: profile?.display_name || "Member",
            avatar_url: profile?.avatar_url || null,
            title: j.title || null,
            content: j.content || "",
            type: "journal" as const,
            source: "journal" as const,
            created_at: j.created_at,
            reactions_count: 0,
            replies_count: 0,
          };
        });

      const merged = [...activityItems, ...journalItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, PAGE_SIZE);

      // Hydrate reaction + reply counts in one batched pair of queries.
      if (merged.length > 0) {
        const itemIds = merged.map((m) => m.id);
        const [reactionsRes, repliesRes] = await Promise.all([
          supabase
            .from("feed_reactions")
            .select("feed_item_id, feed_item_type")
            .in("feed_item_id", itemIds),
          supabase
            .from("feed_replies")
            .select("feed_item_id, feed_item_type")
            .in("feed_item_id", itemIds),
        ]);
        const tally = (rows: { feed_item_id: string; feed_item_type: string }[] | null) => {
          const map = new Map<string, number>();
          (rows || []).forEach((r) => {
            const key = `${r.feed_item_id}::${r.feed_item_type}`;
            map.set(key, (map.get(key) || 0) + 1);
          });
          return map;
        };
        const reactionTally = tally(reactionsRes.data);
        const replyTally = tally(repliesRes.data);
        merged.forEach((m) => {
          const key = `${m.id}::${m.source}`;
          m.reactions_count = reactionTally.get(key) || 0;
          m.replies_count = replyTally.get(key) || 0;
        });
      }

      // We've hit the end if either: nothing came back at all, OR the merged
      // page is short of PAGE_SIZE (sources combined yielded < PAGE_SIZE).
      // Imperfect but good enough — if both sources return less than the page
      // size, we've drained them.
      const activityCount = (activityRes.data || []).length;
      const journalCount = (journalsRes.data || []).length;
      const reachedEnd = merged.length === 0 || (activityCount < PAGE_SIZE && journalCount < PAGE_SIZE);

      return { items: merged, reachedEnd };
    },
    []
  );

  // Initial load: get the user, then the first page for the current tab.
  useEffect(() => {
    const load = async () => {
      if (!supabase) { setLoading(false); return; }
      const { data: { user: u } } = await supabase.auth.getUser();

      if (!u) {
        setLoading(false);
        return;
      }

      const { data: meProfile } = await supabase
        .from("user_profiles")
        .select("display_name, avatar_url")
        .eq("id", u.id)
        .single();
      setUser({
        id: u.id,
        display_name: meProfile?.display_name || null,
        avatar_url: meProfile?.avatar_url || null,
      });

      const { items, reachedEnd } = await loadPage(null, tab, u.id);
      setFeed(items);
      setHasMore(!reachedEnd);
      setLoading(false);
    };
    void load();
    // Re-runs when `tab` changes — wipes feed, loads fresh page for the new filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleLoadMore = async () => {
    if (!user || loadingMore || !hasMore || feed.length === 0) return;
    setLoadingMore(true);
    const oldestSeen = feed[feed.length - 1].created_at;
    const { items, reachedEnd } = await loadPage(oldestSeen, tab, user.id);
    setFeed((prev) => [...prev, ...items]);
    setHasMore(!reachedEnd);
    setLoadingMore(false);
  };

  const handlePosted = (item: FeedItem) => {
    setFeed((prev) => [item, ...prev]);
  };

  const tabBtnClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-brand-blue text-white"
        : "text-zinc-600 hover:bg-zinc-100"
    }`;

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
          {/* Compose */}
          <FeedCompose
            currentUserId={user.id}
            currentUserDisplayName={user.display_name || "Member"}
            currentUserAvatarUrl={user.avatar_url}
            onPosted={handlePosted}
          />

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto">
            <button onClick={() => setTab("all")} className={tabBtnClass(tab === "all")}>All</button>
            <button onClick={() => setTab("updates")} className={tabBtnClass(tab === "updates")}>Status updates</button>
            <button onClick={() => setTab("journals")} className={tabBtnClass(tab === "journals")}>Journals</button>
          </div>

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
              <p className="text-zinc-500">
                {tab === "all"
                  ? "No activity yet. Be the first to share!"
                  : tab === "updates"
                  ? "No status updates yet."
                  : "No journal entries shared yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {feed.map((item) => (
                  <div key={`${item.source}-${item.id}`} className="p-6 bg-white rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-3 mb-3">
                      <Link
                        href={`/member/${item.user_id}`}
                        className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold hover:opacity-80 overflow-hidden shrink-0"
                      >
                        {item.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          item.display_name?.charAt(0).toUpperCase() || "?"
                        )}
                      </Link>
                      <div>
                        <Link href={`/member/${item.user_id}`} className="text-sm font-semibold text-zinc-900 hover:text-brand-blue">
                          {item.display_name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <time>
                            {new Date(item.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                          {item.source === "journal" && (
                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-medium">
                              Journal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.title && (
                      <h3 className="text-base font-semibold text-zinc-900 mb-1.5 leading-snug">
                        {item.title}
                      </h3>
                    )}
                    <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                      {item.content?.replace(/<[^>]*>/g, "").slice(0, 500)}
                    </p>
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt=""
                        className="mt-3 max-h-96 rounded-xl border border-zinc-100"
                      />
                    )}
                    <FeedActions
                      feedItemId={item.id}
                      feedItemType={item.source}
                      initialLikeCount={item.reactions_count}
                      initialReplyCount={item.replies_count}
                      currentUserId={user?.id || null}
                      currentUserDisplayName={user?.display_name || null}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 bg-white border border-zinc-200 hover:border-zinc-400 text-sm font-medium text-zinc-700 rounded-xl disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
              {!hasMore && feed.length >= PAGE_SIZE && (
                <p className="mt-8 text-center text-xs text-zinc-400">You&apos;re all caught up.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
