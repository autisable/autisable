"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

type Status = "pending" | "reviewed" | "actioned" | "dismissed";

interface Report {
  id: string;
  reporter_id: string;
  content_type: "activity_feed" | "comment";
  content_id: string;
  reason: string;
  status: Status;
  moderator_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface ContentSnippet {
  preview: string;
  authorName: string | null;
  authorId: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  actioned: "Actioned",
  dismissed: "Dismissed",
};

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-800",
  reviewed: "bg-blue-100 text-blue-800",
  actioned: "bg-green-100 text-green-800",
  dismissed: "bg-zinc-100 text-zinc-500",
};

export default function AdminModerationReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [snippets, setSnippets] = useState<Record<string, ContentSnippet>>({});
  const [reporters, setReporters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | Status | "all">("open");

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("moderation_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (data || []) as Report[];
    setReports(rows);

    // Fetch the referenced content (activity_feed posts + comments) and the
    // reporter display names. Batch by type so we don't N+1 the lookup.
    const feedIds = rows.filter((r) => r.content_type === "activity_feed").map((r) => r.content_id);
    const commentIds = rows.filter((r) => r.content_type === "comment").map((r) => r.content_id);
    const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];

    const nextSnippets: Record<string, ContentSnippet> = {};

    if (feedIds.length > 0) {
      const { data: feedRows } = await supabase
        .from("activity_feed")
        .select("id, user_id, body")
        .in("id", feedIds);
      const userIds = [...new Set((feedRows || []).map((r) => r.user_id))];
      const profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, display_name")
          .in("id", userIds);
        for (const p of profiles || []) profileMap.set(p.id, p.display_name);
      }
      for (const row of feedRows || []) {
        nextSnippets[row.id] = {
          preview: (row.body || "").slice(0, 400),
          authorName: profileMap.get(row.user_id) || null,
          authorId: row.user_id,
        };
      }
    }

    if (commentIds.length > 0) {
      const { data: commentRows } = await supabase
        .from("comments")
        .select("id, name, comment, user_id")
        .in("id", commentIds);
      for (const row of commentRows || []) {
        nextSnippets[row.id] = {
          preview: (row.comment || "").slice(0, 400),
          authorName: row.name || null,
          authorId: row.user_id || null,
        };
      }
    }

    setSnippets(nextSnippets);

    if (reporterIds.length > 0) {
      const { data: reporterProfiles } = await supabase
        .from("user_profiles")
        .select("id, display_name")
        .in("id", reporterIds);
      const m: Record<string, string> = {};
      for (const p of reporterProfiles || []) m[p.id] = p.display_name;
      setReporters(m);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return reports;
    if (statusFilter === "open") {
      return reports.filter((r) => r.status === "pending" || r.status === "reviewed");
    }
    return reports.filter((r) => r.status === statusFilter);
  }, [reports, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<Status | "open" | "all", number> = {
      pending: 0,
      reviewed: 0,
      actioned: 0,
      dismissed: 0,
      open: 0,
      all: reports.length,
    };
    for (const r of reports) {
      c[r.status] += 1;
      if (r.status === "pending" || r.status === "reviewed") c.open += 1;
    }
    return c;
  }, [reports]);

  const setStatus = async (id: string, status: Status) => {
    if (!supabase) return;
    setBusy(id);
    const patch = {
      status,
      reviewed_at: new Date().toISOString(),
    };
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await supabase.from("moderation_reports").update(patch).eq("id", id);
    setBusy(null);
  };

  const deleteContent = async (report: Report) => {
    if (!supabase) return;
    if (
      !confirm(
        `Delete this ${report.content_type === "activity_feed" ? "status update" : "comment"}? This cannot be undone.`
      )
    )
      return;
    setBusy(report.id);
    const table = report.content_type === "activity_feed" ? "activity_feed" : "comments";
    const { error } = await supabase.from(table).delete().eq("id", report.content_id).select("id");
    if (error) {
      alert(`Delete failed: ${error.message}`);
      setBusy(null);
      return;
    }
    // Mark report actioned once the underlying content is gone.
    await supabase
      .from("moderation_reports")
      .update({ status: "actioned", reviewed_at: new Date().toISOString() })
      .eq("id", report.id);
    setBusy(null);
    void load();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Moderation Reports</h1>
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["open", "pending", "reviewed", "actioned", "dismissed", "all"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setStatusFilter(k)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  statusFilter === k ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {k === "open"
                  ? `Open (${counts.open})`
                  : k === "all"
                  ? `All (${counts.all})`
                  : `${STATUS_LABEL[k]} (${counts[k]})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No reports in this view.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => {
              const snippet = snippets[report.content_id];
              return (
                <div key={report.id} className="bg-white rounded-xl border border-zinc-100 p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 mb-1">
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full uppercase tracking-wider text-[10px] font-medium">
                          {report.content_type === "activity_feed" ? "Status update" : "Comment"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-medium ${STATUS_STYLE[report.status]}`}>
                          {STATUS_LABEL[report.status]}
                        </span>
                        <span>·</span>
                        <span>
                          Reported{" "}
                          {new Date(report.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>·</span>
                        <span>By {reporters[report.reporter_id] || "Unknown reporter"}</span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">{report.reason}</p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 text-sm text-zinc-700 mb-3">
                    {snippet ? (
                      <>
                        <p className="whitespace-pre-wrap">{snippet.preview}</p>
                        <p className="mt-2 text-xs text-zinc-500">
                          {snippet.authorName ? `By ${snippet.authorName}` : "Author unknown"}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs italic text-zinc-500">
                        Content unavailable — may already be deleted.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100">
                    {report.status !== "actioned" && (
                      <button
                        onClick={() => void deleteContent(report)}
                        disabled={busy === report.id || !snippet}
                        className="px-3 py-1.5 text-xs font-medium bg-brand-red hover:bg-brand-red/90 text-white rounded-lg disabled:opacity-50"
                      >
                        Delete content + mark actioned
                      </button>
                    )}
                    {report.status !== "reviewed" && report.status !== "actioned" && (
                      <button
                        onClick={() => setStatus(report.id, "reviewed")}
                        disabled={busy === report.id}
                        className="px-3 py-1.5 text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg disabled:opacity-50"
                      >
                        Mark reviewed
                      </button>
                    )}
                    {report.status !== "dismissed" && (
                      <button
                        onClick={() => setStatus(report.id, "dismissed")}
                        disabled={busy === report.id}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 rounded-lg disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
