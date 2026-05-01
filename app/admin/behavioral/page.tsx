"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminFetch } from "@/app/lib/adminFetch";

interface Overview {
  sessions: number;
  pageviews: number;
  clicks: number;
  rage_clicks: number;
  dead_clicks: number;
}

interface PageStat {
  page_path: string;
  pageviews: number;
  unique_sessions: number;
}

interface FrictionRow {
  page_path: string;
  count: number;
  top_selectors: { selector: string; count: number }[];
}

interface FlowRow { from_page: string; to_page: string; transitions: number }
interface ScrollRow { page_path: string; depth: number; session_count: number }
interface CtaRow { href: string; count: number; page_count: number }
interface FunnelStep { step: string; count: number }

const TABS = ["Overview", "Pages", "Heatmap", "Friction", "Funnels", "Flow", "CTAs", "Scroll"] as const;
type Tab = typeof TABS[number];

export default function BehavioralAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pages, setPages] = useState<PageStat[]>([]);
  const [rageClicks, setRageClicks] = useState<FrictionRow[]>([]);
  const [deadClicks, setDeadClicks] = useState<FrictionRow[]>([]);
  const [flow, setFlow] = useState<FlowRow[]>([]);
  const [scroll, setScroll] = useState<ScrollRow[]>([]);
  const [ctas, setCtas] = useState<CtaRow[]>([]);
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
  const [funnelName, setFunnelName] = useState("");
  const [heatmapPage, setHeatmapPage] = useState("/");
  const [heatmapPoints, setHeatmapPoints] = useState<{ x: number; y: number; vw: number; vh: number; click_count: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMetric = useCallback(
    async (metric: string, extra: Record<string, string> = {}) => {
      const url = new URL("/api/admin/behavioral", window.location.origin);
      url.searchParams.set("metric", metric);
      url.searchParams.set("days", String(days));
      Object.entries(extra).forEach(([k, v]) => url.searchParams.set(k, v));
      const res = await adminFetch(url.toString());
      if (!res.ok) return null;
      return await res.json();
    },
    [days]
  );

  useEffect(() => {
    setLoading(true);
    (async () => {
      if (tab === "Overview") {
        const data = await fetchMetric("overview");
        if (data) setOverview(data);
      } else if (tab === "Pages") {
        const data = await fetchMetric("pages");
        if (data?.data) setPages(data.data);
      } else if (tab === "Friction") {
        const [rage, dead] = await Promise.all([fetchMetric("rage_clicks"), fetchMetric("dead_clicks")]);
        if (rage?.data) setRageClicks(rage.data);
        if (dead?.data) setDeadClicks(dead.data);
      } else if (tab === "Flow") {
        const data = await fetchMetric("session_flow");
        if (data?.data) setFlow(data.data);
      } else if (tab === "Scroll") {
        const data = await fetchMetric("scroll_depth");
        if (data?.data) setScroll(data.data);
      } else if (tab === "CTAs") {
        const data = await fetchMetric("cta_rankings");
        if (data?.data) setCtas(data.data);
      } else if (tab === "Funnels") {
        const data = await fetchMetric("funnel", { name: funnelName });
        if (data?.steps) {
          setFunnelSteps(data.steps);
          if (!funnelName && data.name) setFunnelName(data.name);
        }
      } else if (tab === "Heatmap") {
        const url = new URL("/api/admin/heatmap", window.location.origin);
        url.searchParams.set("page", heatmapPage);
        url.searchParams.set("days", String(days));
        const res = await adminFetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setHeatmapPoints(data.data || []);
        }
      }
      setLoading(false);
    })();
  }, [tab, days, funnelName, heatmapPage, fetchMetric]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Behavioral Analytics</h1>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-brand-blue text-white" : "bg-white text-zinc-600 border border-zinc-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="text-zinc-400 text-sm mb-4">Loading…</div>}

        {tab === "Overview" && overview && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Sessions", value: overview.sessions, color: "text-brand-blue" },
              { label: "Pageviews", value: overview.pageviews, color: "text-zinc-700" },
              { label: "Clicks", value: overview.clicks, color: "text-zinc-700" },
              { label: "Rage Clicks", value: overview.rage_clicks, color: "text-brand-red" },
              { label: "Dead Clicks", value: overview.dead_clicks, color: "text-brand-orange" },
            ].map((s) => (
              <div key={s.label} className="bg-white p-5 rounded-2xl border border-zinc-100">
                <p className="text-sm text-zinc-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "Pages" && (
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Page</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Pageviews</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.page_path} className="border-b border-zinc-50">
                    <td className="px-5 py-3 text-sm text-zinc-900 truncate max-w-md">{p.page_path}</td>
                    <td className="px-5 py-3 text-sm text-right text-zinc-700">{p.pageviews.toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm text-right text-zinc-500">{p.unique_sessions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Heatmap" && (
          <div>
            <div className="bg-white rounded-2xl border border-zinc-100 p-4 mb-4">
              <label className="text-xs font-medium text-zinc-500 mr-2">Page:</label>
              <input
                type="text"
                value={heatmapPage}
                onChange={(e) => setHeatmapPage(e.target.value)}
                placeholder="/blog/some-slug/"
                className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm w-72"
              />
              <span className="ml-3 text-xs text-zinc-400">{heatmapPoints.reduce((sum, p) => sum + p.click_count, 0)} clicks</span>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden relative" style={{ height: "70vh" }}>
              <iframe
                src={`${heatmapPage}?_heatmap=1`}
                className="w-full h-full border-0"
                title="Heatmap preview"
              />
              <HeatmapOverlay points={heatmapPoints} />
            </div>
          </div>
        )}

        {tab === "Friction" && (
          <div className="grid md:grid-cols-2 gap-6">
            <FrictionPanel title="Rage Clicks" rows={rageClicks} accent="text-brand-red" />
            <FrictionPanel title="Dead Clicks" rows={deadClicks} accent="text-brand-orange" />
          </div>
        )}

        {tab === "Funnels" && (
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <h3 className="text-base font-semibold text-zinc-900 mb-4">{funnelName || "Funnel"}</h3>
            <div className="space-y-3">
              {funnelSteps.map((s, i) => {
                const max = funnelSteps[0]?.count || 1;
                const pct = (s.count / max) * 100;
                const drop = i > 0 && funnelSteps[i - 1].count > 0
                  ? Math.round((1 - s.count / funnelSteps[i - 1].count) * 100)
                  : null;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-zinc-900">{s.step}</span>
                      <span className="text-zinc-500">
                        {s.count.toLocaleString()}{drop !== null && drop > 0 && <span className="ml-2 text-brand-red">−{drop}%</span>}
                      </span>
                    </div>
                    <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "Flow" && (
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">From</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">To</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Transitions</th>
                </tr>
              </thead>
              <tbody>
                {flow.map((f, i) => (
                  <tr key={i} className="border-b border-zinc-50">
                    <td className="px-5 py-3 text-sm text-zinc-700 truncate max-w-xs">{f.from_page}</td>
                    <td className="px-5 py-3 text-sm text-zinc-700 truncate max-w-xs">{f.to_page}</td>
                    <td className="px-5 py-3 text-sm text-right text-zinc-500">{f.transitions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "CTAs" && (
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">CTA Destination</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Clicks</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">From Pages</th>
                </tr>
              </thead>
              <tbody>
                {ctas.map((c) => (
                  <tr key={c.href} className="border-b border-zinc-50">
                    <td className="px-5 py-3 text-sm text-zinc-700 truncate max-w-md">{c.href}</td>
                    <td className="px-5 py-3 text-sm text-right text-zinc-900 font-medium">{c.count.toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm text-right text-zinc-500">{c.page_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Scroll" && (
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <ScrollDepthChart rows={scroll} />
          </div>
        )}
      </div>
    </div>
  );
}

function FrictionPanel({ title, rows, accent }: { title: string; rows: FrictionRow[]; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100">
        <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
      </div>
      <div className="divide-y divide-zinc-50">
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-400">No data yet</div>
        ) : (
          rows.slice(0, 15).map((r) => (
            <div key={r.page_path} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-900 truncate max-w-xs">{r.page_path}</span>
                <span className={`text-sm font-bold ${accent}`}>{r.count}</span>
              </div>
              {r.top_selectors[0] && (
                <p className="text-xs text-zinc-400 mt-1 truncate">on {r.top_selectors[0].selector}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScrollDepthChart({ rows }: { rows: ScrollRow[] }) {
  // Aggregate rows by depth across all pages
  const byDepth = new Map<number, number>();
  for (const r of rows) {
    byDepth.set(r.depth, (byDepth.get(r.depth) || 0) + r.session_count);
  }
  const depths = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const max = Math.max(...depths.map((d) => byDepth.get(d) || 0), 1);

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-zinc-900 mb-4">Scroll Depth Distribution</h3>
      {depths.map((d) => {
        const count = byDepth.get(d) || 0;
        const pct = (count / max) * 100;
        return (
          <div key={d} className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-12">{d}%</span>
            <div className="flex-1 h-5 bg-zinc-100 rounded overflow-hidden">
              <div className="h-full bg-brand-blue" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-zinc-700 w-16 text-right">{count.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function HeatmapOverlay({ points }: { points: { x: number; y: number; vw: number; vh: number; click_count: number }[] }) {
  // Simple SVG overlay — points scaled to overlay container
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1 1">
      {points.map((p, i) => {
        const cx = p.vw > 0 ? p.x / p.vw : 0;
        const cy = p.vh > 0 ? p.y / p.vh : 0;
        const r = Math.min(0.04, 0.005 + p.click_count * 0.002);
        const opacity = Math.min(0.6, 0.15 + p.click_count * 0.05);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="rgb(196, 70, 58)"
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
