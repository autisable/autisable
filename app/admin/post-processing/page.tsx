"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/app/lib/adminFetch";

type OverrideStatus = "ok" | "needs_attention" | "ignored" | null;
type SyndicationSource = "autisable" | "origin" | "missing" | "not_applicable";

interface LogRow {
  post_id: string;
  canonical_present: boolean | null;
  canonical_correct: boolean | null;
  canonical_url: string | null;
  syndication_canonical_source: SyndicationSource;
  sitemap_present: boolean | null;
  gsc_indexed: boolean | null;
  gsc_indexed_checked_at: string | null;
  wayback_archived: boolean | null;
  wayback_snapshot_url: string | null;
  override_status: OverrideStatus;
  override_note: string | null;
  override_at: string | null;
  checked_at: string;
  post: {
    id: string;
    slug: string;
    title: string;
    date: string;
    category: string | null;
    author_name: string | null;
    is_syndicated: boolean | null;
    is_published: boolean | null;
  } | null;
}

function rowNeedsAttention(row: LogRow): boolean {
  if (row.override_status === "ignored" || row.override_status === "ok") return false;
  if (row.override_status === "needs_attention") return true;
  if (row.canonical_present === false) return true;
  if (row.canonical_correct === false) return true;
  if (row.sitemap_present === false) return true;
  if (row.gsc_indexed === false) return true;
  return false;
}

const SOURCE_LABEL: Record<SyndicationSource, string> = {
  autisable: "canonical → autisable",
  origin: "canonical → origin",
  missing: "canonical missing",
  not_applicable: "not syndicated",
};

