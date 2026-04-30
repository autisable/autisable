import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/app/lib/supabase";
import BlogPostClient from "@/app/components/blog/BlogPostClient";

export const metadata: Metadata = {
  title: "Preview — Autisable Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

async function getAdminUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const authCookie = cookieStore
    .getAll()
    .find((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!authCookie) return null;

  let accessToken: string | null = null;
  try {
    let raw = authCookie.value;
    if (raw.startsWith("base64-")) {
      raw = Buffer.from(raw.slice(7), "base64").toString();
    }
    const parsed = JSON.parse(raw);
    accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
  } catch {
    return null;
  }
  if (!accessToken) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return user.id;
}

export default async function PreviewPostPage({ params }: Props) {
  const { id } = await params;

  const adminId = await getAdminUserId();
  if (!adminId) redirect(`/login?redirect=/admin/posts/${id}/preview`);

  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) notFound();

  let author = null;
  if (post.author_id) {
    const { data } = await supabaseAdmin
      .from("authors")
      .select("display_name, bio, website, twitter, facebook, instagram, linkedin, youtube, avatar_url")
      .eq("id", post.author_id)
      .single();
    author = data;
  }
  if (!author && post.author_name) {
    const { data } = await supabaseAdmin
      .from("authors")
      .select("display_name, bio, website, twitter, facebook, instagram, linkedin, youtube, avatar_url")
      .eq("display_name", post.author_name)
      .single();
    author = data;
  }

  const { data: related } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, image, category, date")
    .eq("is_published", true)
    .eq("category", post.category)
    .neq("id", post.id)
    .order("date", { ascending: false })
    .limit(3);

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
      <BlogPostClient post={post} relatedPosts={related || []} author={author} />
    </>
  );
}
