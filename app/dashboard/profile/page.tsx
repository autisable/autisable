"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

type SelfIdTag = "parent_guardian" | "neurodiverse" | "professional";

const SELF_ID_TAGS: { value: SelfIdTag; label: string; description: string; chipClass: string }[] = [
  {
    value: "parent_guardian",
    label: "Parent / Guardian",
    description: "Caregiver to a child or family member.",
    chipClass: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    value: "neurodiverse",
    label: "Neurodiverse",
    description: "You think differently — autistic and/or other neurodivergent identity.",
    chipClass: "bg-brand-blue-light text-brand-blue border-brand-blue/20",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Therapist, lawyer, educator, or other professional serving the community.",
    chipClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
];

interface ProfileForm {
  display_name: string;
  bio: string;
  avatar_url: string;
  cover_photo_url: string;
  website: string;
  social_twitter: string;
  social_facebook: string;
  social_instagram: string;
  social_linkedin: string;
  social_youtube: string;
  social_tiktok: string;
  self_id_tags: SelfIdTag[];
}

const EMPTY: ProfileForm = {
  display_name: "",
  bio: "",
  avatar_url: "",
  cover_photo_url: "",
  website: "",
  social_twitter: "",
  social_facebook: "",
  social_instagram: "",
  social_linkedin: "",
  social_youtube: "",
  social_tiktok: "",
  self_id_tags: [],
};

export default function EditProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("user_profiles")
        .select("display_name, bio, avatar_url, cover_photo_url, website, social_twitter, social_facebook, social_instagram, social_linkedin, social_youtube, social_tiktok, self_id_tags")
        .eq("id", user.id)
        .single();
      if (data) {
        setForm({
          display_name: data.display_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          cover_photo_url: data.cover_photo_url || "",
          website: data.website || "",
          social_twitter: data.social_twitter || "",
          social_facebook: data.social_facebook || "",
          social_instagram: data.social_instagram || "",
          social_linkedin: data.social_linkedin || "",
          social_youtube: data.social_youtube || "",
          social_tiktok: data.social_tiktok || "",
          self_id_tags: Array.isArray(data.self_id_tags) ? data.self_id_tags : [],
        });
      }
      setLoading(false);
    })();
  }, [router]);

  const update = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const toggleTag = (tag: SelfIdTag) => {
    setForm((p) => {
      const has = p.self_id_tags.includes(tag);
      return {
        ...p,
        self_id_tags: has ? p.self_id_tags.filter((t) => t !== tag) : [...p.self_id_tags, tag],
      };
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSavedOk(false);
    const { error: saveError } = await supabase
      .from("user_profiles")
      .update({
        display_name: form.display_name.trim() || "Member",
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        cover_photo_url: form.cover_photo_url.trim() || null,
        website: form.website.trim() || null,
        social_twitter: form.social_twitter.trim() || null,
        social_facebook: form.social_facebook.trim() || null,
        social_instagram: form.social_instagram.trim() || null,
        social_linkedin: form.social_linkedin.trim() || null,
        social_youtube: form.social_youtube.trim() || null,
        social_tiktok: form.social_tiktok.trim() || null,
        self_id_tags: form.self_id_tags.length > 0 ? form.self_id_tags : null,
      })
      .eq("id", userId);
    if (saveError) setError(saveError.message);
    else setSavedOk(true);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="animate-pulse text-zinc-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-brand-blue hover:underline mb-2 inline-block">
            &larr; Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900">Edit Profile</h1>
        </div>
        {userId && (
          <Link
            href={`/member/${userId}`}
            target="_blank"
            className="text-sm text-brand-blue hover:underline whitespace-nowrap"
          >
            View public profile &rarr;
          </Link>
        )}
      </div>

      <div className="space-y-8">
        {/* Identity */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Identity</h2>

          <Field label="Display name" value={form.display_name} onChange={(v) => update("display_name", v)} />

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="A short intro — who you are, why you're here."
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand-blue"
            />
            <p className="mt-1 text-xs text-zinc-400">{form.bio.length}/500</p>
          </div>

          <Field
            label="Avatar URL"
            value={form.avatar_url}
            onChange={(v) => update("avatar_url", v)}
            placeholder="https://… (image URL — recommended 400×400 square)"
          />
          <Field
            label="Cover photo URL"
            value={form.cover_photo_url}
            onChange={(v) => update("cover_photo_url", v)}
            placeholder="https://… (image URL — recommended 1200×300 banner)"
          />
          <p className="text-xs text-zinc-400 -mt-2">
            File upload coming soon. For now, paste a public image URL.
          </p>
        </section>

        {/* Self-ID */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Self-ID Tags</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Optional. How you relate to autism. Tags display on your profile as colored chips.
              Pick any combination, or leave blank.
            </p>
          </div>
          <div className="space-y-2">
            {SELF_ID_TAGS.map((tag) => {
              const checked = form.self_id_tags.includes(tag.value);
              return (
                <label
                  key={tag.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTag(tag.value)}
                    className="mt-1 rounded border-zinc-300 text-brand-blue focus:ring-brand-blue"
                  />
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${tag.chipClass}`}>
                      {tag.label}
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">{tag.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Links */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Links</h2>

          <Field label="Website" value={form.website} onChange={(v) => update("website", v)} placeholder="https://example.com" />
          <Field label="Twitter / X" value={form.social_twitter} onChange={(v) => update("social_twitter", v)} placeholder="https://x.com/handle" />
          <Field label="Facebook" value={form.social_facebook} onChange={(v) => update("social_facebook", v)} placeholder="https://facebook.com/handle" />
          <Field label="Instagram" value={form.social_instagram} onChange={(v) => update("social_instagram", v)} placeholder="https://instagram.com/handle" />
          <Field label="LinkedIn" value={form.social_linkedin} onChange={(v) => update("social_linkedin", v)} placeholder="https://linkedin.com/in/handle" />
          <Field label="YouTube" value={form.social_youtube} onChange={(v) => update("social_youtube", v)} placeholder="https://youtube.com/@handle" />
          <Field label="TikTok" value={form.social_tiktok} onChange={(v) => update("social_tiktok", v)} placeholder="https://tiktok.com/@handle" />
        </section>

        {/* Save bar */}
        <div className="sticky bottom-4 bg-white border border-zinc-200 rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div className="text-xs">
            {error && <span className="text-brand-red">{error}</span>}
            {savedOk && !error && <span className="text-brand-green">Saved.</span>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-semibold rounded-xl disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
      />
    </div>
  );
}
