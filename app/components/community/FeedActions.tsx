"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

type FeedItemType = "activity" | "journal";

interface Reply {
  id: string;
  user_id: string;
  display_name: string;
  content: string;
  created_at: string;
}

interface Props {
  feedItemId: string;
  feedItemType: FeedItemType;
  initialLikeCount: number;
  initialReplyCount: number;
  currentUserId: string | null;
  currentUserDisplayName: string | null;
}

/**
 * Like + reply controls for a single feed card.
 * - Like: optimistic toggle backed by feed_reactions.
 * - Reply: collapsible thread that lazy-loads on first expand.
 */
export default function FeedActions({
  feedItemId,
  feedItemType,
  initialLikeCount,
  initialReplyCount,
  currentUserId,
  currentUserDisplayName,
}: Props) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeChecked, setLikeChecked] = useState(false);

  const [replyCount, setReplyCount] = useState(initialReplyCount);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  // Did current user like this?
  useEffect(() => {
    if (!currentUserId) {
      setLikeChecked(true);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("feed_reactions")
        .select("id")
        .eq("feed_item_id", feedItemId)
        .eq("feed_item_type", feedItemType)
        .eq("user_id", currentUserId)
        .eq("reaction", "like")
        .maybeSingle();
      setLiked(!!data);
      setLikeChecked(true);
    })();
  }, [feedItemId, feedItemType, currentUserId]);

  const toggleLike = async () => {
    if (!currentUserId || likeBusy) return;
    setLikeBusy(true);

    if (liked) {
      // Optimistic
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("feed_reactions")
        .delete()
        .eq("feed_item_id", feedItemId)
        .eq("feed_item_type", feedItemType)
        .eq("user_id", currentUserId)
        .eq("reaction", "like");
      if (error) {
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase
        .from("feed_reactions")
        .insert({ feed_item_id: feedItemId, feed_item_type: feedItemType, user_id: currentUserId, reaction: "like" });
      if (error) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    }

    setLikeBusy(false);
  };

  const expandReplies = async () => {
    setShowReplies(true);
    if (repliesLoaded) return;
    const { data } = await supabase
      .from("feed_replies")
      .select("id, user_id, display_name, content, created_at")
      .eq("feed_item_id", feedItemId)
      .eq("feed_item_type", feedItemType)
      .order("created_at", { ascending: true })
      .limit(50);
    setReplies(data || []);
    setRepliesLoaded(true);
  };

  const submitReply = async () => {
    const text = replyDraft.trim();
    if (!text || !currentUserId || replyBusy) return;
    setReplyBusy(true);

    const { data, error } = await supabase
      .from("feed_replies")
      .insert({
        feed_item_id: feedItemId,
        feed_item_type: feedItemType,
        user_id: currentUserId,
        display_name: currentUserDisplayName || "Member",
        content: text,
      })
      .select("id, user_id, display_name, content, created_at")
      .single();

    if (!error && data) {
      setReplies((prev) => [...prev, data as Reply]);
      setReplyCount((c) => c + 1);
      setReplyDraft("");
    }
    setReplyBusy(false);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <button
          onClick={toggleLike}
          disabled={!currentUserId || !likeChecked || likeBusy}
          title={!currentUserId ? "Log in to like" : liked ? "Unlike" : "Like"}
          className={`inline-flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed ${
            liked ? "text-brand-red" : "hover:text-brand-red"
          }`}
        >
          <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          {likeCount}
        </button>

        <button
          onClick={() => (showReplies ? setShowReplies(false) : expandReplies())}
          className="inline-flex items-center gap-1.5 hover:text-brand-blue transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
          </svg>
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </button>
      </div>

      {showReplies && (
        <div className="mt-4 pl-4 border-l-2 border-zinc-100 space-y-3">
          {replies.length === 0 && repliesLoaded && (
            <p className="text-xs text-zinc-400 italic">No replies yet — be the first.</p>
          )}
          {replies.map((r) => (
            <div key={r.id} className="text-sm">
              <p className="font-medium text-zinc-900">
                {r.display_name}{" "}
                <time className="font-normal text-xs text-zinc-400">
                  · {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </time>
              </p>
              <p className="text-zinc-700 mt-0.5">{r.content}</p>
            </div>
          ))}

          {currentUserId ? (
            <div className="pt-2">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                maxLength={2000}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none focus:ring-2 focus:ring-brand-blue"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setReplyDraft("")}
                  disabled={!replyDraft || replyBusy}
                  className="px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 rounded-lg disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  onClick={submitReply}
                  disabled={!replyDraft.trim() || replyBusy}
                  className="px-4 py-1.5 text-xs bg-brand-blue hover:bg-brand-blue-dark text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {replyBusy ? "Posting..." : "Reply"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 pt-2">Log in to reply.</p>
          )}
        </div>
      )}
    </div>
  );
}
