"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/app/lib/adminFetch";

interface Total {
  ad_id: string;
  ad_type: "product" | "affiliate";
  impressions: number;
  clicks: number;
  label: string;
}

interface DailyRow {
  date: string;
  impressions: number;
  clicks: number;
}

interface MetricsResponse {
  days: number;
  totals: Total[];
  daily: { product: DailyRow[]; affiliate: DailyRow[] };
}

const DAY_OPTIONS = [7, 30, 90];

export default function AdminAdMetricsPage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/api/admin/ad-metrics?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [days]);

  const productTotals = useMemo(
    () => data?.totals.filter((t) => t.ad_type === "product") || [],
    [data]
  );
  const affiliateTotals = useMemo(
    () => data?.totals.filter((t) => t.ad_type === "affiliate") || [],
    [data]
  );

  const summary = (rows: Total[]) => {
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return { impressions, clicks, ctr };
  };

  const productSummary = summary(productTotals);
  const affiliateSummary = summary(affiliateTotals);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Ad Metrics</h1>
          </div>
          <div className="flex items-center gap-2">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  days === d ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryCard
            title="Products"
            impressions={productSummary.impressions}
            clicks={productSummary.clicks}
            ctr={productSummary.ctr}
          />
          <SummaryCard
            title="Affiliate banners"
            impressions={affiliateSummary.impressions}
            clicks={affiliateSummary.clicks}
            ctr={affiliateSummary.ctr}
          />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">
            Daily — last {data?.days ?? days} day{(data?.days ?? days) === 1 ? "" : "s"}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DailyTable title="Products" rows={data?.daily.product || []} loading={loading} />
            <DailyTable title="Affiliate banners" rows={data?.daily.affiliate || []} loading={loading} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">By ad</h2>
          {loading ? (
            <div className="h-32 bg-white rounded-xl animate-pulse" />
          ) : data && data.totals.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-100 p-6 text-center text-sm text-zinc-500">
              No events recorded in this window yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Ad</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase text-right">Impressions</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase text-right">Clicks</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.totals.map((row) => {
                    const ctr =
                      row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
                    return (
                      <tr key={`${row.ad_type}-${row.ad_id}`} className="border-t border-zinc-50">
                        <td className="px-4 py-3 text-zinc-800 break-all">
                          {row.label || <span className="text-zinc-400 font-mono">{row.ad_id.slice(0, 8)}…</span>}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs uppercase">{row.ad_type}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.clicks.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{ctr.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  impressions,
  clicks,
  ctr,
}: {
  title: string;
  impressions: number;
  clicks: number;
  ctr: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-400 font-medium mb-2">{title}</p>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Impressions" value={impressions.toLocaleString()} />
        <Metric label="Clicks" value={clicks.toLocaleString()} />
        <Metric label="CTR" value={`${ctr.toFixed(2)}%`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 tabular-nums">{value}</p>
    </div>
  );
}

function DailyTable({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: DailyRow[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="h-48 bg-white rounded-xl animate-pulse" />;
  }
  return (
    <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100">
        <p className="text-xs uppercase tracking-wider text-zinc-400 font-medium">{title}</p>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-zinc-500">No events.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-zinc-50/50">
            <tr className="text-left">
              <th className="px-4 py-2 text-[10px] font-medium text-zinc-500 uppercase">Day</th>
              <th className="px-4 py-2 text-[10px] font-medium text-zinc-500 uppercase text-right">Impr.</th>
              <th className="px-4 py-2 text-[10px] font-medium text-zinc-500 uppercase text-right">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-t border-zinc-50">
                <td className="px-4 py-2 text-zinc-700">{r.date}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.clicks.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
