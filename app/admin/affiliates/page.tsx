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
                  <label className="text-xs">
                    <span className="block text-zinc-500 mb-1">Banner 300×250 URL (sidebar / inline)</span>
                    <input
                      type="url"
                      placeholder="Leave blank for text-card fallback"
                      defaultValue={a.banner_300x250_url || ""}
                      onBlur={(e) => e.target.value !== (a.banner_300x250_url || "") && update(a.id, { banner_300x250_url: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="block text-zinc-500 mb-1">Banner 468×60 URL (footer)</span>
                    <input
                      type="url"
                      placeholder="Leave blank for text-card fallback"
                      defaultValue={a.banner_468x60_url || ""}
                      onBlur={(e) => e.target.value !== (a.banner_468x60_url || "") && update(a.id, { banner_468x60_url: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                  <label className="text-xs col-span-full">
                    <span className="block text-zinc-500 mb-1">
                      Category filter (comma-separated; leave blank to show on all categories)
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
