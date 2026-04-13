import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import MainLayoutShell from "./components/MainLayoutShell";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <MainLayoutShell>{children}</MainLayoutShell>
      </body>
    </html>
  );
}