export default function AdminPostProcessingPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState<"needs_attention" | "ok" | "all">("needs_attention");
  const [loading, setLoading] = useState(true);
  const [batchBusy, setBatchBusy] = useState(false);
  const [recheckBusy, setRecheckBusy] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState<string | null>(null);
  const [overrideNote, setOverrideNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch(`/api/admin/post-processing?filter=${filter}`);
    const data = await res.json();
    setRows((data.data || []) as LogRow[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { needs_attention: 0, ok: 0, all: rows.length };
    for (const r of rows) {
      if (rowNeedsAttention(r)) c.needs_attention += 1;
      else c.ok += 1;
    }
    return c;
  }, [rows]);

  const runBatch = async () => {
    if (
      !confirm(
        "Run indexation checks on the 50 most recent published posts? Each check makes ~3 external API calls."
      )
    )
      return;
    setBatchBusy(true);
    const res = await adminFetch("/api/admin/post-processing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: true }),
    });
    const data = await res.json();
    setBatchBusy(false);
    if (data.ok) {
      void load();
    } else {
      alert(`Batch failed: ${data.error || "unknown"}`);
    }
  };

  const recheck = async (postId: string) => {
    setRecheckBusy(postId);
    await adminFetch("/api/admin/post-processing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    });
    setRecheckBusy(null);
    void load();
  };

  const setOverride = async (postId: string, status: OverrideStatus, note: string | null) => {
    await adminFetch("/api/admin/post-processing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, override_status: status, override_note: note }),
    });
    setOverrideOpen(null);
    setOverrideNote("");
    void load();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Post Processing</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["needs_attention", "ok", "all"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  filter === k ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {k === "needs_attention"
                  ? `Needs attention (${counts.needs_attention})`
                  : k === "ok"
                  ? `OK (${counts.ok})`
                  : `All (${counts.all})`}
              </button>
            ))}
            <button
              onClick={runBatch}
              disabled={batchBusy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-blue hover:bg-brand-blue-dark text-white disabled:opacity-50"
            >
              {batchBusy ? "Running…" : "Run batch (50 posts)"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 p-4 bg-white border border-zinc-100 rounded-xl text-sm text-zinc-600">
          <p>
            Phase 1 — the indexation pillar. Checks canonical correctness, sitemap inclusion, and Wayback
            Machine archival for each post.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            GSC indexed status shows <span className="font-mono">unknown</span> until Search Console API
            credentials are wired (the existing <span className="font-mono">GA4_SERVICE_ACCOUNT_JSON</span> can
            be reused — add its email under Search Console &rarr; Settings &rarr; Users and permissions).
            Priority scoring and EEAT flags are reserved for Phase 2.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            No log entries yet. Click <span className="font-semibold">Run batch</span> to populate.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const needsAttention = rowNeedsAttention(row);
              return (
                <div
                  key={row.post_id}
                  className={`bg-white rounded-xl border p-5 ${
                    needsAttention ? "border-amber-200" : "border-zinc-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">
                        {row.post?.title || (
                          <span className="text-zinc-400 italic">deleted post</span>
                        )}
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-zinc-500">
                        {row.post?.category && <span>{row.post.category}</span>}
                        {row.post?.is_syndicated && (
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-[10px] uppercase tracking-wider">
                            syndicated
                          </span>
                        )}
                        <span>
                          checked{" "}
                          {new Date(row.checked_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {row.post?.slug && (
                          <Link
                            href={`/blog/${row.post.slug}/`}
                            target="_blank"
                            className="text-brand-blue hover:underline"
                          >
                            view &rarr;
                          </Link>
                        )}
                        {row.post?.id && (
                          <Link
                            href={`/admin/posts/${row.post.id}`}
                            className="text-brand-blue hover:underline"
                          >
                            edit &rarr;
                          </Link>
                        )}
                      </div>
                    </div>
                    {row.override_status ? (
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          row.override_status === "ok"
                            ? "bg-green-100 text-green-800"
                            : row.override_status === "needs_attention"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        override: {row.override_status.replace("_", " ")}
                      </span>
                    ) : needsAttention ? (
                      <span className="shrink-0 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Needs attention
                      </span>
                    ) : (
                      <span className="shrink-0 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        OK
                      </span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    <Check
                      label="Canonical present"
                      state={row.canonical_present}
                      detail={row.canonical_url ? row.canonical_url.replace(/^https?:\/\//, "") : "(none)"}
                    />
                    <Check label="Canonical correct" state={row.canonical_correct} detail={SOURCE_LABEL[row.syndication_canonical_source]} />
                    <Check label="In sitemap" state={row.sitemap_present} />
                    <Check
                      label="GSC indexed"
                      state={row.gsc_indexed}
                      detail={row.gsc_indexed === null ? "awaiting GSC API" : undefined}
                    />
                    <Check
                      label="Wayback archived"
                      state={row.wayback_archived}
                      detail={
                        row.wayback_snapshot_url ? (
                          <a
                            href={row.wayback_snapshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-blue hover:underline"
                          >
                            snapshot
                          </a>
                        ) : undefined
                      }
                    />
                  </div>

                  {row.override_note && (
                    <p className="mt-3 text-xs text-zinc-600 italic">
                      Editor note: {row.override_note}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => recheck(row.post_id)}
                      disabled={recheckBusy === row.post_id}
                      className="px-3 py-1.5 text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg disabled:opacity-50"
                    >
                      {recheckBusy === row.post_id ? "Rechecking…" : "Recheck"}
                    </button>
                    {row.override_status !== "ok" && (
                      <button
                        onClick={() => setOverride(row.post_id, "ok", null)}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 rounded-lg"
                      >
                        Mark OK
                      </button>
                    )}
                    {row.override_status !== "needs_attention" && (
                      <button
                        onClick={() => {
                          setOverrideOpen(row.post_id);
                          setOverrideNote(row.override_note || "");
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 rounded-lg"
                      >
                        Flag with note
                      </button>
                    )}
                    {row.override_status !== "ignored" && (
                      <button
                        onClick={() => setOverride(row.post_id, "ignored", null)}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 rounded-lg"
                      >
                        Ignore
                      </button>
                    )}
                    {row.override_status && (
                      <button
                        onClick={() => setOverride(row.post_id, null, null)}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 rounded-lg"
                      >
                        Clear override
                      </button>
                    )}
                  </div>

                  {overrideOpen === row.post_id && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-zinc-700 mb-1">Flag with note</p>
                      <textarea
                        value={overrideNote}
                        onChange={(e) => setOverrideNote(e.target.value)}
                        rows={2}
                        placeholder="Why does this need attention?"
                        className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded resize-none focus:ring-2 focus:ring-brand-blue"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setOverrideOpen(null);
                            setOverrideNote("");
                          }}
                          className="px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setOverride(row.post_id, "needs_attention", overrideNote.trim() || null)}
                          className="px-2.5 py-1 text-xs bg-brand-blue text-white font-medium rounded-md"
                        >
                          Save flag
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Check({
  label,
  state,
  detail,
}: {
  label: string;
  state: boolean | null;
  detail?: React.ReactNode;
}) {
  const tone =
    state === true
      ? "bg-green-50 border-green-200 text-green-800"
      : state === false
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-zinc-50 border-zinc-200 text-zinc-500";
  return (
    <div className={`px-3 py-2 rounded-lg border ${tone}`}>
      <p className="font-semibold">
        {state === true ? "✓" : state === false ? "✗" : "?"} {label}
      </p>
      {detail !== undefined && (
        <p className="text-[11px] mt-0.5 break-all">{detail}</p>
      )}
    </div>
  );
}
