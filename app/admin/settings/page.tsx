"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface NavLink {
  id?: string;
  label: string;
  url: string;
  is_external: boolean;
  is_visible: boolean;
  position: number;
}

interface Setting {
  key: string;
  value: string;
}

export default function AdminSettingsPage() {
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"nav" | "social" | "general">("nav");

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from("nav_links").select("*").order("position"),
      supabase.from("site_settings").select("key, value"),
    ]).then(([navRes, settingsRes]) => {
      if (navRes.data) setNavLinks(navRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      setLoading(false);
    });
  }, []);

  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || "";
  const setSetting = (key: string, value: string) => {
    setSettings((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) return prev.map((s) => (s.key === key ? { ...s, value } : s));
      return [...prev, { key, value }];
    });
    setSaved(false);
  };

  const handleSaveNav = async () => {
    if (!supabase) return;
    setSaving(true);
    // Delete all and re-insert
    await supabase.from("nav_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("nav_links").insert(
      navLinks.map((link, i) => ({
        label: link.label,
        url: link.url,
        is_external: link.is_external,
        is_visible: link.is_visible,
        position: i,
      }))
    );
    setSaving(false);
    setSaved(true);
  };

  const handleSaveSettings = async () => {
    if (!supabase) return;
    setSaving(true);
    for (const setting of settings) {
      await supabase.from("site_settings").upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });
    }
    setSaving(false);
    setSaved(true);
  };

  const addNavLink = () => {
    setNavLinks((prev) => [...prev, { label: "", url: "/", is_external: false, is_visible: true, position: prev.length }]);
    setSaved(false);
  };

  const removeNavLink = (index: number) => {
    setNavLinks((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const updateNavLink = (index: number, field: string, value: unknown) => {
    setNavLinks((prev) => prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">Site Settings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["nav", "social", "general"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? "bg-brand-blue text-white" : "bg-white text-zinc-600 border border-zinc-200"
              }`}
            >
              {tab === "nav" ? "Navigation" : tab === "social" ? "Social Links" : "General"}
            </button>
          ))}
        </div>

        {/* Navigation */}
        {activeTab === "nav" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {navLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-50 last:border-0">
                  <span className="text-xs text-zinc-400 w-6">{i + 1}</span>
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateNavLink(i, "label", e.target.value)}
                    placeholder="Label"
                    className="w-32 px-2 py-1.5 border border-zinc-200 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateNavLink(i, "url", e.target.value)}
                    placeholder="/path or https://..."
                    className="flex-1 px-2 py-1.5 border border-zinc-200 rounded text-sm"
                  />
                  <label className="flex items-center gap-1 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={link.is_visible}
                      onChange={(e) => updateNavLink(i, "is_visible", e.target.checked)}
                      className="rounded border-zinc-300 text-brand-blue"
                    />
                    Visible
                  </label>
                  <label className="flex items-center gap-1 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={link.is_external}
                      onChange={(e) => updateNavLink(i, "is_external", e.target.checked)}
                      className="rounded border-zinc-300 text-brand-blue"
                    />
                    External
                  </label>
                  <button onClick={() => removeNavLink(i)} className="text-xs text-brand-red hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={addNavLink} className="text-sm text-brand-blue hover:underline">
                + Add link
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSaveNav}
                disabled={saving}
                className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Navigation"}
              </button>
            </div>
            {saved && <p className="text-xs text-brand-green">Saved!</p>}
          </div>
        )}

        {/* Social Links */}
        {activeTab === "social" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
              {[
                { key: "social_facebook", label: "Facebook URL" },
                { key: "social_instagram", label: "Instagram URL" },
                { key: "social_linkedin", label: "LinkedIn URL" },
                { key: "social_youtube", label: "YouTube URL" },
                { key: "social_twitter", label: "X/Twitter URL" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={getSetting(field.key)}
                    onChange={(e) => setSetting(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Social Links"}
              </button>
            </div>
            {saved && <p className="text-xs text-brand-green text-right">Saved!</p>}
          </div>
        )}

        {/* General */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
              {[
                { key: "site_title", label: "Site Title" },
                { key: "site_description", label: "Site Description" },
                { key: "contact_email", label: "Contact Email" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={getSetting(field.key)}
                    onChange={(e) => setSetting(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
            {saved && <p className="text-xs text-brand-green text-right">Saved!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
