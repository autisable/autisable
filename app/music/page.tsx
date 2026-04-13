import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music",
  description: "Original music made for and about the autism community — listen on Spotify and YouTube.",
};

export default function MusicPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Music</h1>
        <p className="mt-3 text-lg text-zinc-600">
          Original music made for and about the autism community.
        </p>
      </div>

      {/* Spotify Artist Embed - primary player */}
      <div className="rounded-2xl overflow-hidden mb-6">
        <iframe
          src="https://open.spotify.com/embed/artist/1eyxJ7o9D9CmXYFFBidmLv?utm_source=generator&theme=0"
          width="100%"
          height="352"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="border-0 rounded-xl"
          title="Autisable on Spotify"
        />
      </div>

      {/* YouTube Music Videos */}
      <div className="rounded-2xl overflow-hidden mb-6">
        <iframe
          src="https://www.youtube.com/embed?listType=uploads&list=UU7MGyNNQ_Z12b5fHFWZj05w"
          width="100%"
          height="315"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="border-0 rounded-xl"
          title="Autisable Music Videos on YouTube"
        />
      </div>

      {/* Platform links */}
      <div className="flex justify-center gap-3 mb-12">
        <a
          href="https://open.spotify.com/artist/1eyxJ7o9D9CmXYFFBidmLv"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1DB954] hover:bg-[#1aa34a] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          Spotify
        </a>
        <a
          href="https://www.youtube.com/@AutisableTV"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          YouTube
        </a>
      </div>

      {/* AI Disclosure */}
      <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100 mb-10">
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

      {/* Artists & Producers CTA */}
      <div className="bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-2xl p-8 sm:p-10 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Artists & Producers</h2>
        <p className="text-blue-100 mb-6 max-w-md mx-auto">
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
