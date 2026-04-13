import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Podcasts",
  description: "Three podcast shows from the Autisable community — conversations that inform, inspire, and connect.",
};

const shows = [
  {
    title: "Autisable Dads",
    slug: "autisable-dads",
    description: "Conversations between fathers navigating autism parenting — raw, real, and supportive. Hosted by Joel Manzer and guests.",
    color: "from-brand-blue to-brand-blue-dark",
  },
  {
    title: "Hope Saves the Day",
    slug: "hope-saves-the-day",
    description: "Finding hope in the everyday moments. Stories of resilience, breakthrough, and the small wins that keep us going.",
    color: "from-brand-orange to-brand-orange-dark",
  },
  {
    title: "The Autism Dad",
    slug: "the-autism-dad",
    description: "Rob Gorski shares his family's journey with autism — honest conversations about the real challenges and joys of parenting.",
    color: "from-brand-green to-emerald-700",
  },
];

export default function PodcastsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Podcasts</h1>
        <p className="mt-3 text-lg text-zinc-600 max-w-2xl">
          Three shows, one mission — voices from the autism community sharing
          conversations that inform, inspire, and connect.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {shows.map((show) => (
          <Link
            key={show.slug}
            href={`/podcasts/${show.slug}`}
            className="group relative rounded-2xl overflow-hidden"
          >
            <div className={`bg-gradient-to-br ${show.color} p-8 sm:p-10 text-white min-h-[280px] flex flex-col justify-end`}>
              <div className="absolute top-6 right-6 opacity-20">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3">{show.title}</h2>
              <p className="text-white/80 text-sm leading-relaxed mb-4">{show.description}</p>
              <div className="inline-flex items-center gap-1 text-sm font-medium text-white/90 group-hover:text-white">
                View episodes
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-zinc-50 rounded-2xl p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-3">Listen Everywhere</h2>
        <p className="text-zinc-600 mb-6 max-w-lg mx-auto">
          Subscribe on your favorite platform so you never miss an episode.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {["Apple Podcasts", "Spotify", "YouTube", "Google Podcasts"].map((platform) => (
            <span
              key={platform}
              className="px-5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700"
            >
              {platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
