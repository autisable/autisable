import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue-light via-white to-brand-orange-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              Serving the autism community since 2008
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 leading-tight tracking-tight">
              18 Years of Community.{" "}
              <span className="text-brand-blue">Still Connecting.</span> Still Growing.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl leading-relaxed">
              Stories, podcasts, and resources from parents, autistic individuals,
              and professionals — all in one place. Join a community built on
              understanding, not judgment.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link
                href="/blog"
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/30 text-center"
              >
                Start with a Story
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold rounded-xl border border-zinc-200 transition-colors text-center"
              >
                Join the Community
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-8 justify-center lg:justify-start text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                18 years strong
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                70+ contributors
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                3 podcast shows
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 hidden lg:block">
            <div className="relative w-80 h-80">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-brand-orange/20 rounded-3xl rotate-6" />
              <div className="absolute inset-0 bg-white rounded-3xl shadow-xl flex items-center justify-center p-8">
                <Image
                  src="/Logo.png"
                  alt="Autisable"
                  width={280}
                  height={80}
                  className="w-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
    </section>
  );
}
