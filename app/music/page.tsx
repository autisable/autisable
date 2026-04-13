import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music",
  description: "Original music made for and about the autism community — listen on YouTube and Spotify.",
};

export default function MusicPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Music</h1>
        <p className="mt-3 text-lg text-zinc-600">
          Original music made for and about the autism community.
        </p>
      </div>

      {/* YouTube Playlist Embed */}
      <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-100 mb-8">
        <iframe
          src="https://www.youtube.com/embed/videoseries?list=PLplaceholder"
          width="100%"
          height="100%"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="border-0"
          title="Autisable Music Playlist"
        />
      </div>

      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 mb-8">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-sm text-zinc-600">
            This music was created using AI Music tools, guided by themes and stories
            from the autism community. All tracks are reviewed and selected by Autisable.
          </p>
        </div>
      </div>

      {/* Artist/Producer CTA */}
      <div className="bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Artists & Producers</h2>
        <p className="text-blue-100 mb-6 max-w-lg mx-auto">
          Interested in how this music was created? Want to discuss licensing,
          collaboration, or contributing to the project?
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-blue font-semibold rounded-xl hover:bg-blue-50 transition-colors"
        >
          Get in Touch
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
