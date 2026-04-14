import { supabaseAdmin } from "@/app/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BlogPostClient from "@/app/components/blog/BlogPostClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("title, excerpt, image, meta_title, meta_description, og_image")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!post) return { title: "Post Not Found" };

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt;
  const image = post.og_image || post.image;

  return {
    title,
    description,
    alternates: {
      canonical: `https://autisable.com/blog/${slug}/`,
    },
    openGraph: {
      title,
      description,
      url: `https://autisable.com/blog/${slug}/`,
      type: "article",
      siteName: "Autisable",
      images: image ? [{ url: image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!post) notFound();

  // Fetch author details — try by author_id first, fallback to author_name
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

  return <BlogPostClient post={post} relatedPosts={related || []} author={author} />;
}
