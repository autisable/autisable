"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/login", "/register"];

export default function Analytics() {
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  // Honor privacy: don't load on authenticated/admin pages
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname?.startsWith(p));
  if (!gaId || isPrivate) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}
