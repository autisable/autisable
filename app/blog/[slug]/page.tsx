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
    .select("title, excerpt, image, meta_title, meta_description, og_image, canonical_url, focus_keyword, keywords, tags")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!post) return { title: "Post Not Found" };

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt;
  const canonical = post.canonical_url || `https://autisable.com/blog/${slug}/`;
  // OG image: editor's explicit upload wins, otherwise auto-generated at 1200x630.
  // Auto-gen pulls live data so any title/featured-image change is reflected
  // (cached for 1h at the edge — see /api/og/[slug]/route.ts).
  const ogImage = post.og_image || `https://autisable.com/api/og/${slug}/`;

  // Build keywords list: focus first, then additional, then tags as fallback
  const allKeywords = [
    post.focus_keyword,
    ...(Array.isArray(post.keywords) ? post.keywords : []),
    ...(Array.isArray(post.tags) ? post.tags : []),
  ]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe

  return {
    title,
    description,
    keywords: allKeywords.length > 0 ? allKeywords : undefined,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName: "Autisable",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
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

  // ── JSON-LD: Article + Person + BreadcrumbList ──
  const canonicalUrl = post.canonical_url || `https://autisable.com/blog/${slug}/`;

  const articleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.og_image || `https://autisable.com/api/og/${slug}/`,
    datePublished: post.date,
    dateModified: post.date_modified || post.date,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    publisher: {
      "@type": "Organization",
      name: "Autisable",
      logo: { "@type": "ImageObject", url: "https://autisable.com/Logo.png" },
    },
    ...(post.focus_keyword || (Array.isArray(post.keywords) && post.keywords.length)
      ? {
          keywords: [
            post.focus_keyword,
            ...(Array.isArray(post.keywords) ? post.keywords : []),
            ...(Array.isArray(post.tags) ? post.tags : []),
          ]
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .join(", "),
        }
      : {}),
    ...(post.category ? { articleSection: post.category } : {}),
  };

  if (author) {
    const sameAs = [
      author.website,
      author.twitter,
      author.facebook,
      author.instagram,
      author.linkedin,
      author.youtube,
    ].filter(Boolean);
    articleSchema.author = {
      "@type": "Person",
      name: author.display_name,
      ...(author.bio ? { description: author.bio } : {}),
      ...(author.avatar_url ? { image: author.avatar_url } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
    };
  } else if (post.author_name) {
    articleSchema.author = { "@type": "Person", name: post.author_name };
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://autisable.com" },
      { "@type": "ListItem", position: 2, name: "Stories", item: "https://autisable.com/blog/" },
      { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <BlogPostClient post={post} relatedPosts={related || []} author={author} />
    </>
  );
}
