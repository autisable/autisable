"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface Affiliate {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  cta_label: string | null;
  click_url: string;
  banner_300x250_url: string | null;
  banner_468x60_url: string | null;
  category_filter: string[] | null;
  tag_filter: string[] | null;
  show_in_sidebar: boolean;
  show_in_footer: boolean;
  is_active: boolean;
  position: number;
}

export default function AdminAffiliatesPage() {
  const [items, setItems] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("affiliates")
      .select("*")
      .order("position", { ascending: true });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (id: string, patch: Partial<Affiliate>) => {
    setSavingId(id);
    // Optimistic
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await supabase
      .from("affiliates")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingId(null);
  };

  // Upload a banner file directly instead of pasting a URL. Posts to
  // /api/upload/affiliate-banner with the user's session token (admin-gated
  // server-side). On success we write the returned public URL into the
  // matching banner field via the standard `update` flow.
  const uploadBanner = async (
    affiliate: Affiliate,
    size: "300x250" | "468x60",
    file: File
  ) => {
    setSavingId(affiliate.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Not signed in. Refresh the page and log in again.");
        return;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("slug", affiliate.slug);
      form.append("size", size);

      const res = await fetch("/api/upload/affiliate-banner", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        alert(`Upload failed: ${json.error || res.statusText}`);
        return;
      }
      const field = size === "300x250" ? "banner_300x250_url" : "banner_468x60_url";
      await update(affiliate.id, { [field]: json.url });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">Affiliates</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 p-4 bg-white border border-zinc-100 rounded-xl text-sm text-zinc-600">
          <p>
            Affiliate banners rotate randomly across blog post pages. Each shows a sponsored label and uses{" "}
            <code className="text-xs px-1 py-0.5 bg-zinc-100 rounded">rel=&quot;sponsored&quot;</code> for SEO compliance.
          </p>
          <p className="mt-2">
            Without a banner image, the slot renders as a styled text card built from name + tagline + CTA. Upload a 300×250 (primary) or 468×60 (secondary) PNG/JPG to switch any partner to image-based display. Recommended sizes per <Link href="/IMAGE_SIZES.md" className="text-brand-blue hover:underline">IMAGE_SIZES.md</Link>.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            No affiliates yet. Run the L5 SQL migration to seed the launch partners.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a.id} className="p-5 bg-white rounded-xl border border-zinc-100 space-y-4">
                {/* Header row: name + active toggle + saving indicator */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-zinc-900">{a.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{a.slug} · {a.click_url}</p>
                  </div>
                  <label className="flex items-center gap-2 shrink-0 text-sm">
                    <input
                      type="checkbox"
                      checked={a.is_active}
                      onChange={(e) => update(a.id, { is_active: e.target.checked })}
                      className="rounded border-zinc-300 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className={a.is_active ? "text-brand-green font-medium" : "text-zinc-400"}>
                      {a.is_active ? "Active" : "Paused"}
                    </span>
                  </label>
                </div>

                {/* Editable fields */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-xs">
                    <span className="block text-zinc-500 mb-1">Tagline (text-card fallback)</span>
                    <input
                      type="text"
                      defaultValue={a.tagline || ""}
                      onBlur={(e) => e.target.value !== a.tagline && update(a.id, { tagline: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="block text-zinc-500 mb-1">CTA label</span>
                    <input
                      type="text"
                      defaultValue={a.cta_label || ""}
                      onBlur={(e) => e.target.value !== a.cta_label && update(a.id, { cta_label: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="block text-zinc-500 mb-1">Click URL (with affiliate tag)</span>
                    <input
                      type="url"
                      defaultValue={a.click_url}
                      onBlur={(e) => e.target.value !== a.click_url && update(a.id, { click_url: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="block text-zinc-500 mb-1">Position (lower = shows more)</span>
                    <input
                      type="number"
                      defaultValue={a.position}
                      onBlur={(e) => parseInt(e.target.value) !== a.position && update(a.id, { position: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                  <BannerField
                    affiliate={a}
                    size="300x250"
                    label="Banner 300×250 (sidebar / inline)"
                    onUpload={(file) => uploadBanner(a, "300x250", file)}
                    onUrlChange={(url) => update(a.id, { banner_300x250_url: url })}
                  />
                  <BannerField
                    affiliate={a}
                    size="468x60"
                    label="Banner 468×60 (footer)"
                    onUpload={(file) => uploadBanner(a, "468x60", file)}
                    onUrlChange={(url) => update(a.id, { banner_468x60_url: url })}
                  />
                  <label className="text-xs col-span-full">
                    <span className="block text-zinc-500 mb-1">
                      Category filter (comma-separated; leave blank for no category restriction)
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Bloggers, Personal Stories and Experiences"
                      defaultValue={(a.category_filter || []).join(", ")}
                      onBlur={(e) => {
                        const arr = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const newVal = arr.length ? arr : null;
                        const same = JSON.stringify(newVal) === JSON.stringify(a.category_filter);
                        if (!same) update(a.id, { category_filter: newVal });
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                  <label className="text-xs col-span-full">
                    <span className="block text-zinc-500 mb-1">
                      Tag filter (comma-separated; OR-combined with category filter — show if EITHER matches)
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. vizyplan, aac, visual-schedules"
                      defaultValue={(a.tag_filter || []).join(", ")}
                      onBlur={(e) => {
                        const arr = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const newVal = arr.length ? arr : null;
                        const same = JSON.stringify(newVal) === JSON.stringify(a.tag_filter);
                        if (!same) update(a.id, { tag_filter: newVal });
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                </div>

                {/* Placement toggles */}
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={a.show_in_sidebar}
                      onChange={(e) => update(a.id, { show_in_sidebar: e.target.checked })}
                      className="rounded border-zinc-300 text-brand-blue focus:ring-brand-blue"
                    />
                    Show in sidebar / inline
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={a.show_in_footer}
                      onChange={(e) => update(a.id, { show_in_footer: e.target.checked })}
                      className="rounded border-zinc-300 text-brand-blue focus:ring-brand-blue"
                    />
                    Show in footer
                  </label>
                  {savingId === a.id && <span className="text-xs text-zinc-400 ml-auto">Saving…</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Banner field: URL input + upload button + preview thumbnail. Uploads
 * route through /api/upload/affiliate-banner so the file lands in the
 * Media bucket; the resulting public URL is what gets stored on the row.
 */
function BannerField({
  affiliate,
  size,
  label,
  onUpload,
  onUrlChange,
}: {
  affiliate: Affiliate;
  size: "300x250" | "468x60";
  label: string;
  onUpload: (file: File) => Promise<void>;
  onUrlChange: (url: string | null) => Promise<void>;
}) {
  const currentUrl = size === "300x250" ? affiliate.banner_300x250_url : affiliate.banner_468x60_url;
  const [uploading, setUploading] = useState(false);
  const inputId = `banner-upload-${affiliate.id}-${size}`;

  return (
    <div className="text-xs">
      <span className="block text-zinc-500 mb-1">{label}</span>
      <div className="flex items-stretch gap-2">
        <input
          type="url"
          placeholder="Upload below or paste a URL — leave blank for text-card fallback"
          defaultValue={currentUrl || ""}
          key={currentUrl || "empty"}
          onBlur={(e) => {
            const v = e.target.value || null;
            if (v !== (currentUrl || null)) void onUrlChange(v);
          }}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
        />
        <label
          htmlFor={inputId}
          className={`shrink-0 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
            uploading
              ? "bg-zinc-100 text-zinc-400 cursor-wait"
              : "bg-brand-blue text-white hover:bg-brand-blue-dark"
          }`}
        >
          {uploading ? "Uploading…" : "Upload"}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              await onUpload(file);
            } finally {
              setUploading(false);
              e.target.value = ""; // allow re-uploading the same filename
            }
          }}
        />
      </div>
      {currentUrl && (
        <div className="mt-2 flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={`${affiliate.name} ${size}`}
            className="rounded border border-zinc-200 max-h-20 w-auto object-contain bg-zinc-50"
          />
          <button
            type="button"
            onClick={() => void onUrlChange(null)}
            className="text-xs text-brand-red hover:underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
