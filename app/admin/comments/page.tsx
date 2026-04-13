"use client";

import { useEffect, useState } from "react";
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

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"recent" | "reported">("recent");

  const loadComments = async () => {
    setLoading(true);
    if (!supabase) return;
    const { data } = await supabase
      .from("comments")
      .select("id, page, name, comment, likes, user_email, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setComments(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadComments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    if (!supabase) return;
    await supabase.from("comments").delete().eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const getPostSlug = (page: string) => {
    // page format: "blog:uuid"
    return page.replace("blog:", "").slice(0, 8) + "...";
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Comments</h1>
            <span className="text-sm text-zinc-400">({comments.length})</span>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No comments found.</div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-xl border border-zinc-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold shrink-0">
                      {comment.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
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
        )}
      </div>
    </div>
  );
}
