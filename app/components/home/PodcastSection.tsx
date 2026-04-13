import Link from "next/link";

const shows = [
  {
    title: "Autisable Dads",
    description: "Conversations between fathers navigating autism parenting — raw, real, and supportive.",
    href: "/podcasts/autisable-dads",
    color: "from-brand-blue to-brand-blue-dark",
  },
  {
    title: "Hope Saves the Day",
    description: "Finding hope in the everyday moments. Stories of resilience and breakthrough.",
    href: "/podcasts/hope-saves-the-day",
    color: "from-brand-orange to-brand-orange-dark",
  },
  {
    title: "The Autism Dad",
    description: "Rob Gorski shares his family's journey with honesty and heart.",
    href: "/podcasts/the-autism-dad",
    color: "from-brand-green to-emerald-700",
  },
];

export default function PodcastSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange-light text-brand-orange text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
            Listen & Learn
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
            Three Podcasts, One Mission
          </h2>
          <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
            Voices from the autism community — conversations that inform, inspire, and connect.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {shows.map((show) => (
            <Link
              key={show.title}
              href={show.href}
              className="group relative rounded-2xl overflow-hidden"
            >
              <div className={`bg-gradient-to-br ${show.color} p-8 sm:p-10 text-white min-h-[240px] flex flex-col justify-end`}>
                <div className="absolute top-6 right-6 opacity-20">
                  <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">{show.title}</h3>
                <p className="text-white/80 text-sm leading-relaxed">{show.description}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white/90 group-hover:text-white">
                  Listen now
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/podcasts"
            className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            View all podcasts & episodes
          </Link>
        </div>
      </div>
    </section>
  );
}
