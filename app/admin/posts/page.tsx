"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  is_published: boolean;
  is_syndicated: boolean;
  canonical_url: string | null;
  date: string;
  author_name: string | null;
  draft_status: string | null;
}

const POSTS_PER_PAGE = 30;

type FilterKey = "all" | "published" | "drafts" | "scheduled" | "pending" | "in_progress" | "rejected" | "syndicated" | "trash";

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  // Per-bucket totals so each filter button can show its size at a glance.
  // Refreshed on mount and after any state-mutating action (publish toggle,
  // trash, restore, perma-delete) so the numbers don't drift from reality.
  const [counts, setCounts] = useState<Record<FilterKey, number | null>>({
    all: null, published: null, drafts: null, scheduled: null, pending: null,
    in_progress: null, rejected: null, syndicated: null, trash: null,
  });
  const [sortColumn, setSortColumn] = useState<"date" | "title" | "author_name" | "category">("date");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) setSortAsc(!sortAsc);
    else { setSortColumn(col); setSortAsc(col !== "date"); /* date defaults desc, others asc */ }
  };

  const loadPosts = useCallback(async (pageNum: number) => {
    if (!supabase) return;
    setLoading(true);

    let query = supabase
      .from("blog_posts")
      .select("id, title, slug, category, is_published, is_syndicated, canonical_url, date, author_name, draft_status", { count: "exact" })
      .order(sortColumn, { ascending: sortAsc, nullsFirst: false })
      .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

    // Trashed posts are hidden everywhere except the explicit Trash tab.
    // PostgREST quirk: not.eq treats NULL as non-matching, so it would also
    // exclude posts where draft_status IS NULL (the vast majority — every
    // published post). Use an explicit OR to keep nulls.
    if (filter !== "trash") query = query.or("draft_status.is.null,draft_status.neq.trash");

    // Editorial stages are pre-publish only — pin is_published=false so a published
    // post that was previously in a stage doesn't keep showing up here.
    if (filter === "published") query = query.eq("is_published", true);
    if (filter === "drafts") query = query.eq("is_published", false).is("draft_status", null);
    if (filter === "scheduled") query = query.eq("is_published", false).eq("draft_status", "ready_for_scheduling");
    if (filter === "pending") query = query.eq("is_published", false).eq("draft_status", "pending_review");
    if (filter === "in_progress") query = query.eq("is_published", false).eq("draft_status", "in_progress");
    if (filter === "rejected") query = query.eq("is_published", false).eq("draft_status", "rejected");
    if (filter === "trash") query = query.eq("draft_status", "trash");
    if (filter === "syndicated") query = query.eq("is_syndicated", true);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, count } = await query;
    if (data) {
      setPosts(pageNum === 0 ? data : (prev) => [...prev, ...data]);
      setHasMore(data.length === POSTS_PER_PAGE);
    }
    if (count !== null) setTotalCount(count);
    setLoading(false);
  }, [filter, search, sortColumn, sortAsc]);

  useEffect(() => {
    setPage(0);
    setPosts([]);
    void loadPosts(0);
  }, [filter, search, sortColumn, sortAsc, loadPosts]);

  // Fetch counts for every filter bucket in parallel. Uses head:true so we
  // get just the count header (no row payload), keeping the round-trip cheap
  // even on a 5k-post table. Doesn't depend on `search` — counts always show
  // the bucket-wide totals so the editor can navigate by quantity.
  const loadCounts = useCallback(async () => {
    if (!supabase) return;
    const notTrashed = "draft_status.is.null,draft_status.neq.trash";
    const queries: Array<[FilterKey, () => Promise<{ count: number | null }>]> = [
      ["all", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).or(notTrashed)],
      ["published", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).or(notTrashed).eq("is_published", true)],
      ["drafts", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).or(notTrashed).eq("is_published", false).is("draft_status", null)],
      ["scheduled", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).or(notTrashed).eq("is_published", false).eq("draft_status", "ready_for_scheduling")],
      ["pending", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).or(notTrashed).eq("is_published", false).eq("draft_status", "pending_review")],
      ["in_progress", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).or(notTrashed).eq("is_published", false).eq("draft_status", "in_progress")],
      ["rejected", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).or(notTrashed).eq("is_published", false).eq("draft_status", "rejected")],
      ["syndicated", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).or(notTrashed).eq("is_syndicated", true)],
      ["trash", () => supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("draft_status", "trash")],
    ];
    const results = await Promise.all(queries.map(([, q]) => q()));
    const next: Record<FilterKey, number | null> = { ...counts };
    queries.forEach(([key], i) => {
      next[key] = results[i].count ?? 0;
    });
    setCounts(next);
    // counts is intentionally excluded — we always seed `next` from a fresh
    // closure each call, and including it would re-trigger this effect on
    // every counts update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void loadCounts(); }, [loadCounts]);

  const handleSendToTrash = async (id: string) => {
    if (!confirm("Move this post to Trash? It can be restored later.")) return;
    if (!supabase) return;
    await supabase
      .from("blog_posts")
      .update({ draft_status: "trash", is_published: false })
      .eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    void loadCounts();
  };

  const handleRestore = async (id: string) => {
    if (!supabase) return;
    await supabase
      .from("blog_posts")
      .update({ draft_status: null })
      .eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    void loadCounts();
  };

  const handlePermaDelete = async (id: string) => {
    if (!confirm("Delete this post FOREVER? This cannot be undone.")) return;
    if (!supabase) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    void loadCounts();
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    if (!supabase) return;
    const goingPublished = !currentStatus;
    // When publishing, clear the editorial stage — it's pre-publish only.
    const updates: { is_published: boolean; draft_status?: string | null } = { is_published: goingPublished };
    if (goingPublished) updates.draft_status = null;
    await supabase.from("blog_posts").update(updates).eq("id", id);
    setPosts((prev) => prev.map((p) => p.id === id
      ? { ...p, is_published: goingPublished, draft_status: goingPublished ? null : p.draft_status }
      : p
    ));
    void loadCounts();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Blog Posts</h1>
            <span className="text-sm text-zinc-400">({totalCount})</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/calendar" className="text-sm text-brand-blue hover:underline">
              Calendar view &rarr;
            </Link>
            <Link
              href="/admin/posts/new"
              className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
            >
              New Post
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {(["all", "published", "drafts", "scheduled", "pending", "in_progress", "rejected", "syndicated", "trash"] as const).map((f) => {
              const c = counts[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors inline-flex items-center gap-1.5 ${
                    filter === f ? "bg-brand-blue text-white" : "bg-white text-zinc-600 border border-zinc-200"
                  }`}
                >
                  <span>{f.replace("_", " ")}</span>
                  {c !== null && (
                    <span className={`text-xs font-semibold ${filter === f ? "text-white/80" : "text-zinc-400"}`}>
                      {c.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="flex-1 sm:max-w-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        {/* Post list */}
        {loading && posts.length === 0 ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-white rounded-lg animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No posts found.</div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                    <button onClick={() => handleSort("title")} className="hover:text-zinc-900 inline-flex items-center gap-1">
                      Title{sortColumn === "title" && <span aria-hidden>{sortAsc ? "↑" : "↓"}</span>}
                    </button>
                  </th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">
                    <button onClick={() => handleSort("author_name")} className="hover:text-zinc-900 inline-flex items-center gap-1">
                      Author{sortColumn === "author_name" && <span aria-hidden>{sortAsc ? "↑" : "↓"}</span>}
                    </button>
                  </th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                    <button onClick={() => handleSort("category")} className="hover:text-zinc-900 inline-flex items-center gap-1">
                      Category{sortColumn === "category" && <span aria-hidden>{sortAsc ? "↑" : "↓"}</span>}
                    </button>
                  </th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">
                    Source
                  </th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                    <button onClick={() => handleSort("date")} className="hover:text-zinc-900 inline-flex items-center gap-1">
                      Date{sortColumn === "date" && <span aria-hidden>{sortAsc ? "↑" : "↓"}</span>}
                    </button>
                  </th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/posts/${post.id}`} className="text-sm font-medium text-zinc-900 hover:text-brand-blue line-clamp-1">
                        {post.title}
                      </Link>
                      {post.is_syndicated && (
                        <span className="ml-2 text-[10px] bg-brand-orange-light text-brand-orange px-1.5 py-0.5 rounded-full font-medium">
                          Syndicated
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-xs text-zinc-500">{post.author_name || "—"}</span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs text-zinc-500">{post.category || "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleTogglePublish(post.id, post.is_published)}
                        className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                          post.is_published
                            ? "bg-brand-green-light text-brand-green hover:bg-green-200"
                            : post.draft_status === "trash"
                            ? "bg-brand-red-light text-brand-red hover:bg-red-200"
                            : post.draft_status === "rejected"
                            ? "bg-brand-orange-light text-brand-orange hover:bg-orange-200"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                      >
                        {post.is_published
                          ? "Published"
                          : post.draft_status === "ready_for_scheduling"
                          ? "Scheduled"
                          : post.draft_status === "pending_review"
                          ? "Pending"
                          : post.draft_status === "in_progress"
                          ? "In Progress"
                          : post.draft_status === "rejected"
                          ? "Rejected"
                          : post.draft_status === "trash"
                          ? "Trash"
                          : "Draft"}
                      </button>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell max-w-[240px]">
                      {post.canonical_url ? (
                        <a
                          href={post.canonical_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={post.canonical_url}
                          className="text-xs text-brand-blue hover:underline truncate block"
                        >
                          {post.canonical_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs text-zinc-400">
                        {post.date ? new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {filter === "trash" ? (
                          <>
                            <button onClick={() => handleRestore(post.id)} className="text-xs text-brand-green hover:underline">
                              Restore
                            </button>
                            <button onClick={() => handlePermaDelete(post.id)} className="text-xs text-brand-red hover:underline">
                              Delete forever
                            </button>
                          </>
                        ) : (
                          <>
                            <Link href={`/admin/posts/${post.id}`} className="text-xs text-brand-blue hover:underline">
                              Edit
                            </Link>
                            <a
                              href={post.is_published ? `/blog/${post.slug}/` : `/admin/posts/${post.id}/preview`}
                              target="_blank"
                              className="text-xs text-zinc-400 hover:text-zinc-600"
                            >
                              {post.is_published ? "View" : "Preview"}
                            </a>
                            <button onClick={() => handleSendToTrash(post.id)} className="text-xs text-brand-red hover:underline">
                              Trash
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && !loading && posts.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => { const next = page + 1; setPage(next); void loadPosts(next); }}
              className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
