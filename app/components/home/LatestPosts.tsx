import Link from "next/link";
import Image from "next/image";
import { supabaseAdmin } from "@/app/lib/supabase";

export const revalidate = 60;

export default async function LatestPosts() {
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, excerpt, image, category, date, read_time, author_name")
    .eq("is_published", true)
    .order("date", { ascending: false })
    .limit(6);

  const items = posts || [];

  return (
    <section className="py-20 bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
              Latest Stories
            </h2>
            <p className="mt-3 text-lg text-zinc-600">
              Fresh perspectives from across the community.
            </p>
          </div>
          <Link
            href="/blog"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            View all stories
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((post) => (
              <article key={post.id} className="bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg hover:border-zinc-200 transition-all group">
                <Link href={`/blog/${post.slug}/`} className="block">
                  <div className="relative aspect-[16/9] bg-zinc-100">
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gradient-to-br from-brand-blue-light to-brand-orange-light p-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/Logo.png" alt="Autisable" className="w-3/4 max-w-[160px] opacity-40" />
                      </div>
                    )}
                    {post.category && (
                      <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-zinc-700 rounded-full">
                        {post.category}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-brand-blue transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                      {post.author_name && <span>{post.author_name}</span>}
                      {post.author_name && post.date && <span className="w-1 h-1 rounded-full bg-zinc-300" />}
                      {post.date && (
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      )}
                      {post.read_time && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-zinc-300" />
                          <span>{post.read_time}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-center text-zinc-400">No stories yet.</p>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue"
          >
            View all stories
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
