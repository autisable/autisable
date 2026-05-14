"use client";

import { useEffect, useRef } from "react";

interface Props {
  adId: string;
  adType: "product" | "affiliate";
  pagePath?: string;
  children: React.ReactNode;
}

// Wraps a banner or product card and fires impression + click events to
// /api/track/ad. Impression fires once per mount when the element first
// crosses 50% into the viewport; click fires via bubbled onClick on the
// wrapper div so the original link continues navigating normally — the
// fetch uses keepalive so it survives the navigation.
//
// Designed for use around AffiliateBanner (where the underlying click
// is an <a target="_blank">), but works for anything that bubbles a
// click event.
export default function TrackedAdSlot({ adId, adType, pagePath, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const impressionFired = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !impressionFired.current) {
            impressionFired.current = true;
            void fetch("/api/track/ad", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ad_type: adType,
                event_type: "impression",
                ad_id: adId,
                page_path: pagePath || window.location.pathname,
              }),
              keepalive: true,
            }).catch(() => {});
          }
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [adId, adType, pagePath]);

  const handleClick = () => {
    void fetch("/api/track/ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad_type: adType,
        event_type: "click",
        ad_id: adId,
        page_path: pagePath || (typeof window !== "undefined" ? window.location.pathname : null),
      }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <div ref={ref} onClick={handleClick}>
      {children}
    </div>
  );
}
