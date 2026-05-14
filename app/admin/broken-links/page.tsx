"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";
import { adminFetch } from "@/app/lib/adminFetch";
import { isBotUserAgent } from "@/app/lib/botDetection";

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
  isBotOnly: boolean;
}

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
}

interface TestResult {
  status: number;
  ok: boolean;
  finalUrl?: string;
  redirected?: boolean;
  error?: string;
  testedAt: number;
}

const FETCH_LIMIT = 1000;

export default function AdminBrokenLinksPage() {
  const [grouped, setGrouped] = useState<GroupedRow[]>([]);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [redirectInputs, setRedirectInputs] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"broken" | "redirects">("broken");
  const [search, setSearch] = useState("");
  const [hideBots, setHideBots] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

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
    // Group by URL. Each group tracks total hits, most recent timestamp,
    // sample referrers/user-agents, and whether every observed UA looks
    // like a bot — admins can hide bot-only rows so real traffic surfaces.
    const map = new Map<string, GroupedRow>();
    const realUACount = new Map<string, number>();
    for (const row of rows) {
      const g = map.get(row.url) || {
        url: row.url,
        count: 0,
        lastSeen: row.created_at,
        referrers: [],
        userAgents: [],
        isBotOnly: true,
      };
      g.count += 1;
      if (row.created_at > g.lastSeen) g.lastSeen = row.created_at;
      if (row.referrer && !g.referrers.includes(row.referrer) && g.referrers.length < 5) {
        g.referrers.push(row.referrer);
      }
      if (row.user_agent && !g.userAgents.includes(row.user_agent) && g.userAgents.length < 3) {
        g.userAgents.push(row.user_agent);
      }
      if (row.user_agent && !isBotUserAgent(row.user_agent)) {
        realUACount.set(row.url, (realUACount.get(row.url) || 0) + 1);
      }
      map.set(row.url, g);
    }
    for (const g of map.values()) {
      g.isBotOnly = (realUACount.get(g.url) || 0) === 0;
    }
    const list = [...map.values()].sort(
      (a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen)
    );
    setGrouped(list);
    setRedirects((redirRes.data || []) as Redirect[]);
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return grouped.filter((g) => {
      if (hideBots && g.isBotOnly) return false;
      if (needle && !g.url.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [grouped, search, hideBots]);

  const hiddenCount = grouped.length - filtered.length;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((g) => selected.has(g.url));

  const toggleOne = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const g of filtered) next.delete(g.url);
        return next;
      }
      const next = new Set(prev);
      for (const g of filtered) next.add(g.url);
      return next;
    });
  };

  const clearSelected = async () => {
    if (!supabase || selected.size === 0) return;
    const urls = [...selected];
    if (!confirm(`Clear all 404 log entries for ${urls.length} URL${urls.length === 1 ? "" : "s"}?`)) {
      return;
    }
    setBusy("__batch__");
    await supabase.from("link_404_log").delete().in("url", urls);
    setBusy(null);
    void load();
  };

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

  const testLink = async (url: string) => {
    setTesting((prev) => new Set(prev).add(url));
    try {
      const res = await adminFetch("/api/admin/test-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [url]: {
          status: data.status ?? 0,
          ok: !!data.ok,
          finalUrl: data.finalUrl,
          redirected: data.redirected,
          error: data.error,
          testedAt: Date.now(),
        },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [url]: {
          status: 0,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          testedAt: Date.now(),
        },
      }));
    } finally {
      setTesting((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
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
                URLs that returned 404, grouped by URL. Higher counts surface first. Use{" "}
                <span className="font-medium">Test link</span> to re-check a URL before adding a redirect —
                if it now returns 200 you can just clear the row.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Bot-only rows are hidden by default. Toggle below to include them.
              </p>
            </>
          ) : (
            <p>
              Active redirects. Middleware reads this table and 301s matching requests. Cached at the edge
              for 60s — new redirects take effect within a minute.
            </p>
          )}
        </div>

        {tab === "broken" && !loading && grouped.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 bg-white border border-zinc-100 rounded-xl p-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by URL fragment (e.g. 'product', '/2019/')"
              className="flex-1 min-w-[220px] px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
            />
            <label className="flex items-center gap-2 text-xs text-zinc-600 select-none">
              <input
                type="checkbox"
                checked={hideBots}
                onChange={(e) => setHideBots(e.target.checked)}
                className="rounded"
              />
              Hide bot-only rows
            </label>
            <div className="text-xs text-zinc-500">
              Showing {filtered.length} of {grouped.length}
              {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
            </div>
            {selected.size > 0 && (
              <button
                onClick={clearSelected}
                disabled={busy === "__batch__"}
                className="ml-auto px-3 py-1.5 text-xs font-medium bg-brand-red hover:bg-brand-red/90 text-white rounded-lg disabled:opacity-50"
              >
                {busy === "__batch__"
                  ? "Clearing…"
                  : `Clear selected (${selected.size})`}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tab === "broken" ? (
          grouped.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">No 404s logged yet. Nice.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              No rows match this filter.
              {hideBots && hiddenCount > 0 && (
                <button
                  onClick={() => setHideBots(false)}
                  className="block mx-auto mt-2 text-xs text-brand-blue hover:underline"
                >
                  Show {hiddenCount} bot-only row{hiddenCount === 1 ? "" : "s"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500 px-2">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  className="rounded"
                  aria-label="Select all visible rows"
                />
                <span>{allFilteredSelected ? "Deselect all visible" : "Select all visible"}</span>
              </div>
              {filtered.map((g) => {
                const inputValue = redirectInputs[g.url] ?? "";
                const isBusy = busy === g.url;
                const isSelected = selected.has(g.url);
                const isTesting = testing.has(g.url);
                const result = testResults[g.url];
                return (
                  <div
                    key={g.url}
                    className={`bg-white rounded-xl border p-5 ${
                      isSelected ? "border-brand-blue" : "border-zinc-100"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(g.url)}
                        className="mt-1 rounded"
                        aria-label={`Select ${g.url}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm text-zinc-900 break-all">{g.url}</p>
                          {g.isBotOnly && (
                            <span className="shrink-0 px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-semibold uppercase tracking-wider rounded-full">
                              bot only
                            </span>
                          )}
                        </div>
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

                    {result && (
                      <div
                        className={`text-xs mb-3 px-3 py-2 rounded-lg border ${
                          result.ok
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-amber-50 border-amber-200 text-amber-800"
                        }`}
                      >
                        <span className="font-semibold">Live check: </span>
                        {result.error ? (
                          <span>request failed — {result.error}</span>
                        ) : (
                          <>
                            HTTP {result.status}
                            {result.redirected && result.finalUrl && (
                              <>
                                {" "}→ <span className="font-mono">{result.finalUrl}</span>
                              </>
                            )}
                            {result.ok && (
                              <span className="ml-2">
                                · this URL now resolves — safe to clear from report.
                              </span>
                            )}
                          </>
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
                        onClick={() => testLink(g.url)}
                        disabled={isTesting}
                        className="px-3 py-1.5 text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg disabled:opacity-50"
                      >
                        {isTesting ? "Testing…" : "Test link"}
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
