"use client";

import Image from "next/image";
import Link from "next/link";
import Comments from "../Comments";
import BlogShareButtons from "./BlogShareButtons";
import NewsletterPopup from "./NewsletterPopup";

interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  image: string | null;
  category: string;
  date: string;
  date_modified: string | null;
  read_time: string | null;
  author_name: string | null;
  canonical_url: string | null;
  is_syndicated: boolean;
}

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  category: string;
  date: string;
}

interface Author {
  display_name: string;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
  avatar_url: string | null;
}

interface Props {
  post: Post;
  relatedPosts: RelatedPost[];
  author?: Author | null;
}

export default function BlogPostClient({ post, relatedPosts, author }: Props) {
  return (
    <>
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <header className="mb-10">
        {post.category && (
          <Link
            href={`/blog?category=${encodeURIComponent(post.category)}`}
            className="inline-block px-3 py-1 bg-brand-blue-light text-brand-blue text-sm font-medium rounded-full mb-4 hover:bg-brand-blue/20 transition-colors"
          >
            {post.category}
          </Link>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 leading-tight tracking-tight">
          {post.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          {post.author_name && (
            <span className="font-medium text-zinc-700">{post.author_name}</span>
          )}
          {post.date && (
            <>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </>
          )}
          {post.read_time && (
            <>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span>{post.read_time}</span>
            </>
          )}
        </div>
      </header>

      {/* Featured Image */}
      {post.image && (
        <div className="relative aspect-[2/1] rounded-2xl overflow-hidden mb-10">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* FTC Affiliate Disclosure - above content */}
      <p className="text-sm text-zinc-400 italic mb-8">
        This article may contain affiliate links.{" "}
        <a href="/privacy#affiliate-disclosure" className="text-zinc-500 underline underline-offset-2 hover:text-brand-blue transition-colors">
          Learn more
        </a>
      </p>

      {/* Content */}
      <div
        className="prose prose-zinc prose-lg max-w-none prose-headings:tracking-tight prose-a:text-brand-blue prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Syndicated Post Footer */}
      {post.is_syndicated && post.canonical_url && (
        <div className="mt-10 p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
          <p className="text-sm text-zinc-600">
            This post was originally published elsewhere.{" "}
            <a
              href={post.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue font-medium hover:underline"
            >
              Read the original post &rarr;
            </a>
          </p>
        </div>
      )}

      {/* Author Bio */}
      {(author || post.author_name) && (
        <div className="mt-12 border-t border-zinc-200 pt-10">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Avatar */}
            {author?.avatar_url ? (
              <img
                src={author.avatar_url}
                alt={author.display_name}
                className="w-24 h-24 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-3xl font-bold shrink-0">
                {(author?.display_name || post.author_name || "A").charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Article by</p>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">
                {author?.display_name || post.author_name}
              </h3>
              {author?.bio ? (
                <p
                  className="text-sm text-zinc-600 leading-relaxed max-w-lg mb-4 [&_a]:text-brand-blue [&_a]:underline [&_a]:underline-offset-2"
                  dangerouslySetInnerHTML={{
                    __html: author.bio.replace(
                      /(https?:\/\/[^\s<]+)/g,
                      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
                    ),
                  }}
                />
              ) : (
                <p className="text-sm text-zinc-600 mb-4">Contributor at Autisable.</p>
              )}

              {/* Social Icons */}
              <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                {author?.website && (
                  <a href={author.website} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-brand-blue hover:text-white flex items-center justify-center transition-colors" title="Website">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9 9 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                  </a>
                )}
                {author?.twitter && (
                  <a href={author.twitter.startsWith("http") ? author.twitter : `https://twitter.com/${author.twitter}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white flex items-center justify-center transition-colors" title="X / Twitter">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </a>
                )}
                {author?.facebook && (
                  <a href={author.facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-[#1877F2] hover:text-white flex items-center justify-center transition-colors" title="Facebook">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                )}
                {author?.instagram && (
                  <a href={author.instagram.startsWith("http") ? author.instagram : `https://instagram.com/${author.instagram}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-[#E4405F] hover:text-white flex items-center justify-center transition-colors" title="Instagram">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </a>
                )}
                {author?.linkedin && (
                  <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-[#0A66C2] hover:text-white flex items-center justify-center transition-colors" title="LinkedIn">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </a>
                )}
                {author?.youtube && (
                  <a href={author.youtube} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-[#FF0000] hover:text-white flex items-center justify-center transition-colors" title="YouTube">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affiliate Disclosure */}
      <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <strong>Disclosure:</strong> Autisable.com participates in affiliate programs, including the
          Amazon Services LLC Associates Program and other affiliate advertising programs. This means we
          may earn commissions from qualifying purchases at no additional cost to you.
        </p>
      </div>

      {/* Share */}
      <div className="mt-10 pt-8 border-t border-zinc-200">
        <BlogShareButtons title={post.title} slug={post.slug} />
      </div>

      {/* Comments */}
      <div className="mt-12">
        <Comments pageId={post.id} pageType="blog" />
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="mt-16 pt-10 border-t border-zinc-200">
          <h2 className="text-2xl font-bold text-zinc-900 mb-8">Related Stories</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {relatedPosts.map((related) => (
              <Link
                key={related.id}
                href={`/blog/${related.slug}`}
                className="group"
              >
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-zinc-100 mb-3">
                  {related.image ? (
                    <Image
                      src={related.image}
                      alt={related.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-brand-blue-light to-brand-orange-light p-4">
                      <img src="/Logo.png" alt="Autisable" className="w-3/4 max-w-[120px] opacity-40" />
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-brand-blue transition-colors line-clamp-2">
                  {related.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
    <NewsletterPopup />
    </>
  );
}
