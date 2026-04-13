import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music",
  description: "Original music inspired by the autism community — listen on YouTube.",
};

export default function MusicPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Music</h1>
        <p className="mt-3 text-lg text-zinc-600">
          Original music inspired by the autism community.
        </p>
      </div>

      {/* YouTube Playlist Embed */}
      <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-100 mb-8">
        <iframe
          src="https://www.youtube.com/embed/videoseries?list=PLplaceholder"
          width="100%"
          height="100%"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="border-0"
          title="Autisable Music Playlist"
        />
      </div>

      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-sm text-zinc-600">
            Some tracks on this page were created with the assistance of AI music tools.
            All music is curated and approved by the Autisable team.
          </p>
        </div>
      </div>
    </div>
  );
}
