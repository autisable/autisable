"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminFetch } from "@/app/lib/adminFetch";

interface Overview {
  totalUsers: number;
  sessions: number;
  pageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
}

interface PageRow { page: string; title: string; views: number; users: number }
interface SourceRow { source: string; medium: string; sessions: number }
interface DeviceRow { device: string; sessions: number; users: number }
interface CountryRow { country: string; sessions: number; users: number }
interface TimelineRow { date: string; users: number; sessions: number; pageviews: number }

const TABS = ["Overview", "Top Pages", "Sources", "Devices", "Countries", "Timeline"] as const;
type Tab = typeof TABS[number];

export default function GA4AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);

  const fetchMetric = useCallback(async (metric: string) => {
    const url = new URL("/api/admin/ga4", window.location.origin);
    url.searchParams.set("metric", metric);
    url.searchParams.set("days", String(days));
    const res = await adminFetch(url.toString());
    const data = await res.json();
    if (data.configured === false) {
      setNotConfigured(true);
      return null;
    }
    if (data.error && res.status >= 400) {
      setError(data.error);
      return null;
    }
    return data;
  }, [days]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    (async () => {
      try {
        if (tab === "Overview") {
          const data = await fetchMetric("overview");
          if (data) setOverview(data);
        } else if (tab === "Top Pages") {
          const data = await fetchMetric("topPages");
          if (data?.rows) setPages(data.rows);
        } else if (tab === "Sources") {
          const data = await fetchMetric("sources");
          if (data?.rows) setSources(data.rows);
        } else if (tab === "Devices") {
          const data = await fetchMetric("devices");
          if (data?.rows) setDevices(data.rows);
        } else if (tab === "Countries") {
          const data = await fetchMetric("countries");
          if (data?.rows) setCountries(data.rows);
        } else if (tab === "Timeline") {
          const data = await fetchMetric("timeline");
          if (data?.rows) setTimeline(data.rows);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
      setLoading(false);
    })();
  }, [tab, days, fetchMetric]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Google Analytics</h1>
            <span className="px-2 py-0.5 text-[10px] tracking-wide uppercase bg-zinc-100 text-zinc-500 rounded font-medium">GA4</span>
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
        {notConfigured && (
          <div className="bg-brand-orange-light border border-brand-orange/30 rounded-2xl p-5 mb-6">
            <h3 className="font-semibold text-brand-orange mb-2">GA4 not configured</h3>
            <p className="text-sm text-zinc-700 mb-3">Set these environment variables in Vercel:</p>
            <ul className="text-sm text-zinc-700 space-y-1 list-disc pl-6">
              <li><code className="text-xs bg-white px-1 py-0.5 rounded">GA4_PROPERTY_ID</code> — your numeric GA4 Property ID (e.g. 123456789)</li>
              <li><code className="text-xs bg-white px-1 py-0.5 rounded">GA4_SERVICE_ACCOUNT_JSON</code> — full service account JSON key as one line</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-3">
              Create the service account in Google Cloud Console, download the JSON key, then add the service
              account email as a Viewer in GA4 Admin → Property Access Management.
            </p>
          </div>
        )}

        {error && !notConfigured && (
          <div className="bg-brand-red-light border border-brand-red/30 rounded-2xl p-5 mb-6">
            <p className="text-sm text-brand-red">{error}</p>
          </div>
        )}

        {!notConfigured && (
          <>
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total Users", value: overview.totalUsers.toLocaleString() },
                  { label: "Sessions", value: overview.sessions.toLocaleString() },
                  { label: "Pageviews", value: overview.pageviews.toLocaleString() },
                  { label: "Avg Session", value: `${Math.round(overview.avgSessionDuration)}s` },
                  { label: "Bounce Rate", value: `${(overview.bounceRate * 100).toFixed(1)}%` },
                  { label: "Engagement Rate", value: `${(overview.engagementRate * 100).toFixed(1)}%` },
                ].map((s) => (
                  <div key={s.label} className="bg-white p-5 rounded-2xl border border-zinc-100">
                    <p className="text-sm text-zinc-500">{s.label}</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === "Top Pages" && (
              <DataTable
                rows={pages}
                cols={[
                  { header: "Page", get: (r) => <span className="text-zinc-900 truncate block max-w-md">{r.page}</span> },
                  { header: "Title", get: (r) => <span className="text-zinc-500 text-xs truncate block max-w-md">{r.title}</span> },
                  { header: "Views", get: (r) => r.views.toLocaleString(), align: "right" },
                  { header: "Users", get: (r) => r.users.toLocaleString(), align: "right" },
                ]}
              />
            )}

            {tab === "Sources" && (
              <DataTable
                rows={sources}
                cols={[
                  { header: "Source", get: (r) => r.source },
                  { header: "Medium", get: (r) => <span className="text-zinc-500">{r.medium}</span> },
                  { header: "Sessions", get: (r) => r.sessions.toLocaleString(), align: "right" },
                ]}
              />
            )}

            {tab === "Devices" && (
              <DataTable
                rows={devices}
                cols={[
                  { header: "Device", get: (r) => <span className="capitalize">{r.device}</span> },
                  { header: "Sessions", get: (r) => r.sessions.toLocaleString(), align: "right" },
                  { header: "Users", get: (r) => r.users.toLocaleString(), align: "right" },
                ]}
              />
            )}

            {tab === "Countries" && (
              <DataTable
                rows={countries}
                cols={[
                  { header: "Country", get: (r) => r.country },
                  { header: "Sessions", get: (r) => r.sessions.toLocaleString(), align: "right" },
                  { header: "Users", get: (r) => r.users.toLocaleString(), align: "right" },
                ]}
              />
            )}

            {tab === "Timeline" && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <TimelineChart rows={timeline} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DataTable<T>({ rows, cols }: {
  rows: T[];
  cols: { header: string; get: (r: T) => React.ReactNode; align?: "right" | "left" }[];
}) {
  if (rows.length === 0) {
    return <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center text-zinc-400">No data yet</div>;
  }
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-100">
            {cols.map((c) => (
              <th key={c.header} className={`text-${c.align || "left"} text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-zinc-50">
              {cols.map((c, j) => (
                <td key={j} className={`px-5 py-3 text-sm text-${c.align || "left"} ${c.align === "right" ? "text-zinc-900 font-medium" : "text-zinc-700"}`}>
                  {c.get(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineChart({ rows }: { rows: TimelineRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-400 text-center py-8">No data yet</p>;
  const max = Math.max(...rows.map((r) => r.sessions), 1);
  return (
    <>
      <h3 className="text-base font-semibold text-zinc-900 mb-4">Sessions over time</h3>
      <div className="flex items-end gap-1 h-48">
        {rows.map((r, i) => {
          const h = (r.sessions / max) * 100;
          return (
            <div key={i} className="flex-1 group relative">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {r.date}: {r.sessions.toLocaleString()}
              </div>
              <div className="bg-brand-blue rounded-t hover:bg-brand-blue-dark transition-colors" style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
        <span>{rows[0]?.date}</span>
        <span>{rows[rows.length - 1]?.date}</span>
      </div>
    </>
  );
}
