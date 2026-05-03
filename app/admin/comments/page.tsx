"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface Comment {
  id: string;
  page: string;
  name: string;
  comment: string;
  likes: number;
  user_email: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"recent" | "reported">("recent");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Reported = comments referenced by moderation_reports rows. We pull the
  // referenced comment IDs first, then load the matching comment rows so
  // search + pagination still work the same way as the recent view.
  const loadReportedIds = useCallback(async (): Promise<string[]> => {
    if (!supabase) return [];
    const { data } = await supabase
      .from("moderation_reports")
      .select("content_id")
      .eq("content_type", "comment")
      .in("status", ["pending", "reviewed"]);
    return (data || []).map((r) => r.content_id as string);
  }, []);

  const load = useCallback(async (pageNum: number) => {
    if (!supabase) return;
    setLoading(true);

    let query = supabase
      .from("comments")
      .select("id, page, name, comment, likes, user_email, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (filter === "reported") {
      const ids = await loadReportedIds();
      if (ids.length === 0) {
        setComments([]);
        setHasMore(false);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      query = query.in("id", ids);
    }

    if (search.trim()) {
      // Match either the comment body or the commenter's name.
      const s = search.trim().replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(`comment.ilike.%${s}%,name.ilike.%${s}%`);
    }

    const { data, count } = await query;
    if (data) {
      setComments(pageNum === 0 ? data : (prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    if (count !== null && count !== undefined) setTotalCount(count);
    setLoading(false);
  }, [filter, search, loadReportedIds]);

  useEffect(() => {
    setPage(0);
    setComments([]);
    void load(0);
  }, [filter, search, load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    if (!supabase) return;
    // .select() forces a real response — without it, a RLS rejection returns
    // {data:null, error:null} and the UI silently succeeds while nothing was
    // actually deleted (next page reload, the comment reappears).
    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id)
      .select("id");
    if (error || !data || data.length === 0) {
      alert(`Delete failed: ${error?.message || "no rows affected — RLS may be blocking the delete (admin policy missing?)"}`);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
    if (totalCount !== null) setTotalCount(totalCount - 1);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const getPostSlug = (page: string) => page.replace("blog:", "").slice(0, 8) + "…";

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Comments</h1>
            <span className="text-sm text-zinc-400">
              ({totalCount?.toLocaleString() ?? "…"})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("recent")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === "recent" ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setFilter("reported")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === "reported" ? "bg-brand-orange text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Reported
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSearchSubmit} className="mb-5 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search comments or commenter name…"
            className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearch(""); }}
              className="px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 rounded-lg"
            >
              Clear
            </button>
          )}
        </form>

        {loading && comments.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            {filter === "reported" ? "No reported comments." : search ? `No comments match "${search}".` : "No comments found."}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white rounded-xl border border-zinc-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold shrink-0">
                        {comment.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-zinc-900">{comment.name}</span>
                          {comment.user_email && (
                            <span className="text-xs text-zinc-400">{comment.user_email}</span>
                          )}
                          <span className="text-xs text-zinc-300">
                            {new Date(comment.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed line-clamp-3">
                          {comment.comment}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                          <span>Post: {getPostSlug(comment.page)}</span>
                          {comment.likes > 0 && <span>{comment.likes} likes</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="shrink-0 px-3 py-1 text-xs font-medium text-brand-red hover:bg-brand-red-light rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
            {!hasMore && comments.length >= PAGE_SIZE && (
              <p className="mt-6 text-center text-xs text-zinc-400">No more comments.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
