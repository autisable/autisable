"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";
import BlogPostClient from "@/app/components/blog/BlogPostClient";

const supabase = getSupabase();

type Post = Record<string, unknown> & {
  id: string;
  slug: string;
  category: string;
  is_published: boolean;
  draft_status: string | null;
  author_id?: string | null;
  author_name?: string | null;
};

type Author = {
  display_name: string;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
  avatar_url: string | null;
};

type RelatedPost = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  category: string;
  date: string;
};

export default function PreviewPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [state, setState] = useState<"checking" | "forbidden" | "loading" | "ready" | "notfound">("checking");
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?redirect=/admin/posts/${postId}/preview`);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        setState("forbidden");
        return;
      }

      setState("loading");

      const { data: postData } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (!postData) {
        setState("notfound");
        return;
      }
      const fetched = postData as Post;
      setPost(fetched);

      if (fetched.author_id) {
        const { data } = await supabase
          .from("authors")
          .select("display_name, bio, website, twitter, facebook, instagram, linkedin, youtube, avatar_url")
          .eq("id", fetched.author_id)
          .single();
        if (data) setAuthor(data as Author);
      }
      if (!author && fetched.author_name) {
        const { data } = await supabase
          .from("authors")
          .select("display_name, bio, website, twitter, facebook, instagram, linkedin, youtube, avatar_url")
          .eq("display_name", fetched.author_name)
          .single();
        if (data) setAuthor(data as Author);
      }

      const { data: relatedData } = await supabase
        .from("blog_posts")
        .select("id, slug, title, image, category, date")
        .eq("is_published", true)
        .eq("category", fetched.category)
        .neq("id", fetched.id)
        .order("date", { ascending: false })
        .limit(3);
      if (relatedData) setRelated(relatedData as RelatedPost[]);

      setState("ready");
    };
    void run();
    // author intentionally not in deps — only set once during initial fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, router]);

  if (state === "checking" || state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400 animate-pulse">
        Loading preview...
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Admin only</h1>
          <p className="text-sm text-zinc-600 mb-6">You need an admin account to preview unpublished posts.</p>
          <Link href="/dashboard" className="inline-block px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (state === "notfound" || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Post not found</h1>
          <p className="text-sm text-zinc-600 mb-1">Post ID:</p>
          <code className="text-xs bg-zinc-100 px-2 py-1 rounded">{postId}</code>
          <div className="mt-6">
            <Link href="/admin/posts" className="inline-block px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl">
              Back to Posts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = post.is_published
    ? "Published"
    : post.draft_status === "ready_for_scheduling"
    ? "Scheduled"
    : post.draft_status === "pending_review"
    ? "Pending Review"
    : post.draft_status === "in_progress"
    ? "In Progress"
    : "Draft";

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-amber-900">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>
              <strong>Preview mode</strong> — this post is{" "}
              <strong>{statusLabel}</strong> and not visible to the public.
            </span>
          </div>
          <Link href={`/admin/posts/${post.id}`} className="text-amber-900 underline hover:no-underline shrink-0">
            Edit post
          </Link>
        </div>
      </div>
      <BlogPostClient
        post={post as unknown as Parameters<typeof BlogPostClient>[0]["post"]}
        relatedPosts={related}
        author={author}
      />
    </>
  );
}
