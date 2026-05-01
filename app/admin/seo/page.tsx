"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminFetch } from "@/app/lib/adminFetch";

interface Summary {
  total: number;
  missing_meta_description: number;
  missing_focus_keyword: number;
  missing_og_image: number;
  missing_excerpt: number;
  missing_featured_image: number;
  syndicated_no_canonical: number;
}

interface PostRow {
  id: string;
  slug: string;
  title: string;
  date: string;
  category: string;
  author_name: string | null;
}

const ISSUES = [
  { key: "missing_meta_description", label: "Missing Meta Description", desc: "Posts without a custom SEO description. Google falls back to the excerpt or truncates the article body." },
  { key: "missing_focus_keyword", label: "Missing Focus Keyphrase", desc: "Posts without a primary keyphrase. Limits AI/LLM ability to categorize the post for retrieval." },
  { key: "missing_og_image", label: "Missing OG Image", desc: "Posts without an Open Graph image. Social shares (Facebook, LinkedIn, X) will show no preview image." },
  { key: "missing_excerpt", label: "Missing Excerpt", desc: "Posts without a manual excerpt. Affects how the post appears in listings and AI summaries." },
  { key: "missing_featured_image", label: "Missing Featured Image", desc: "Posts without a hero image. Showing the Autisable logo placeholder." },
  { key: "syndicated_no_canonical", label: "Syndicated, No Canonical", desc: "Posts marked as syndicated but missing a canonical URL — risks duplicate-content penalties." },
];

const SITE_CHECKS = [
  { label: "robots.txt with per-AI-crawler rules", url: "/robots.txt", target: "GPTBot" },
  { label: "llms.txt site summary for LLMs", url: "/llms.txt", target: "Autisable" },
  { label: "XML sitemap covering all 4,084+ posts", url: "/sitemap.xml", target: "<loc>" },
  { label: "RSS feed for syndication", url: "/feed.xml", target: "<item>" },
];

export default function SeoReadinessPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeIssue, setActiveIssue] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [siteChecks, setSiteChecks] = useState<{ label: string; ok: boolean; url: string }[]>([]);

  useEffect(() => {
    adminFetch("/api/admin/seo-audit")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setSummary(data);
      });

    // Run site-level checks
    Promise.all(
      SITE_CHECKS.map(async (check) => {
        try {
          const res = await fetch(check.url);
          const text = await res.text();
          return { label: check.label, ok: res.ok && text.includes(check.target), url: check.url };
        } catch {
          return { label: check.label, ok: false, url: check.url };
        }
      })
    ).then(setSiteChecks);
  }, []);

  const loadIssue = useCallback(async (issue: string) => {
    setActiveIssue(issue);
    setLoadingList(true);
    const res = await adminFetch(`/api/admin/seo-audit?issue=${issue}`);
    const data = await res.json();
    if (data.data) setPosts(data.data);
    setLoadingList(false);
  }, []);

  const total = summary?.total || 0;
  const totalIssues = summary
    ? Object.entries(summary)
        .filter(([k]) => k !== "total")
        .reduce((sum, [, v]) => sum + (v as number), 0)
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">SEO &amp; AI Readiness</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Site-level checks */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider">Site Checks</h2>
          <div className="bg-white rounded-2xl border border-zinc-100 divide-y divide-zinc-50">
            {siteChecks.length === 0
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="px-5 py-3 h-12 animate-pulse bg-zinc-50" />
                ))
              : siteChecks.map((c) => (
                  <div key={c.url} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${c.ok ? "bg-brand-green" : "bg-brand-red"}`} />
                      <span className="text-sm text-zinc-900">{c.label}</span>
                    </div>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue hover:underline">
                      View {c.url}
                    </a>
                  </div>
                ))}
          </div>
        </div>

        {/* Per-post issue summary */}
        <div>
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Post Issues</h2>
            <span className="text-xs text-zinc-500">
              {summary
                ? `${totalIssues.toLocaleString()} issue${totalIssues === 1 ? "" : "s"} across ${total.toLocaleString()} published posts`
                : "Loading…"}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ISSUES.map((issue) => {
              const count = summary ? (summary[issue.key as keyof Summary] as number) : 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const severity = count === 0 ? "good" : pct < 10 ? "minor" : pct < 30 ? "moderate" : "major";
              return (
                <button
                  key={issue.key}
                  onClick={() => loadIssue(issue.key)}
                  className={`text-left p-5 rounded-2xl border transition-all hover:shadow-md ${
                    activeIssue === issue.key
                      ? "border-brand-blue bg-brand-blue-light"
                      : "border-zinc-100 bg-white hover:border-zinc-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-zinc-900">{issue.label}</h3>
                    <span
                      className={`shrink-0 text-2xl font-bold ${
                        severity === "good"
                          ? "text-brand-green"
                          : severity === "minor"
                          ? "text-zinc-500"
                          : severity === "moderate"
                          ? "text-brand-orange"
                          : "text-brand-red"
                      }`}
                    >
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{issue.desc}</p>
                  {count > 0 && (
                    <p className="text-xs text-brand-blue font-medium mt-2">View {Math.min(100, count)} →</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drill-down list */}
        {activeIssue && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider">
              {ISSUES.find((i) => i.key === activeIssue)?.label}
            </h2>
            {loadingList ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-white rounded-lg animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
                <p className="text-brand-green font-medium">All clear ✓</p>
                <p className="text-xs text-zinc-500 mt-1">No posts have this issue.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Title</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Author</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Date</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p) => (
                      <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                        <td className="px-5 py-3 text-sm text-zinc-900 line-clamp-1">{p.title}</td>
                        <td className="px-5 py-3 text-xs text-zinc-500 hidden md:table-cell">{p.author_name || "—"}</td>
                        <td className="px-5 py-3 text-xs text-zinc-400 hidden sm:table-cell">
                          {p.date ? new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/admin/posts/${p.id}`}
                            className="text-xs font-medium text-brand-blue hover:underline"
                          >
                            Fix →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Reference notes */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">What&apos;s already in place</h2>
          <ul className="text-sm text-zinc-600 space-y-2 leading-relaxed list-disc pl-5">
            <li><strong>JSON-LD schemas</strong> — Organization &amp; WebSite on every page; Article &amp; BreadcrumbList &amp; Person on every blog post</li>
            <li><strong>301 redirects</strong> — old WordPress date-based URLs, category, tag, author, pagination, /feed/ all redirect with context preserved</li>
            <li><strong>Server-side rendering</strong> — Home, blog list, and blog posts all return content in static HTML for AI crawlers that don&apos;t execute JavaScript (GPTBot, ClaudeBot, PerplexityBot, CCBot)</li>
            <li><strong>FTC affiliate disclosure</strong> — surfaces above the content on every post</li>
            <li><strong>Canonical URLs</strong> — auto-set per post; respect overrides for syndicated content</li>
            <li><strong>Privacy-safe analytics</strong> — GA4 + first-party behavioral tracking on public pages only; never on /admin or /dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
