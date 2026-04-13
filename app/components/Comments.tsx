"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/app/lib/supabase-browser";
import AuthModal from "./AuthModal";

const supabase = getSupabase();
interface Comment {
  id: string;
  name: string;
  comment: string;
  likes: number;
  created_at: string;
  user_id: string | null;
}

interface Props {
  pageId: string;
  pageType: string;
}

export default function Comments({ pageId, pageType }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, name, comment, likes, created_at, user_id")
      .eq("page", `${pageType}:${pageId}`)
      .order("created_at", { ascending: false });

    if (data) setComments(data);
  }, [pageId, pageType]);

  useEffect(() => {
    void loadComments();

    const checkAuth = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser({ id: u.id, email: u.email ?? undefined });
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("display_name")
          .eq("id", u.id)
          .single();
        if (profile?.display_name) setDisplayName(profile.display_name);
      }
    };
    void checkAuth();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      page: `${pageType}:${pageId}`,
      comment: newComment.trim(),
      name: displayName || user.email || "Member",
      user_id: user.id,
      user_email: user.email,
    });

    if (!error) {
      setNewComment("");
      void loadComments();
    }
    setSubmitting(false);
  };

  const handleLike = async (commentId: string, currentLikes: number) => {
    await supabase
      .from("comments")
      .update({ likes: currentLikes + 1 })
      .eq("id", commentId);
    void loadComments();
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-zinc-900 mb-6">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-6 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-6 bg-zinc-50 rounded-2xl text-center">
          <p className="text-zinc-600 mb-3">Join the community to leave a comment.</p>
          <button
            onClick={() => setShowAuth(true)}
            className="px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
          >
            Log in or Sign up
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold shrink-0">
              {comment.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-zinc-900">{comment.name}</span>
                <span className="text-xs text-zinc-400">
                  {new Date(comment.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-sm text-zinc-700 leading-relaxed">{comment.comment}</p>
              <button
                onClick={() => handleLike(comment.id, comment.likes)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-brand-blue transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m7.594 0H5.904m7.594 0a.75.75 0 0 1-.596.297" />
                </svg>
                {comment.likes > 0 ? comment.likes : "Like"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
