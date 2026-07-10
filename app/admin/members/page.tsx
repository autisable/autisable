"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";
import { adminFetch } from "@/app/lib/adminFetch";
import { ROLES, ROLE_LABEL, ROLE_DESCRIPTION, type Role } from "@/app/lib/roles";

const supabase = getSupabase();
interface Member {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
}

interface AuthorLite {
  id: string;
  display_name: string;
  user_profile_id: string | null;
}

// Sentinel for the "create a new authors row for this member" option in the
// byline dropdown — kept out of the uuid value space.
const CREATE_AUTHOR = "__create__";

const STATUS_OPTIONS = [
  { value: "pending_approval", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "removed", label: "Removed" },
];

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const [loading, setLoading] = useState(true);
  // Per-row save state so multiple admins can edit different rows in parallel
  // without one row's spinner blocking the rest of the table.
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Map<string, string>>(new Map());
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  // Author byline linking. authors.user_profile_id is the source of truth;
  // this page just offers the member-side view of the same link that
  // /admin/authors manages from the author side.
  const [authors, setAuthors] = useState<AuthorLite[]>([]);
  const [linkSavingId, setLinkSavingId] = useState<string | null>(null);

  const loadAuthors = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("authors")
      .select("id, display_name, user_profile_id")
      .order("display_name")
      .limit(1000);
    if (data) setAuthors(data as AuthorLite[]);
  };

  useEffect(() => {
    void loadAuthors();
  }, []);

  const setRowError = (memberId: string, message: string | null) => {
    setErrorById((prev) => {
      const next = new Map(prev);
      if (message) next.set(memberId, message);
      else next.delete(memberId);
      return next;
    });
  };

  /**
   * Link/unlink an author byline for a member. Writes authors.user_profile_id
   * directly (RLS: editor/admin ALL policy from docs/authors-user-profile-link.sql).
   * `.select()` on every write so an RLS rejection surfaces instead of the
   * silent-failure pattern we've been bitten by before.
   */
  const updateAuthorLink = async (member: Member, value: string) => {
    if (!supabase) return;
    setLinkSavingId(member.id);
    setRowError(member.id, null);

    const current = authors.find((a) => a.user_profile_id === member.id) || null;

    try {
      // Create a fresh authors row for this member
      if (value === CREATE_AUTHOR) {
        const { data, error } = await supabase
          .from("authors")
          .insert({ display_name: member.display_name, user_profile_id: member.id })
          .select("id, display_name, user_profile_id");
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) throw new Error("Insert blocked — apply docs/authors-user-profile-link.sql (editor/admin policy on authors).");
        // If the member already had a different linked author, unlink it so
        // resolveAuthor and the member page have a single byline identity.
        if (current && current.id !== data[0].id) {
          await supabase.from("authors").update({ user_profile_id: null }).eq("id", current.id).select("id");
        }
        await loadAuthors();
        return;
      }

      // Unlink
      if (value === "") {
        if (current) {
          const { data, error } = await supabase
            .from("authors")
            .update({ user_profile_id: null })
            .eq("id", current.id)
            .select("id");
          if (error) throw new Error(error.message);
          if (!data || data.length === 0) throw new Error("Unlink blocked by RLS — apply docs/authors-user-profile-link.sql.");
        }
        await loadAuthors();
        return;
      }

      // Link an existing author row
      const target = authors.find((a) => a.id === value);
      if (!target) return;
      if (target.user_profile_id && target.user_profile_id !== member.id) {
        const ok = confirm(
          `"${target.display_name}" is already linked to another member. Move the link to ${member.display_name}?`
        );
        if (!ok) return;
      }
      const { data, error } = await supabase
        .from("authors")
        .update({ user_profile_id: member.id })
        .eq("id", target.id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error("Link blocked by RLS — apply docs/authors-user-profile-link.sql.");
      // One byline identity per member: unlink any previous author row.
      if (current && current.id !== target.id) {
        await supabase.from("authors").update({ user_profile_id: null }).eq("id", current.id).select("id");
      }
      await loadAuthors();
    } catch (e) {
      setRowError(member.id, (e as Error).message);
    } finally {
      setLinkSavingId(null);
    }
  };

  const runFollowBackfill = async () => {
    if (backfillRunning) return;
    if (!confirm("Make the site owner mutual-follow every active member? Safe to re-run.")) return;
    setBackfillRunning(true);
    setBackfillStatus("Running...");
    try {
      const res = await adminFetch("/api/admin/auto-follow-backfill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setBackfillStatus(`Error: ${data.error || `HTTP ${res.status}`}`);
      } else {
        setBackfillStatus(
          `Done — synced ${data.processed} member(s), ${data.failures} failure(s).`
        );
      }
    } catch (e) {
      setBackfillStatus(`Error: ${(e as Error).message}`);
    } finally {
      setBackfillRunning(false);
    }
  };

  const loadMembers = async (status: string) => {
    setLoading(true);
    let query = supabase
      .from("user_profiles")
      .select("id, email, display_name, role, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status === "pending") {
      query = query.eq("status", "pending_approval");
    }

    const { data } = await query;
    if (data) setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadMembers(filter);
  }, [filter]);

  const updateMember = async (memberId: string, updates: { role?: Role; status?: string }) => {
    setSavingId(memberId);
    setErrorById((prev) => {
      const next = new Map(prev);
      next.delete(memberId);
      return next;
    });

    // Optimistic local update so the dropdown reflects the change instantly
    const prev = members;
    setMembers((curr) =>
      curr.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
    );

    const res = await adminFetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorById((map) => new Map(map).set(memberId, data.error || "Update failed"));
      // Roll back the optimistic update
      setMembers(prev);
    }

    setSavingId(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">Members</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all" ? "bg-brand-blue text-white" : "bg-white text-zinc-600 border border-zinc-200"
            }`}
          >
            All Members
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "pending" ? "bg-brand-orange text-white" : "bg-white text-zinc-600 border border-zinc-200"
            }`}
          >
            Pending Approval
          </button>
          <button
            onClick={runFollowBackfill}
            disabled={backfillRunning}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
            title="One-shot: ensures the owner is in a mutual follow with every active member. Idempotent."
          >
            {backfillRunning ? "Syncing..." : "Sync owner follows"}
          </button>
        </div>
        {backfillStatus && (
          <p className="mb-4 text-sm text-zinc-600">{backfillStatus}</p>
        )}

        {/* Compact role legend so admins know what each role grants without
            having to remember or click into each one */}
        <details className="mb-6 bg-white border border-zinc-100 rounded-xl p-4 text-sm">
          <summary className="cursor-pointer font-medium text-zinc-700">
            Role reference
          </summary>
          <ul className="mt-3 space-y-2 text-zinc-600">
            {ROLES.map((r) => (
              <li key={r}>
                <span className="font-medium text-zinc-900">{ROLE_LABEL[r]}</span> — {ROLE_DESCRIPTION[r]}
              </li>
            ))}
          </ul>
        </details>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No members found.</div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const rowError = errorById.get(member.id);
              const isSaving = savingId === member.id;
              return (
                <div key={member.id} className="p-4 bg-white rounded-xl border border-zinc-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/member/${member.id}`}
                        className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold shrink-0 hover:opacity-80"
                      >
                        {member.display_name?.charAt(0).toUpperCase() || "?"}
                      </Link>
                      <div className="min-w-0">
                        <Link href={`/member/${member.id}`} className="block text-sm font-medium text-zinc-900 hover:text-brand-blue truncate">
                          {member.display_name}
                        </Link>
                        <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Author byline link — the member side of authors.user_profile_id.
                          Same link /admin/authors manages from the author side. */}
                      {(() => {
                        const linked = authors.find((a) => a.user_profile_id === member.id) || null;
                        const isLinkSaving = linkSavingId === member.id;
                        return (
                          <select
                            value={linked?.id || ""}
                            onChange={(e) => void updateAuthorLink(member, e.target.value)}
                            disabled={isLinkSaving}
                            className={`px-3 py-1.5 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-brand-blue disabled:opacity-50 max-w-[180px] ${
                              linked ? "border-brand-blue/40 text-brand-blue" : "border-zinc-200 text-zinc-500"
                            }`}
                            title="Author byline — links this member to an authors row so blog bylines render their live profile"
                          >
                            <option value="">No author byline</option>
                            <option value={CREATE_AUTHOR}>＋ Create author from this member</option>
                            {authors.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.display_name}
                                {a.user_profile_id && a.user_profile_id !== member.id ? " (linked elsewhere)" : ""}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                      <select
                        value={member.role}
                        onChange={(e) => updateMember(member.id, { role: e.target.value as Role })}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                        title="Role"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                      <select
                        value={member.status}
                        onChange={(e) => updateMember(member.id, { status: e.target.value })}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                        title="Status"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      {isSaving && <span className="text-xs text-zinc-400">Saving…</span>}
                    </div>
                  </div>
                  {rowError && (
                    <p className="mt-2 text-xs text-brand-red">{rowError}</p>
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
