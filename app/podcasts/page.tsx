import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/app/lib/supabase";

export const metadata: Metadata = {
  title: "Podcasts",
  description: "Three podcast shows from the Autisable community — conversations that inform, inspire, and connect.",
};

export const revalidate = 600;

type Show = {
  title: string;
  slug: string;
  host: string;
  hostNote: string;
  description: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
  // Where the show is hosted (subscribe target)
  subscribeUrl: string;
  subscribeLabel: string;
  // Where to fetch episodes from. "internal" = our podcast_episodes table.
  episodeSource: "internal" | "external";
  // Tag(s) used to find related blog posts
  blogTag: string;
};

const shows: Show[] = [
  {
    title: "Autisable Dads",
    slug: "autisable-dads",
    host: "Joel Manzer",
    hostNote: "Hosted on Autisable",
    description:
      "Conversations between fathers navigating autism parenting — raw, real, and supportive. Joel sits down with guests for honest dialogue about the realities of being a dad in the autism community.",
    gradient: "from-brand-blue to-brand-blue-dark",
    iconBg: "bg-white/15",
    iconColor: "text-white",
    subscribeUrl: "https://open.spotify.com/show/6O9VpAJbgBLc3xn5d0nSl2",
    subscribeLabel: "Listen on Spotify",
    episodeSource: "internal",
    blogTag: "autisable-dads",
  },
  {
    title: "Hope Saves the Day",
    slug: "hope-saves-the-day",
    host: "Paul Cimmins",
    hostNote: "AutismRadio.org · iHeart Radio · Co-produced song with Autisable",
    description:
      "Finding hope in everyday moments. Paul brings broadcast-quality storytelling and perspective from the AutismRadio.org community to families looking for resilience and connection.",
    gradient: "from-brand-orange to-brand-orange-dark",
    iconBg: "bg-white/15",
    iconColor: "text-white",
    subscribeUrl: "https://www.iheart.com/podcast/269-hope-saves-the-day-31112637/",
    subscribeLabel: "Listen on iHeart",
    episodeSource: "external",
    blogTag: "hope-saves-the-day",
  },
  {
    title: "The Autism Dad",
    slug: "the-autism-dad",
    host: "Rob Gorski",
    hostNote: "TheAutismDad.com · Community Partner",
    description:
      "Rob Gorski shares his family's journey with autism — honest conversations about the real challenges, small victories, and everything in between. Long-time community partner.",
    gradient: "from-brand-green to-emerald-700",
    iconBg: "bg-white/15",
    iconColor: "text-white",
    subscribeUrl: "https://www.theautismdad.com",
    subscribeLabel: "Listen at TheAutismDad.com",
    episodeSource: "external",
    blogTag: "the-autism-dad",
  },
];

interface Episode {
  slug: string;
  title: string;
  date: string | null;
  duration: string | null;
  description: string | null;
}

async function getInternalEpisodes(showSlug: string, limit = 3): Promise<Episode[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("podcast_episodes")
    .select("slug, title, date, duration, description")
    .eq("show_slug", showSlug)
    .eq("is_published", true)
    .order("date", { ascending: false })
    .limit(limit);
  return (data as Episode[]) || [];
}

interface RelatedPost {
  slug: string;
  title: string;
  excerpt: string | null;
  date: string;
}

async function getRelatedPosts(blogTag: string, limit = 3): Promise<RelatedPost[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("slug, title, excerpt, date")
    .eq("is_published", true)
    .contains("tags", [blogTag])
    .order("date", { ascending: false })
    .limit(limit);
  return (data as RelatedPost[]) || [];
}

