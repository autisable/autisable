"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface Author {
  id: string;
  display_name: string;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
  user_profile_id: string | null;
  avatar_url: string | null;
}

interface MemberLite {
  id: string;
  display_name: string;
  email: string;
}

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Author | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  // id → member for every linked author, so rows and the edit modal can show
  // WHO an author is linked to instead of just "member-linked".
  const [linkedMembers, setLinkedMembers] = useState<Record<string, MemberLite>>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<MemberLite[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("authors")
      .select(
        "id, display_name, bio, website, twitter, facebook, instagram, linkedin, youtube, user_profile_id, avatar_url"
      )
      .order("display_name")
      .limit(1000)
      .then(async ({ data }) => {
        if (data) {
          setAuthors(data as Author[]);
          // Resolve linked member names in one batch query. Requires the
          // editor/admin SELECT policy on user_profiles (docs/user-profiles-admin-rls-fix.sql).
          const ids = [...new Set((data as Author[]).map((a) => a.user_profile_id).filter(Boolean))] as string[];
          if (ids.length > 0 && supabase) {
            const { data: profiles } = await supabase
              .from("user_profiles")
              .select("id, display_name, email")
              .in("id", ids);
            if (profiles) {
              const map: Record<string, MemberLite> = {};
              for (const p of profiles as MemberLite[]) map[p.id] = p;
              setLinkedMembers(map);
            }
          }
        }
        setLoading(false);
      });
  }, []);

  // Debounced member search for the link picker in the edit modal.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!memberSearch.trim() || !supabase) {
        setMemberResults([]);
        return;
      }
      setMemberSearching(true);
      // Strip PostgREST or() delimiters so names with commas/parens don't
      // break the filter expression.
      const q = memberSearch.trim().replace(/[,()]/g, " ");
      const { data } = await supabase
        .from("user_profiles")
        .select("id, display_name, email")
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .order("display_name")
        .limit(8);
      setMemberResults((data as MemberLite[]) || []);
      setMemberSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch]);

  const handleEdit = (author: Author) => {
    setEditing(author.id);
    setEditData({ ...author });
    setMemberSearch("");
    setMemberResults([]);
  };

  // Selecting a member only updates local edit state; the link is written
  // (with everything else) on Save so Cancel really cancels.
  const handlePickMember = (m: MemberLite) => {
    if (!editData) return;
    setEditData({ ...editData, user_profile_id: m.id });
    setLinkedMembers((prev) => ({ ...prev, [m.id]: m }));
    setMemberSearch("");
    setMemberResults([]);
  };

  const handleUnlinkMember = () => {
    if (!editData) return;
    setEditData({ ...editData, user_profile_id: null });
  };

  const handleSave = async () => {
    if (!editData || !supabase) return;
    setSaving(true);
    // .select() forces a real response — without it, an RLS rejection
    // returns {data:null, error:null} and the optimistic UI lies
    // about success. Apply the same fix we used on /admin/products.
    const { data, error } = await supabase
      .from("authors")
      .update({
        display_name: editData.display_name,
        bio: editData.bio,
        website: editData.website,
        twitter: editData.twitter,
        facebook: editData.facebook,
        instagram: editData.instagram,
        linkedin: editData.linkedin,
        youtube: editData.youtube,
        user_profile_id: editData.user_profile_id,
      })
      .eq("id", editData.id)
      .select("id");

    if (error) {
      alert(`Save failed: ${error.message}`);
      setSaving(false);
      return;
    }
    if (!data || data.length === 0) {
      alert(
        "Save didn't take — no rows updated. RLS may be blocking the write. Apply docs/authors-user-profile-link.sql to add the editor/admin UPDATE policy."
      );
      setSaving(false);
      return;
    }
    setAuthors((prev) => prev.map((a) => (a.id === editData.id ? editData : a)));
    setEditing(null);
    setEditData(null);
    setSaving(false);
  };

  const filtered = search
    ? authors.filter((a) => a.display_name.toLowerCase().includes(search.toLowerCase()))
    : authors;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">Authors</h1>
          <span className="text-sm text-zinc-400">({authors.length})</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search authors..."
          className="w-full mb-6 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue"
        />

        {/* Edit modal */}
        {editing && editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900">Edit Author</h2>
                <button onClick={() => { setEditing(null); setEditData(null); }} className="text-zinc-400 hover:text-zinc-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {/* Member link picker — this is how an author becomes a
                  member-author. Linked bylines render live member-profile
                  data; fields below act as fallbacks only. */}
              <div className="mb-4 p-3 bg-brand-blue-light/40 border border-brand-blue/20 rounded-lg text-xs text-zinc-700">
                <p className="font-medium text-zinc-900 mb-2">Linked member profile</p>
                {editData.user_profile_id ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/member/${editData.user_profile_id}`}
                        target="_blank"
                        className="font-medium text-brand-blue hover:underline truncate block"
                      >
                        {linkedMembers[editData.user_profile_id]?.display_name || "View member profile"}
                      </Link>
                      {linkedMembers[editData.user_profile_id]?.email && (
                        <p className="text-zinc-500 truncate">{linkedMembers[editData.user_profile_id].email}</p>
                      )}
                    </div>
                    <button
                      onClick={handleUnlinkMember}
                      className="shrink-0 px-2 py-1 text-[11px] font-medium text-brand-red hover:bg-red-50 border border-red-200 rounded-lg"
                    >
                      Unlink
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members by name or email to link…"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white"
                    />
                    {memberSearching && (
                      <p className="mt-1 text-zinc-400">Searching…</p>
                    )}
                    {memberResults.length > 0 && (
                      <ul className="mt-1 border border-zinc-200 rounded-lg bg-white divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                        {memberResults.map((m) => (
                          <li key={m.id}>
                            <button
                              onClick={() => handlePickMember(m)}
                              className="w-full text-left px-3 py-2 hover:bg-brand-blue-light/40"
                            >
                              <span className="font-medium text-zinc-900">{m.display_name}</span>
                              <span className="text-zinc-400 ml-2">{m.email}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {memberSearch.trim() && !memberSearching && memberResults.length === 0 && (
                      <p className="mt-1 text-zinc-400">No members match.</p>
                    )}
                  </div>
                )}
                <p className="mt-2 text-zinc-500">
                  When linked, bylines pull bio, avatar, and socials from the member&apos;s profile
                  (<code className="text-[11px]">/dashboard/profile</code>); the fields below are fallbacks.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { key: "display_name", label: "Name" },
                  { key: "bio", label: "Bio", textarea: true },
                  { key: "website", label: "Website" },
                  { key: "twitter", label: "Twitter/X URL" },
                  { key: "facebook", label: "Facebook URL" },
                  { key: "instagram", label: "Instagram URL" },
                  { key: "linkedin", label: "LinkedIn URL" },
                  { key: "youtube", label: "YouTube URL" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">{field.label}</label>
                    {field.textarea ? (
                      <textarea
                        value={(editData[field.key as keyof Author] as string) || ""}
                        onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={(editData[field.key as keyof Author] as string) || ""}
                        onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setEditing(null); setEditData(null); }} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="h-14 bg-white rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((author) => (
              <div key={author.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                    {author.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      author.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 truncate">{author.display_name}</p>
                      {author.user_profile_id && (
                        <span
                          title="This author is linked to a member profile. Bylines render live data from the member's /dashboard/profile."
                          className="shrink-0 px-1.5 py-0.5 bg-brand-blue-light text-brand-blue text-[10px] font-semibold uppercase tracking-wider rounded-full cursor-help"
                        >
                          {linkedMembers[author.user_profile_id]
                            ? `member: ${linkedMembers[author.user_profile_id].display_name}`
                            : "member-linked"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{author.bio?.slice(0, 60) || "No bio"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {author.website && <span className="w-2 h-2 rounded-full bg-brand-green" title="Has website" />}
                  <button
                    onClick={() => handleEdit(author)}
                    className="px-3 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue-light rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
