"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "@/app/lib/supabase-browser";
import SearchOverlay from "./SearchOverlay";

const supabase = getSupabase();
const fallbackNavItems = [
  { label: "Home", href: "/", external: false },
  { label: "Stories", href: "/blog", external: false },
  { label: "Podcasts", href: "/podcasts", external: false },
  { label: "Music", href: "/music", external: false },
  { label: "Community", href: "/community", external: false },
  { label: "Resources", href: "/resources", external: false },
  { label: "About", href: "/about", external: false },
  { label: "Contact", href: "/contact", external: false },
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
    key: "social_twitter",
    label: "X",
    fallback: "",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: "social_patreon",
    label: "Patreon",
    fallback: "",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z" />
      </svg>
    ),
  },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navItems, setNavItems] = useState(fallbackNavItems);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socialLinks, setSocialLinks] = useState(
    SOCIAL_DEFINITIONS.filter((s) => s.fallback).map((s) => ({ label: s.label, href: s.fallback, icon: s.icon }))
  );

  useEffect(() => {
    const loadNavLinks = async () => {
      const { data } = await supabase
        .from("nav_links")
        .select("label, url, is_external")
        .eq("is_visible", true)
        .order("position", { ascending: true });

      if (data && data.length > 0) {
        setNavItems(
          data.map((d) => ({
            label: d.label,
            href: d.url,
            external: d.is_external,
          }))
        );
      }
    };

    const loadSocialLinks = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", SOCIAL_DEFINITIONS.map((s) => s.key));

      if (data) {
        const map = new Map<string, string>();
        data.forEach((row) => map.set(row.key, row.value));
        setSocialLinks(
          SOCIAL_DEFINITIONS
            .map((def) => ({ label: def.label, href: map.get(def.key) || def.fallback, icon: def.icon }))
            .filter((s) => s.href && s.href.trim() !== "")
        );
      }
    };
    void loadSocialLinks();

    const checkAuth = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser({ id: u.id, email: u.email ?? undefined });
        // Fetch unread notification count for the bell badge. Cheap (head=true,
        // no rows returned).
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.id)
          .eq("is_read", false);
        setUnreadCount(count || 0);
      }
    };

    void loadNavLinks();
    void checkAuth();

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-lg shadow-sm border-b border-zinc-200"
          : "bg-white border-b border-zinc-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/Logo.png"
              alt="Autisable"
              width={180}
              height={48}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-brand-blue hover:bg-brand-blue-light rounded-lg transition-colors whitespace-nowrap"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-brand-blue hover:bg-brand-blue-light rounded-lg transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-zinc-500 hover:text-brand-blue transition-colors rounded-lg hover:bg-brand-blue-light"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
            <div className="w-px h-5 bg-zinc-200" />
            <div className="flex items-center gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-brand-blue transition-colors"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
            <div className="w-px h-5 bg-zinc-200" />
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/notifications"
                  className="relative p-1.5 text-zinc-500 hover:text-brand-blue transition-colors"
                  aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-red text-white text-[10px] font-semibold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
                >
                  Dashboard
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue-dark px-4 py-2 rounded-lg transition-colors"
                >
                  Join
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-1 lg:hidden">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-zinc-600 hover:text-brand-blue transition-colors"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-zinc-600 hover:text-brand-blue transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-zinc-200 bg-white">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-base font-medium text-zinc-700 hover:text-brand-blue hover:bg-brand-blue-light rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-base font-medium text-zinc-700 hover:text-brand-blue hover:bg-brand-blue-light rounded-lg transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
            <div className="pt-4 border-t border-zinc-100 space-y-2">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-base font-medium text-brand-blue"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 text-base font-medium text-zinc-700 hover:text-brand-blue hover:bg-brand-blue-light rounded-lg transition-colors"
                  >
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-red text-white text-xs font-semibold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </>
              ) : (
                <div className="flex gap-2 px-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2.5 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2.5 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 px-3 pt-4 border-t border-zinc-100">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-brand-blue transition-colors"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </nav>
      )}

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
