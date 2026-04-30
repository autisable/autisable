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
  date: string;
  author_name: string | null;
  draft_status: string | null;
}

const POSTS_PER_PAGE = 30;

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "drafts" | "scheduled" | "pending" | "in_progress" | "rejected" | "syndicated" | "trash">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const loadPosts = useCallback(async (pageNum: number) => {
    if (!supabase) return;
    setLoading(true);

    let query = supabase
      .from("blog_posts")
      .select("id, title, slug, category, is_published, is_syndicated, date, author_name, draft_status", { count: "exact" })
      .order("date", { ascending: false })
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
  }, [filter, search]);

  useEffect(() => {
    setPage(0);
    setPosts([]);
    void loadPosts(0);
  }, [filter, search, loadPosts]);

  const handleSendToTrash = async (id: string) => {
    if (!confirm("Move this post to Trash? It can be restored later.")) return;
    if (!supabase) return;
    await supabase
      .from("blog_posts")
      .update({ draft_status: "trash", is_published: false })
      .eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRestore = async (id: string) => {
    if (!supabase) return;
    await supabase
      .from("blog_posts")
      .update({ draft_status: null })
      .eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePermaDelete = async (id: string) => {
    if (!confirm("Delete this post FOREVER? This cannot be undone.")) return;
    if (!supabase) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
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
          <Link
            href="/admin/posts/new"
            className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
          >
            New Post
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            {(["all", "published", "drafts", "scheduled", "pending", "in_progress", "rejected", "syndicated", "trash"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === f ? "bg-brand-blue text-white" : "bg-white text-zinc-600 border border-zinc-200"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
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
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Title</th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Author</th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Date</th>
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
