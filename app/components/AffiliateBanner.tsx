import type { Affiliate } from "@/app/lib/pickAffiliate";

interface Props {
  affiliate: Affiliate;
  /** "300x250" = sidebar / inline; "468x60" = compact footer */
  size?: "300x250" | "468x60";
}

const FALLBACK_GRADIENTS = [
  "from-brand-blue/15 to-brand-blue/5 border-brand-blue/20",
  "from-brand-orange/15 to-brand-orange/5 border-brand-orange/20",
  "from-brand-green/15 to-brand-green/5 border-brand-green/20",
];

/**
 * Pure presentational. The picking happens server-side via pickAffiliate so
 * different page loads naturally rotate; this component just renders whatever
 * was chosen. Falls back to a styled text card built from name + tagline + CTA
 * when no banner asset is uploaded yet — the framework is useful before Joel
 * ships banner artwork; admins can swap to image-based banners later via
 * /admin/affiliates without code changes.
 *
 * `rel="sponsored"` flags the link to search engines per Google's affiliate
 * link guidance. "Sponsored" label visible above per FTC requirement.
 */
export default function AffiliateBanner({ affiliate, size = "300x250" }: Props) {
  const bannerUrl = size === "300x250" ? affiliate.banner_300x250_url : affiliate.banner_468x60_url;
  const dims = size === "300x250" ? { w: 300, h: 250 } : { w: 468, h: 60 };

  return (
    <a
      href={affiliate.click_url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="block group not-prose"
      aria-label={`Sponsored: ${affiliate.name}`}
      data-affiliate-slug={affiliate.slug}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-medium">
        Sponsored
      </div>
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bannerUrl}
          alt={affiliate.name}
          width={dims.w}
          height={dims.h}
          // object-cover so non-rectangular source assets (e.g. square FB-Messenger
          // creatives) crop to fit the slot rather than stretching to its aspect ratio.
          className="rounded-lg border border-zinc-100 group-hover:shadow-md transition-shadow object-cover"
          style={{ width: dims.w, height: dims.h }}
        />
      ) : (
        <TextCard affiliate={affiliate} size={size} />
      )}
    </a>
  );
}

function TextCard({ affiliate, size }: { affiliate: Affiliate; size: "300x250" | "468x60" }) {
  // Stable gradient per affiliate — picks based on slug hash so the same
  // partner always gets the same color until they upload a real banner.
  const hash = [...affiliate.slug].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradient = FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];

  if (size === "468x60") {
    return (
      <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border bg-gradient-to-br ${gradient} group-hover:shadow-md transition-shadow`}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{affiliate.name}</p>
          {affiliate.tagline && (
            <p className="text-xs text-zinc-600 truncate">{affiliate.tagline}</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium underline">
          {affiliate.cta_label || "Learn more"} →
        </span>
      </div>
    );
  }

  // 300×250 medium rectangle — proper card with name, tagline, CTA
  return (
    <div
      className={`flex flex-col justify-between p-5 rounded-xl border bg-gradient-to-br ${gradient} group-hover:shadow-md transition-shadow`}
      style={{ width: 300, height: 250 }}
    >
      <div>
        <p className="text-base font-bold text-zinc-900 mb-2">{affiliate.name}</p>
        {affiliate.tagline && (
          <p className="text-sm text-zinc-700 leading-snug">{affiliate.tagline}</p>
        )}
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 self-start group-hover:border-zinc-400 transition-colors">
        {affiliate.cta_label || "Learn more"}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </div>
  );
}
