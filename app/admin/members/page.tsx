"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();
interface Member {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const [loading, setLoading] = useState(true);

  const loadMembers = async (status: string) => {
    setLoading(true);
    let query = supabase
      .from("user_profiles")
      .select("id, email, display_name, role, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

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

  const handleApprove = async (memberId: string) => {
    await supabase
      .from("user_profiles")
      .update({ status: "active" })
      .eq("id", memberId);
    void loadMembers(filter);
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
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold">
                    {member.display_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{member.display_name}</p>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    member.status === "active" ? "bg-brand-green-light text-brand-green" :
                    member.status === "pending_approval" ? "bg-brand-orange-light text-brand-orange" :
                    "bg-zinc-100 text-zinc-500"
                  }`}>
                    {member.status === "pending_approval" ? "Pending" : member.status}
                  </span>
                  <span className="text-xs text-zinc-400 capitalize">{member.role}</span>
                  {member.status === "pending_approval" && (
                    <button
                      onClick={() => handleApprove(member.id)}
                      className="px-3 py-1 bg-brand-green text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
