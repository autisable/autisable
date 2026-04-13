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

interface Props {
  post: Post;
  relatedPosts: RelatedPost[];
}

export default function BlogPostClient({ post, relatedPosts }: Props) {
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
      {post.author_name && (
        <div className="mt-10 p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-xl font-bold shrink-0">
            {post.author_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{post.author_name}</h3>
            <p className="text-sm text-zinc-600 mt-1">
              Contributor at Autisable. Sharing stories and perspectives from the autism community.
            </p>
          </div>
        </div>
      )}

      {/* Affiliate Disclosure */}
      <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <strong>Disclosure:</strong> Some links in this article may be affiliate links.
          Autisable may earn a small commission at no additional cost to you when you make
          a purchase through these links. This helps support the platform and our mission
          to serve the autism community. All recommendations are genuine and editorially independent.
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
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-brand-blue-light to-brand-orange-light">
                      <span className="text-brand-blue/40 text-2xl font-bold">A</span>
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