export default async function PodcastsPage() {
  // Fan out: episodes per show + related posts per show
  const showData = await Promise.all(
    shows.map(async (show) => {
      const [episodes, relatedPosts] = await Promise.all([
        show.episodeSource === "internal" ? getInternalEpisodes(show.slug, 3) : Promise.resolve([]),
        getRelatedPosts(show.blogTag, 3),
      ]);
      return { show, episodes, relatedPosts };
    })
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header banner */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 tracking-tight">Podcasts</h1>
        <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
          Three shows, one mission — voices from the autism community sharing conversations that
          inform, inspire, and connect.
        </p>
      </div>

      {/* Three-show card grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-20">
        {showData.map(({ show, episodes }) => (
          <article
            key={show.slug}
            className="rounded-2xl overflow-hidden border border-zinc-100 bg-white flex flex-col"
          >
            {/* Show art / hero */}
            <div className={`bg-gradient-to-br ${show.gradient} text-white p-8 relative`}>
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${show.iconBg} mb-4`}>
                <svg className={`w-7 h-7 ${show.iconColor}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">{show.title}</h2>
              <p className="text-white/90 text-sm font-medium">{show.host}</p>
              <p className="text-white/70 text-xs mt-1">{show.hostNote}</p>
            </div>

            {/* Description + episodes + CTAs */}
            <div className="p-6 flex flex-col flex-1">
              <p className="text-sm text-zinc-600 leading-relaxed mb-5">{show.description}</p>

              {/* Recent episodes — only for shows we host internally */}
              {show.episodeSource === "internal" && episodes.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Recent Episodes
                  </h3>
                  <ul className="space-y-2">
                    {episodes.map((ep) => (
                      <li key={ep.slug}>
                        <Link
                          href={`/podcasts/${show.slug}/${ep.slug}`}
                          className="flex items-start gap-2 text-sm text-zinc-700 hover:text-brand-blue group"
                        >
                          <svg className="w-4 h-4 mt-0.5 shrink-0 text-zinc-400 group-hover:text-brand-blue" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                          </svg>
                          <span className="line-clamp-2 leading-snug">{ep.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* External-hosted note */}
              {show.episodeSource === "external" && (
                <div className="mb-5 p-3 bg-zinc-50 rounded-lg">
                  <p className="text-xs text-zinc-600">
                    New episodes drop regularly on the host&apos;s native platform. Subscribe below to
                    follow along.
                  </p>
                </div>
              )}

              {/* CTAs — pinned to the bottom of the card */}
              <div className="mt-auto pt-3 space-y-2">
                <Link
                  href={`/podcasts/${show.slug}`}
                  className="block w-full text-center px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  More about {show.title} &rarr;
                </Link>
                <a
                  href={show.subscribeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2.5 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 text-sm font-medium rounded-xl transition-colors"
                >
                  {show.subscribeLabel}
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Related blog posts per show */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Recent posts from the shows</h2>
        <p className="text-sm text-zinc-500 mb-8">
          Stories tied to each show, written by hosts and the community.
        </p>

        <div className="space-y-10">
          {showData.map(({ show, relatedPosts }) => (
            <div key={show.slug}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
                {show.title}
              </h3>
              {relatedPosts.length === 0 ? (
                <p className="text-sm text-zinc-400 italic">No tagged posts yet.</p>
              ) : (
                <div className="grid sm:grid-cols-3 gap-4">
                  {relatedPosts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}/`}
                      className="block p-5 bg-white border border-zinc-100 rounded-xl hover:border-zinc-200 hover:shadow-md transition-all"
                    >
                      <h4 className="text-sm font-semibold text-zinc-900 line-clamp-2 mb-2">
                        {post.title}
                      </h4>
                      {post.excerpt && (
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-3">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Listen Everywhere */}
      <div className="bg-zinc-50 rounded-2xl p-8 sm:p-10 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-3">Listen Everywhere</h2>
        <p className="text-zinc-600 mb-6 max-w-lg mx-auto">
          Each show is available on its native platform. Subscribe so you never miss an episode.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {shows.map((show) => (
            <a
              key={show.slug}
              href={show.subscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-zinc-400 transition-colors"
            >
              {show.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
