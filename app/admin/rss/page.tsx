"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface Feed {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  last_polled: string | null;
  author_id: string | null;
}

interface QueueItem {
  id: string;
  feed_id: string | null;
  feed_name: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  source_url: string;
  published_date: string;
  status: string;
}

interface AuthorOption {
  id: string;
  display_name: string;
}

export default function AdminRSSPage() {
  const [tab, setTab] = useState<"queue" | "feeds">("queue");
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedAuthorId, setNewFeedAuthorId] = useState("");
  const [adding, setAdding] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    loadData();
  }, []);

  const loadData = async () => {
    if (!supabase) return;
    const [feedsRes, queueRes, authorsRes] = await Promise.all([
      supabase.from("rss_feeds").select("*").order("name").limit(200),
      supabase.from("rss_queue").select("*").eq("status", "pending").order("published_date", { ascending: false }).limit(50),
      supabase.from("authors").select("id, display_name").order("display_name").limit(1000),
    ]);
    if (feedsRes.data) setFeeds(feedsRes.data);
    if (queueRes.data) setQueue(queueRes.data);
    if (authorsRes.data) setAuthors(authorsRes.data);
    setLoading(false);
  };

  const toggleFeed = async (id: string, isActive: boolean) => {
    if (!supabase) return;
    await supabase.from("rss_feeds").update({ is_active: !isActive }).eq("id", id);
    setFeeds((prev) => prev.map((f) => f.id === id ? { ...f, is_active: !isActive } : f));
  };

  const deleteFeed = async (id: string) => {
    if (!confirm("Remove this feed?")) return;
    if (!supabase) return;
    await supabase.from("rss_feeds").delete().eq("id", id);
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  };

  const addFeed = async () => {
    setFeedError(null);
    if (!newFeedUrl || !supabase) return;
    setAdding(true);
    let name = newFeedName;
    if (!name) {
      try { name = new URL(newFeedUrl).hostname.replace("www.", ""); } catch { name = "New Feed"; }
    }
    const { error } = await supabase.from("rss_feeds").insert({
      url: newFeedUrl,
      name,
      is_active: true,
      author_id: newFeedAuthorId || null,
    });
    if (error) {
      setFeedError(error.message || "Couldn't add feed (check console for details)");
      console.error("rss_feeds insert failed:", error);
    } else {
      setNewFeedUrl("");
      setNewFeedName("");
      setNewFeedAuthorId("");
      void loadData();
    }
    setAdding(false);
  };

  const updateFeedAuthor = async (feedId: string, authorId: string) => {
    if (!supabase) return;
    await supabase.from("rss_feeds").update({ author_id: authorId || null }).eq("id", feedId);
    setFeeds((prev) => prev.map((f) => f.id === feedId ? { ...f, author_id: authorId || null } : f));
  };

  const approveItem = async (item: QueueItem) => {
    if (!supabase) return;
    const feed = feeds.find((f) => f.id === item.feed_id);
    const author = feed?.author_id ? authors.find((a) => a.id === feed.author_id) : null;

    // Posts enter the editorial pipeline as Pending Review — they do NOT auto-publish.
    // Editors review/edit, then move through the pipeline to Scheduled → Published.
    const slug = item.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 100);
    // .select().single() forces the response to include the inserted row OR
    // raise a real error. Without it, supabase-js returns {data: null, error: null}
    // when RLS silently rejects the insert — which is how a previous bug let the
    // queue row flip to "approved" while no blog_post was ever created.
    const { data: created, error } = await supabase
      .from("blog_posts")
      .insert({
        title: item.title,
        slug: slug + "-" + Date.now().toString(36),
        // Prefer the full body (item.content) — the feed-extractor stores
        // <content:encoded> there. Fall back to excerpt for legacy queue rows
        // that were created when the feed only emitted <description>.
        content: item.content || item.excerpt || "",
        excerpt: item.excerpt?.slice(0, 300) || "",
        // Carry the featured image through so social previews work without
        // editor intervention. og_image stays null on purpose — the OG
        // fallback chain renders blog_posts.image at exactly 1200x630 via
        // /api/og/featured/[slug]/, sidestepping cropping issues from
        // arbitrary-aspect-ratio source images.
        image: item.image_url || null,
        category: "Bloggers",
        date: item.published_date || new Date().toISOString(),
        is_published: false,
        draft_status: "pending_review",
        is_syndicated: true,
        canonical_url: item.source_url,
        author_id: feed?.author_id || null,
        author_name: author?.display_name || item.feed_name,
      })
      .select("id")
      .single();

    if (error || !created) {
      const detail = error?.message || "no row returned (RLS may have rejected the insert)";
      alert(`Approve failed — blog post was NOT created.\n\n${detail}\n\nThe queue row was left untouched.`);
      console.error("approveItem insert failed:", { error, item });
      return;
    }

    const { error: queueErr } = await supabase
      .from("rss_queue")
      .update({ status: "approved" })
      .eq("id", item.id);
    if (queueErr) {
      alert(`Blog post was created (id ${created.id}) but the queue row could not be marked approved: ${queueErr.message}`);
      return;
    }
    setQueue((prev) => prev.filter((q) => q.id !== item.id));
  };

  const declineItem = async (id: string) => {
    if (!supabase) return;
    await supabase.from("rss_queue").update({ status: "declined" }).eq("id", id);
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">RSS Syndication</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("queue")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "queue" ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Review Queue {queue.length > 0 && `(${queue.length})`}
            </button>
            <button
              onClick={() => setTab("feeds")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "feeds" ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Manage Feeds ({feeds.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : tab === "queue" ? (
          /* Review Queue */
          <div>
            {queue.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-zinc-500 mb-2">No items in the review queue.</p>
                <p className="text-sm text-zinc-400">New items appear when the RSS cron runs (daily at 6am UTC).</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl border border-zinc-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-zinc-400">{item.feed_name}</span>
                          <span className="text-xs text-zinc-300">
                            {item.published_date && new Date(item.published_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-zinc-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-zinc-500 line-clamp-2">{item.excerpt}</p>
                        <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue hover:underline mt-1 inline-block">
                          View original &rarr;
                        </a>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => approveItem(item)}
                          className="px-3 py-1.5 bg-brand-green text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors"
                          title="Creates a blog post in Pending Review status (does not auto-publish)"
                        >
                          Approve &rarr; Pending Review
                        </button>
                        <button
                          onClick={() => declineItem(item.id)}
                          className="px-3 py-1.5 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Manage Feeds */
          <div>
            {/* Add feed */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-6">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Add New Feed</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  placeholder="Feed name (optional)"
                  className="sm:w-48 px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                />
                <input
                  type="url"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  placeholder="https://example.com/feed/"
                  className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                />
                <select
                  value={newFeedAuthorId}
                  onChange={(e) => setNewFeedAuthorId(e.target.value)}
                  className="sm:w-56 px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                  title="Author this feed will be attributed to. Their bio, avatar, and socials show on each approved post."
                >
                  <option value="">Author (optional)</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>{a.display_name}</option>
                  ))}
                </select>
                <button
                  onClick={addFeed}
                  disabled={!newFeedUrl || adding}
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {adding ? "Adding..." : "Add Feed"}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Items pulled from this feed will be attributed to the selected author and enter the
                editorial pipeline as <strong>Pending Review</strong> (not auto-published).
              </p>
              {feedError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-brand-red">
                  <strong>Couldn&apos;t add feed:</strong> {feedError}
                </div>
              )}
            </div>

            {/* Feed list */}
            <div className="space-y-2">
              {feeds.map((feed) => (
                <div key={feed.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${feed.is_active ? "bg-brand-green" : "bg-zinc-300"}`} />
                      <p className="text-sm font-medium text-zinc-900 truncate">{feed.name}</p>
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{feed.url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={feed.author_id || ""}
                      onChange={(e) => updateFeedAuthor(feed.id, e.target.value)}
                      className="text-xs px-2 py-1 border border-zinc-200 rounded-lg max-w-[10rem]"
                      title="Author for posts approved from this feed"
                    >
                      <option value="">— No author —</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>{a.display_name}</option>
                      ))}
                    </select>
                    {feed.last_polled && (
                      <span className="text-xs text-zinc-400">
                        Last: {new Date(feed.last_polled).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <button
                      onClick={() => toggleFeed(feed.id, feed.is_active)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        feed.is_active
                          ? "text-brand-orange hover:bg-brand-orange-light"
                          : "text-brand-green hover:bg-brand-green-light"
                      }`}
                    >
                      {feed.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => deleteFeed(feed.id)}
                      className="px-3 py-1 text-xs font-medium text-brand-red hover:bg-brand-red-light rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
