"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/app/lib/pickProducts";

interface Props {
  products: Product[];
  pagePath?: string;
}

const STOREFRONT_LABEL: Record<Product["storefront"], string> = {
  bookshop: "Bookshop.org",
  special_learning: "Special Learning",
  amazon: "Amazon",
};

// Inline product showcase. Renders 3-up on desktop, 2-up on tablet,
// 1-up stacked on mobile per the brief — sized so the slot reads like
// a banner ad on phones rather than three stacked product cards in a
// row, which would push content far down the page.
//
// Impressions are fired once per mount via IntersectionObserver: a
// product is counted as "seen" when at least half of its card has
// entered the viewport. Clicks are tracked via the link's onClick — we
// fire the beacon and let the navigation continue (the link still goes
// through normally; the click is logged on a best-effort basis).
export default function ProductGrid({ products, pagePath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!containerRef.current || products.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.productId;
          if (!id || trackedImpressions.current.has(id)) continue;
          trackedImpressions.current.add(id);
          // Beacon-style: fire and forget. We don't await or surface errors
          // from the impression call — metrics are observational, not
          // load-bearing on the user experience.
          void fetch("/api/track/ad", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ad_type: "product",
              event_type: "impression",
              ad_id: id,
              page_path: pagePath || (typeof window !== "undefined" ? window.location.pathname : null),
            }),
            keepalive: true,
          }).catch(() => {});
        }
      },
      { threshold: 0.5 }
    );
    for (const card of containerRef.current.querySelectorAll<HTMLElement>("[data-product-id]")) {
      observer.observe(card);
    }
    return () => observer.disconnect();
  }, [products, pagePath]);

  if (products.length === 0) return null;

  const trackClick = (productId: string) => {
    void fetch("/api/track/ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad_type: "product",
        event_type: "click",
        ad_id: productId,
        page_path: pagePath || (typeof window !== "undefined" ? window.location.pathname : null),
      }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <div className="not-prose my-10" ref={containerRef}>
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2 font-medium text-center">
        Recommended
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.slice(0, 3).map((product) => (
          <a
            key={product.id}
            data-product-id={product.id}
            href={product.click_url}
            onClick={() => trackClick(product.id)}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="group flex flex-col bg-white rounded-xl border border-zinc-100 hover:border-zinc-300 hover:shadow-md transition-all overflow-hidden"
          >
            {product.image_url ? (
              // Plain <img> — product images come from third-party CDNs
              // (Bookshop, Amazon, Special-Learning) where the Next.js
              // image optimizer would need each remote host whitelisted.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full aspect-square object-contain bg-zinc-50 p-3 group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square bg-zinc-50 flex items-center justify-center text-xs text-zinc-400">
                No image
              </div>
            )}
            <div className="p-3 flex-1 flex flex-col">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium mb-1">
                {STOREFRONT_LABEL[product.storefront]}
              </p>
              <p className="text-sm font-semibold text-zinc-900 line-clamp-2 group-hover:text-brand-blue transition-colors flex-1">
                {product.title}
              </p>
              {product.price_label && (
                <p className="text-xs text-zinc-500 mt-2">{product.price_label}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
