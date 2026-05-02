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
        </div>

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
