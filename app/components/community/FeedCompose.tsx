"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";
import { adminFetch } from "@/app/lib/adminFetch";

const supabase = getSupabase();

interface Props {
  currentUserId: string;
  currentUserDisplayName: string;
  // Bubble newly-posted item back to the parent feed without a refetch
  onPosted: (item: {
    id: string;
    user_id: string;
    display_name: string;
    content: string;
    image_url: string | null;
    type: "post";
    source: "activity";
    created_at: string;
    reactions_count: number;
    replies_count: number;
  }) => void;
}

const MAX_LENGTH = 2000;
// Q9: at this length we suggest the user might want a full blog post instead.
const BLOG_PROMPT_THRESHOLD = 300;

export default function FeedCompose({ currentUserId, currentUserDisplayName, onPosted }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = content.trim();
  const overLimit = content.length > MAX_LENGTH;
  const showBlogPrompt = content.length >= BLOG_PROMPT_THRESHOLD;
  const canPost = (trimmed.length > 0 || imageUrl) && !overLimit && !posting && !imageBusy;

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImageBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminFetch("/api/upload/feed-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setImageBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => setImageUrl(null);

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    const { data, error: insertErr } = await supabase
      .from("activity_feed")
      .insert({
        user_id: currentUserId,
        display_name: currentUserDisplayName,
        content: trimmed,
        image_url: imageUrl,
        type: "post",
      })
      .select("id, user_id, display_name, content, image_url, created_at, reactions_count, replies_count")
      .single();

    if (insertErr || !data) {
      setError(insertErr?.message || "Couldn't post. Try again.");
      setPosting(false);
      return;
    }

    onPosted({
      id: data.id,
      user_id: data.user_id,
      display_name: data.display_name,
      content: data.content,
      image_url: data.image_url,
      type: "post",
      source: "activity",
      created_at: data.created_at,
      reactions_count: data.reactions_count || 0,
      replies_count: data.replies_count || 0,
    });
    setContent("");
    setImageUrl(null);
    setPosting(false);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share what's on your mind..."
        rows={3}
        maxLength={MAX_LENGTH + 200}
        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
      />

      {imageUrl && (
        <div className="mt-3 relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Attached" className="max-h-48 rounded-lg border border-zinc-200" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 bg-zinc-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-zinc-700"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {/* Q9: encourage long status updates to become a blog post instead */}
      {showBlogPrompt && (
        <div className="mt-3 flex items-start gap-3 p-3 bg-brand-blue-light/40 border border-brand-blue/15 rounded-lg">
          <svg className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.847-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
          <div className="flex-1 text-xs text-zinc-700">
            <p className="font-medium text-zinc-900">This is becoming a great story.</p>
            <p className="mt-0.5">Status updates are best for quick thoughts. For something this substantial, consider <Link href="/dashboard/journal/new" className="text-brand-blue hover:underline font-medium">writing it as a journal entry</Link> — you can submit it for publication and reach the wider community.</p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handlePickImage}
            disabled={imageBusy || !!imageUrl}
            title={imageUrl ? "Remove the current image to add another" : "Add an image"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            {imageBusy ? "Uploading..." : "Image"}
          </button>
          <span className={`text-xs ${overLimit ? "text-brand-red font-medium" : "text-zinc-400"}`}>
            {content.length}/{MAX_LENGTH}
          </span>
        </div>
        <button
          type="button"
          onClick={handlePost}
          disabled={!canPost}
          className="px-5 py-1.5 text-sm bg-brand-blue hover:bg-brand-blue-dark text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
    </div>
  );
}
