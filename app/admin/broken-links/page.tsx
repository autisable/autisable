"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface LogRow {
  id: string;
  url: string;
  referrer: string | null;
  user_agent: string | null;
  created_at: string;
}

interface GroupedRow {
  url: string;
  count: number;
  lastSeen: string;
  referrers: string[];
  userAgents: string[];
}

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
}

const FETCH_LIMIT = 1000;

export default function AdminBrokenLinksPage() {
  const [grouped, setGrouped] = useState<GroupedRow[]>([]);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [redirectInputs, setRedirectInputs] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"broken" | "redirects">("broken");

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    // Pull recent log rows + all existing redirects in parallel. 1000-row cap
    // is enough to surface high-impact broken links; if you ever exceed it,
    // pagination is an easy follow-up.
    const [logRes, redirRes] = await Promise.all([
      supabase
        .from("link_404_log")
        .select("id, url, referrer, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(FETCH_LIMIT),
      supabase
        .from("redirects")
        .select("id, from_path, to_path, status_code")
        .order("from_path", { ascending: true }),
    ]);

    const rows = (logRes.data || []) as LogRow[];
    // Group by URL. Each group keeps a count, the most-recent timestamp, and
    // up to 5 distinct referrers / user-agents so the editor can spot whether
    // a 404 is real traffic vs a bot scan without scrolling raw rows.
    const map = new Map<string, GroupedRow>();
    for (const row of rows) {
      const g = map.get(row.url) || {
        url: row.url,
        count: 0,
        lastSeen: row.created_at,
        referrers: [],
        userAgents: [],
      };
      g.count += 1;
      if (row.created_at > g.lastSeen) g.lastSeen = row.created_at;
      if (row.referrer && !g.referrers.includes(row.referrer) && g.referrers.length < 5) {
        g.referrers.push(row.referrer);
      }
      if (row.user_agent && !g.userAgents.includes(row.user_agent) && g.userAgents.length < 3) {
        g.userAgents.push(row.user_agent);
      }
      map.set(row.url, g);
    }
    const list = [...map.values()].sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen));
    setGrouped(list);
    setRedirects((redirRes.data || []) as Redirect[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addRedirect = async (fromPath: string) => {
    if (!supabase) return;
    const toPath = redirectInputs[fromPath]?.trim();
    if (!toPath) {
      alert("Enter a destination path or URL.");
      return;
    }
    setBusy(fromPath);
    const { error } = await supabase
      .from("redirects")
      .insert({ from_path: fromPath, to_path: toPath, status_code: 301 })
      .select("id")
      .single();
    if (error) {
      alert(`Could not save redirect: ${error.message}`);
      setBusy(null);
      return;
    }
    // Clear log entries for this URL — future hits go through the redirect
    // and won't 404 anymore. Old log rows would just clutter the queue.
    await supabase.from("link_404_log").delete().eq("url", fromPath);
    setBusy(null);
    setRedirectInputs((prev) => {
      const next = { ...prev };
      delete next[fromPath];
      return next;
    });
    void load();
  };

  const clearLogForUrl = async (url: string) => {
    if (!supabase) return;
    if (!confirm(`Clear all 404 log entries for "${url}"?`)) return;
    setBusy(url);
    await supabase.from("link_404_log").delete().eq("url", url);
    setBusy(null);
    void load();
  };

  const removeRedirect = async (id: string, fromPath: string) => {
    if (!supabase) return;
    if (!confirm(`Remove redirect for "${fromPath}"?`)) return;
    setBusy(id);
    await supabase.from("redirects").delete().eq("id", id);
    setBusy(null);
    void load();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Broken Links &amp; Redirects</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("broken")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === "broken" ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              404s ({grouped.length})
            </button>
            <button
              onClick={() => setTab("redirects")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === "redirects" ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Redirects ({redirects.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 p-4 bg-white border border-zinc-100 rounded-xl text-sm text-zinc-600">
          {tab === "broken" ? (
            <>
              <p>
                URLs that returned 404 in the last {grouped.length > 0 ? "session" : "while"}, grouped by URL.
                Higher counts surface first.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                For each row you can: (a) add a 301 redirect inline (takes effect within ~60s; future hits
                bypass the 404 and the row disappears from this list), or (b) clear the log entries if you
                fixed the source link or it&apos;s noise from a bot scan.
              </p>
            </>
          ) : (
            <p>
              Active redirects. Middleware reads this table and 301s matching requests. Cached at the edge
              for 60s — new redirects take effect within a minute.
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tab === "broken" ? (
          grouped.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">No 404s logged yet. Nice.</div>
          ) : (
            <div className="space-y-3">
              {grouped.map((g) => {
                const inputValue = redirectInputs[g.url] ?? "";
                const isBusy = busy === g.url;
                return (
                  <div key={g.url} className="bg-white rounded-xl border border-zinc-100 p-5">
                    <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm text-zinc-900 break-all">{g.url}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {g.count.toLocaleString()} {g.count === 1 ? "hit" : "hits"} · last seen{" "}
                          {new Date(g.lastSeen).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 bg-brand-red-light text-brand-red text-xs font-bold rounded-full">
                        {g.count.toLocaleString()}
                      </span>
                    </div>

                    {(g.referrers.length > 0 || g.userAgents.length > 0) && (
                      <div className="text-xs text-zinc-500 mb-3 space-y-1">
                        {g.referrers.length > 0 && (
                          <div>
                            <span className="font-medium text-zinc-600">Referrers: </span>
                            {g.referrers.map((r, i) => (
                              <span key={i}>
                                {i > 0 && ", "}
                                <a href={r} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                                  {r.length > 80 ? r.slice(0, 80) + "…" : r}
                                </a>
                              </span>
                            ))}
                          </div>
                        )}
                        {g.userAgents.length > 0 && (
                          <div>
                            <span className="font-medium text-zinc-600">User agents: </span>
                            <span className="text-zinc-500 italic">
                              {g.userAgents.map((u) => (u.length > 60 ? u.slice(0, 60) + "…" : u)).join(" · ")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) =>
                          setRedirectInputs((prev) => ({ ...prev, [g.url]: e.target.value }))
                        }
                        placeholder="Redirect to (e.g. /blog/best-matching-post/)"
                        className="flex-1 min-w-[260px] px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                      />
                      <button
                        onClick={() => addRedirect(g.url)}
                        disabled={isBusy || !inputValue.trim()}
                        className="px-3 py-1.5 text-xs font-medium bg-brand-blue hover:bg-brand-blue-dark text-white rounded-lg disabled:opacity-50"
                      >
                        {isBusy ? "Saving…" : "Add 301 redirect"}
                      </button>
                      <button
                        onClick={() => clearLogForUrl(g.url)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 rounded-lg disabled:opacity-50"
                      >
                        Clear log
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : redirects.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No redirects yet.</div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">From</th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">To</th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 w-20">Status</th>
                  <th className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {redirects.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-700 break-all">{r.from_path}</td>
                    <td className="px-5 py-3 font-mono text-xs text-zinc-700 break-all">{r.to_path}</td>
                    <td className="px-5 py-3 text-xs text-zinc-500">{r.status_code}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => removeRedirect(r.id, r.from_path)}
                        disabled={busy === r.id}
                        className="text-xs text-brand-red hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
