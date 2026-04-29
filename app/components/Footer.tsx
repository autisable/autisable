"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewsletterSignup from "./NewsletterSignup";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

const footerLinks = [
  {
    title: "Content",
    links: [
      { label: "Stories", href: "/blog" },
      { label: "Podcasts", href: "/podcasts" },
      { label: "Music", href: "/music" },
      { label: "Resources", href: "/resources" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Join", href: "/register" },
      { label: "Member Directory", href: "/community/directory" },
      { label: "Activity Feed", href: "/community" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Autisable", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Community Guidelines", href: "/community-guidelines" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
  {
    title: "Podcasts",
    links: [
      { label: "Autisable Dads", href: "/podcasts/autisable-dads" },
      { label: "Hope Saves the Day", href: "/podcasts/hope-saves-the-day" },
      { label: "The Autism Dad", href: "/podcasts/the-autism-dad" },
    ],
  },
];

const SOCIAL_DEFINITIONS = [
  {
    key: "social_facebook",
    label: "Facebook",
    fallback: "https://facebook.com/autisable",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "social_instagram",
    label: "Instagram",
    fallback: "https://instagram.com/autisable",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    key: "social_youtube",
    label: "YouTube",
    fallback: "https://youtube.com/@autisable",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "social_linkedin",
    label: "LinkedIn",
    fallback: "https://linkedin.com/company/autisable",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    key: "social_twitter",
    label: "X",
    fallback: "",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState(
    SOCIAL_DEFINITIONS.filter((s) => s.fallback).map((s) => ({ label: s.label, href: s.fallback, icon: s.icon }))
  );

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", SOCIAL_DEFINITIONS.map((s) => s.key))
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<string, string>();
        data.forEach((row) => map.set(row.key, row.value));
        setSocialLinks(
          SOCIAL_DEFINITIONS
            .map((def) => ({ label: def.label, href: map.get(def.key) || def.fallback, icon: def.icon }))
            .filter((s) => s.href && s.href.trim() !== "")
        );
      });
  }, []);

  return (
    <footer className="bg-zinc-950 text-zinc-400">
      {/* Newsletter Section */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 w-full lg:max-w-xl">
              <h4 className="text-2xl font-bold text-white mb-2">Stay Connected</h4>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Get the latest stories, podcast episodes, and community updates delivered to your inbox.
              </p>
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </div>

      {/* Links Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
          <div className="col-span-2">
            <h3 className="text-lg font-bold text-white mb-2">Autisable</h3>
            <p className="text-sm leading-relaxed mb-6">
              A community and editorial platform for parents, autistic individuals,
              and professionals — sharing stories, resources, and support.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-brand-blue transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {group.title}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p>&copy; {new Date().getFullYear()} Autisable. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Use
            </Link>
            <Link href="/community-guidelines" className="hover:text-white transition-colors">
              Community Guidelines
            </Link>
            <Link href="/accessibility" className="hover:text-white transition-colors">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
