import Link from "next/link";
import Image from "next/image";
import { supabaseAdmin } from "@/app/lib/supabase";

export const metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const { data: recent } = supabaseAdmin
    ? await supabaseAdmin
        .from("blog_posts")
        .select("slug, title, image, category, date")
        .eq("is_published", true)
        .order("date", { ascending: false })
        .limit(3)
    : { data: null };

  const posts = recent || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <p className="text-sm font-semibold text-brand-blue tracking-wider uppercase mb-3">404</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 tracking-tight mb-4">
          We couldn&apos;t find that page
        </h1>
        <p className="text-lg text-zinc-600 max-w-xl mx-auto">
          The page you&apos;re looking for may have been moved, renamed, or never existed.
          You&apos;re still in the right community — let&apos;s get you back on track.
        </p>
      </div>

      <form action="/search" method="GET" className="max-w-xl mx-auto mb-12">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            placeholder="Search stories, podcasts, resources..."
            className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl text-base focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-xl transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-12">
        <Link href="/blog/" className="px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-brand-blue hover:text-brand-blue transition-colors text-center">
          Stories
        </Link>
        <Link href="/podcasts/" className="px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-brand-blue hover:text-brand-blue transition-colors text-center">
          Podcasts
        </Link>
        <Link href="/resources/" className="px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-brand-blue hover:text-brand-blue transition-colors text-center">
          Resources
        </Link>
        <Link href="/contact/" className="px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-brand-blue hover:text-brand-blue transition-colors text-center">
          Contact
        </Link>
      </div>

      {posts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-5 text-center">
            Recent stories
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}/`}
                className="group block bg-white rounded-2xl border border-zinc-100 overflow-hidden hover:border-brand-blue transition-colors"
              >
                {post.image && (
                  <div className="aspect-video relative bg-zinc-50">
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  {post.category && (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-brand-blue mb-2">
                      {post.category}
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-brand-blue transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-16 text-center">
        <Link href="/" className="text-sm text-brand-blue hover:underline">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
