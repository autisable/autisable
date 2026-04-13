import { supabaseAdmin } from "@/app/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Comments from "@/app/components/Comments";

interface Props {
  params: Promise<{ show: string; episode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { episode } = await params;
  const { data } = await supabaseAdmin
    .from("podcast_episodes")
    .select("title, description")
    .eq("slug", episode)
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Episode Not Found" };
  return { title: data.title, description: data.description };
}

export const revalidate = 60;

export default async function EpisodePage({ params }: Props) {
  const { show, episode } = await params;
  const { data: ep } = await supabaseAdmin
    .from("podcast_episodes")
    .select("*")
    .eq("slug", episode)
    .eq("show_slug", show)
    .eq("is_published", true)
    .single();

  if (!ep) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/podcasts/${show}`}
        className="inline-flex items-center gap-1 text-brand-blue hover:text-brand-blue-dark text-sm mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to episodes
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 leading-tight tracking-tight mb-4">
        {ep.title}
      </h1>

      <div className="flex items-center gap-3 text-sm text-zinc-500 mb-8">
        {ep.date && (
          <time dateTime={ep.date}>
            {new Date(ep.date).toLocaleDateString("en-US", {
              month: "long",
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

      {/* Embedded Audio Player */}
      {ep.embed_url && (
        <div className="mb-10 rounded-2xl overflow-hidden">
          <iframe
            src={ep.embed_url}
            width="100%"
            height="232"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="border-0"
            title={`Listen to ${ep.title}`}
          />
        </div>
      )}

      {/* Show Notes */}
      {ep.content && (
        <div
          className="prose prose-zinc prose-lg max-w-none mb-10"
          dangerouslySetInnerHTML={{ __html: ep.content }}
        />
      )}

      {ep.description && !ep.content && (
        <div className="prose prose-zinc prose-lg max-w-none mb-10">
          <p>{ep.description}</p>
        </div>
      )}

      {/* Comments */}
      <div className="mt-12 pt-8 border-t border-zinc-200">
        <Comments pageId={ep.id} pageType="podcast" />
      </div>
    </div>
  );
}
