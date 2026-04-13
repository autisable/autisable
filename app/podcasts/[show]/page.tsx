import { supabaseAdmin } from "@/app/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

const showMeta: Record<string, { title: string; description: string; color: string }> = {
  "autisable-dads": {
    title: "Autisable Dads",
    description: "Conversations between fathers navigating autism parenting.",
    color: "from-brand-blue to-brand-blue-dark",
  },
  "hope-saves-the-day": {
    title: "Hope Saves the Day",
    description: "Finding hope in the everyday moments of autism parenting.",
    color: "from-brand-orange to-brand-orange-dark",
  },
  "the-autism-dad": {
    title: "The Autism Dad",
    description: "Rob Gorski shares his family's journey with honesty and heart.",
    color: "from-brand-green to-emerald-700",
  },
};

interface Props {
  params: Promise<{ show: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { show } = await params;
  const meta = showMeta[show];
  if (!meta) return { title: "Podcast Not Found" };
  return { title: meta.title, description: meta.description };
}

export default async function PodcastShowPage({ params }: Props) {
  const { show } = await params;
  const meta = showMeta[show];
  if (!meta) notFound();

  const { data: episodes } = await supabaseAdmin
    .from("podcast_episodes")
    .select("id, slug, title, description, date, duration, audio_url")
    .eq("show_slug", show)
    .eq("is_published", true)
    .order("date", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className={`bg-gradient-to-br ${meta.color} rounded-2xl p-8 sm:p-12 text-white mb-10`}>
        <Link
          href="/podcasts"
          className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          All Podcasts
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{meta.title}</h1>
        <p className="text-white/80 text-lg">{meta.description}</p>
      </div>

      <div className="space-y-4">
        {episodes && episodes.length > 0 ? (
          episodes.map((ep) => (
            <Link
              key={ep.id}
              href={`/podcasts/${show}/${ep.slug}`}
              className="block p-6 bg-white rounded-2xl border border-zinc-100 hover:shadow-md hover:border-zinc-200 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-900 line-clamp-1">{ep.title}</h3>
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
          ))
        ) : (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg">Episodes coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
