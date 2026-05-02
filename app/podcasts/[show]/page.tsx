import { supabaseAdmin } from "@/app/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

interface ShowMeta {
  title: string;
  host: string;
  hostNote: string;
  description: string;
  longDescription: string;
  gradient: string;
  episodeSource: "internal" | "external";
  blogTag: string;
  // Subscribe destinations
  primaryUrl: string;
  primaryLabel: string;
  // Optional secondary platforms
  links: { label: string; href: string }[];
}

const showMeta: Record<string, ShowMeta> = {
  "autisable-dads": {
    title: "Autisable Dads",
    host: "Joel Manzer",
    hostNote: "Hosted on Autisable",
    description: "Conversations between fathers navigating autism parenting.",
    longDescription:
      "Autisable Dads is a long-running conversation series where fathers in the autism community share what daily life actually looks like — from the small wins nobody else notices to the hard nights nobody talks about. Joel Manzer hosts and brings on guest dads to dig into what it means to show up, mess up, and keep showing up again. There's no script and no judgment — just dads talking honestly with other dads.",
    gradient: "from-brand-blue to-brand-blue-dark",
    episodeSource: "internal",
    blogTag: "autisable-dads",
    primaryUrl: "https://open.spotify.com/show/6O9VpAJbgBLc3xn5d0nSl2",
    primaryLabel: "Listen on Spotify",
    links: [
      { label: "YouTube", href: "https://www.youtube.com/@autisabledads/podcasts" },
      { label: "Apple Podcasts", href: "#" },
    ],
  },
  "hope-saves-the-day": {
    title: "Hope Saves the Day",
    host: "Paul Cimmins",
    hostNote: "AutismRadio.org · iHeart Radio",
    description: "Finding hope in everyday moments of autism parenting.",
    longDescription:
      "Hope Saves the Day comes from Paul Cimmins and the AutismRadio.org community — broadcast-quality storytelling that pulls listeners into the everyday moments of resilience inside the autism family experience. Paul is a long-time broadcast partner of Autisable, and the two of us have co-produced original work together (including a song that reflects the spirit of this show). New episodes drop on iHeart on Paul's regular cadence.",
    gradient: "from-brand-orange to-brand-orange-dark",
    episodeSource: "external",
    blogTag: "hope-saves-the-day",
    primaryUrl: "https://www.iheart.com/podcast/269-hope-saves-the-day-31112637/",
    primaryLabel: "Listen on iHeart Radio",
    links: [
      { label: "AutismRadio.org", href: "https://www.autismradio.org/hope-saves-the-day" },
    ],
  },
  "the-autism-dad": {
    title: "The Autism Dad",
    host: "Rob Gorski",
    hostNote: "TheAutismDad.com · Community Partner",
    description: "Rob Gorski's family journey with autism.",
    longDescription:
      "The Autism Dad is Rob Gorski's space for sharing his family's day-to-day reality — the kind of unfiltered honesty that has built one of the most trusted autism parenting voices on the web. Rob is a long-time Autisable community partner; episodes and writing live primarily at TheAutismDad.com, and we surface his work here so the autism community can find every voice in one place.",
    gradient: "from-brand-green to-emerald-700",
    episodeSource: "external",
    blogTag: "the-autism-dad",
    primaryUrl: "https://www.theautismdad.com",
    primaryLabel: "Visit TheAutismDad.com",
    links: [],
  },
};

interface Props {
  params: Promise<{ show: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { show } = await params;
  const meta = showMeta[show];
  if (!meta) return { title: "Podcast Not Found" };
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: `${meta.title} — Autisable`,
      description: meta.description,
      type: "website",
    },
  };
}

export default async function PodcastShowPage({ params }: Props) {
  const { show } = await params;
  const meta = showMeta[show];
  if (!meta) notFound();

  const [episodesRes, postsRes] = await Promise.all([
    meta.episodeSource === "internal" && supabaseAdmin
      ? supabaseAdmin
          .from("podcast_episodes")
          .select("id, slug, title, description, date, duration")
          .eq("show_slug", show)
          .eq("is_published", true)
          .order("date", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; slug: string; title: string; description: string | null; date: string | null; duration: string | null }[] }),
    supabaseAdmin
      ? supabaseAdmin
          .from("blog_posts")
          .select("slug, title, excerpt, image, date")
          .eq("is_published", true)
          .contains("tags", [meta.blogTag])
          .order("date", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as { slug: string; title: string; excerpt: string | null; image: string | null; date: string }[] }),
  ]);

  const episodes = episodesRes.data || [];
  const relatedPosts = postsRes.data || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-8 sm:p-12 text-white mb-10 relative overflow-hidden`}>
        <Link
          href="/podcasts"
          className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          All Podcasts
        </Link>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-4">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{meta.title}</h1>
        <p className="text-white/90 text-base sm:text-lg font-medium">{meta.host}</p>
        <p className="text-white/70 text-sm mt-1">{meta.hostNote}</p>
      </div>

      {/* About */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">About this show</h2>
        <p className="text-zinc-700 leading-relaxed">{meta.longDescription}</p>
      </section>

      {/* Subscribe */}
      <section className="mb-12 p-6 bg-zinc-50 rounded-2xl">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Subscribe</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={meta.primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {meta.primaryLabel}
          </a>
          {meta.links
            .filter((l) => l.href !== "#")
            .map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 text-sm font-medium rounded-xl transition-colors"
              >
                {link.label}
              </a>
            ))}
        </div>
      </section>

      {/* Episodes */}
      {meta.episodeSource === "internal" && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Episodes</h2>
          {episodes.length > 0 ? (
            <div className="space-y-3">
              {episodes.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/podcasts/${show}/${ep.slug}`}
                  className="block p-5 bg-white rounded-2xl border border-zinc-100 hover:shadow-md hover:border-zinc-200 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-zinc-900 line-clamp-1">{ep.title}</h3>
                      {ep.description && (
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{ep.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                        {ep.date && (
                          <time dateTime={ep.date}>
                            {new Date(ep.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </time>
                        )}
                        {ep.duration && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <span>{ep.duration}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 italic">Episodes coming soon.</p>
          )}
        </section>
      )}

      {meta.episodeSource === "external" && (
        <section className="mb-12 p-6 border border-zinc-200 rounded-2xl">
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">Where to listen</h2>
          <p className="text-zinc-600 text-sm mb-4">
            New episodes of {meta.title} are published on the host&apos;s native platform. We surface
            related writing here on Autisable, but full episodes live there.
          </p>
          <a
            href={meta.primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-brand-blue hover:underline text-sm font-medium"
          >
            {meta.primaryLabel}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </section>
      )}

      {/* Related blog posts */}
      {relatedPosts.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">Related stories</h2>
          <p className="text-sm text-zinc-500 mb-6">Posts tagged with this show.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {relatedPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}/`}
                className="block p-5 bg-white rounded-xl border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all"
              >
                <h3 className="text-sm font-semibold text-zinc-900 mb-2 line-clamp-2">{post.title}</h3>
                {post.excerpt && (
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{post.excerpt}</p>
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
        </section>
      )}
    </div>
  );
}
