import Link from "next/link";
import Image from "next/image";
import { supabaseAdmin } from "@/app/lib/supabase";

export const revalidate = 60;

const FEATURED_SLUG = "504-plan-vs-iep-which-one-does-your-child-need";

export default async function FeaturedStory() {
  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, excerpt, image, category, date, read_time, author_name")
    .eq("slug", FEATURED_SLUG)
    .eq("is_published", true)
    .single();

  if (!post) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-[11px] tracking-[0.18em] uppercase text-brand-blue font-medium">Featured Story</span>
          <span className="flex-1 h-px bg-zinc-200" />
        </div>

        <article className="group">
          <Link
            href={`/blog/${post.slug}/`}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100">
              <Image
                src="/VizyAdvocate.png"
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                {post.category && (
                  <span className="px-3 py-1 bg-brand-blue-light text-brand-blue text-xs font-medium rounded-full">
                    {post.category}
                  </span>
                )}
                {post.read_time && (
                  <span className="text-xs text-zinc-400">{post.read_time}</span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 leading-tight group-hover:text-brand-blue transition-colors mb-4">
                {post.title}
              </h2>

              {post.excerpt && (
                <p className="text-zinc-600 leading-relaxed mb-6 line-clamp-3 text-base">
                  {post.excerpt}
                </p>
              )}

              <div className="flex items-center gap-3 text-sm text-zinc-500">
                {post.author_name && (
                  <span className="font-medium text-zinc-700">{post.author_name}</span>
                )}
                {post.author_name && post.date && (
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                )}
                {post.date && (
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                )}
              </div>

              <div className="mt-6 inline-flex items-center gap-2 text-brand-blue font-medium text-sm group-hover:gap-3 transition-all">
                Read the full story
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          </Link>
        </article>
      </div>
    </section>
  );
}
