import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import MainLayoutShell from "./components/MainLayoutShell";
import Analytics from "./components/Analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Autisable — Community, Stories & Resources for the Autism Community",
    template: "%s | Autisable",
  },
  description:
    "A community and editorial platform for parents, autistic individuals, and professionals — sharing stories, podcasts, resources, and support.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Autisable",
    images: [{ url: "/Logo.png", width: 600, height: 160, alt: "Autisable" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/Logo.png"],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Autisable",
  alternateName: "Autisable.com",
  url: "https://autisable.com",
  logo: "https://autisable.com/Logo.png",
  description:
    "A community and editorial platform for parents, autistic individuals, and professionals — sharing stories, podcasts, resources, and support since 2008.",
  foundingDate: "2008",
  founder: { "@type": "Person", name: "Joel Manzer" },
  sameAs: [
    "https://facebook.com/autisable",
    "https://instagram.com/autisable",
    "https://linkedin.com/company/autisable",
    "https://youtube.com/@autisable",
    "https://www.youtube.com/@AutisableTV",
    "https://open.spotify.com/show/6O9VpAJbgBLc3xn5d0nSl2",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "contact@autisable.com",
    url: "https://autisable.com/contact/",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Autisable",
  url: "https://autisable.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://autisable.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <MainLayoutShell>{children}</MainLayoutShell>
        <Analytics />
      </body>
    </html>
  );
}
