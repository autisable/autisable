"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";
import PostEditor from "@/app/components/admin/PostEditor";

const supabase = getSupabase();

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const isNew = postId === "new";

  const [post, setPost] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setPost({
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        image: "",
        category: "",
        author_name: "",
        author_id: "",
        focus_keyword: "",
        keywords: [],
        meta_title: "",
        meta_description: "",
        og_image: "",
        is_published: false,
        is_featured: false,
        is_syndicated: false,
        draft_status: "",
        canonical_url: "",
        date: new Date().toISOString().slice(0, 16),
      });
      return;
    }

    const load = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (data) {
        setPost({ ...data, date: data.date?.slice(0, 16) || "" });
      } else {
        setLoadError(error?.message || "Post not found or access denied (check RLS policies).");
      }
      setLoading(false);
    };
    void load();
  }, [postId, isNew, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Couldn&apos;t load post</h1>
          <p className="text-sm text-zinc-600 mb-1">Post ID: <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded">{postId}</code></p>
          <p className="text-sm text-brand-red mb-6">{loadError}</p>
          <Link href="/admin/posts" className="inline-block px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl">
            Back to Posts
          </Link>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin/posts" className="text-sm text-brand-blue hover:underline">&larr; Posts</Link>
          <h1 className="text-xl font-bold text-zinc-900">
            {isNew ? "New Post" : "Edit Post"}
          </h1>
        </div>
      </div>
      <PostEditor post={post} isNew={isNew} />
    </div>
  );
}
