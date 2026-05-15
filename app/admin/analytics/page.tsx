import Link from "next/link";

// Numeric GA4 property ID for autisable.com. Hardcoded because this
// admin page deep-links into Joel's specific GA property; if the
// project ever multi-tenants, lift this to NEXT_PUBLIC_GA4_PROPERTY_ID.
const GA4_PROPERTY_ID = "308292169";
const GA_DASHBOARD_URL = `https://analytics.google.com/analytics/web/#/p${GA4_PROPERTY_ID}/reports/intelligenthome`;

export default function GA4AnalyticsPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">Google Analytics</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Analytics live in Google&apos;s dashboard</h2>
          <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto">
            Traffic, sources, devices, top pages, and timelines are all in Google Analytics
            directly. Tap below to open the Autisable property.
          </p>
          <a
            href={GA_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
          >
            Open Google Analytics
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
