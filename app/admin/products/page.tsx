"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";
import { adminFetch } from "@/app/lib/adminFetch";

const supabase = getSupabase();

type Storefront = "bookshop" | "special_learning" | "amazon";

interface Product {
  id: string;
  storefront: Storefront;
  title: string;
  image_url: string | null;
  click_url: string;
  price_label: string | null;
  category_filter: string[] | null;
  tag_filter: string[] | null;
  is_active: boolean;
  position: number;
}

const STOREFRONT_LABEL: Record<Storefront, string> = {
  bookshop: "Bookshop.org",
  special_learning: "Special Learning",
  amazon: "Amazon",
};

const EMPTY: Omit<Product, "id"> = {
  storefront: "amazon",
  title: "",
  image_url: "",
  click_url: "",
  price_label: "",
  category_filter: null,
  tag_filter: null,
  is_active: true,
  position: 100,
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Storefront>("all");
  const [draft, setDraft] = useState<Omit<Product, "id">>({ ...EMPTY });
  const [addError, setAddError] = useState<string | null>(null);
  const [importStorefront, setImportStorefront] = useState<Storefront>("bookshop");
  const [importClear, setImportClear] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const runImport = async (file: File) => {
    setImportBusy(true);
    setImportStatus(null);
    try {
      const params = new URLSearchParams({ storefront: importStorefront });
      if (importClear) params.set("clear", "true");
      const formData = new FormData();
      formData.append("file", file);
      const res = await adminFetch(`/api/admin/products/import?${params.toString()}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setImportStatus(`Import failed: ${data.error || `HTTP ${res.status}`}`);
        return;
      }
      const skippedMsg = data.skippedCount > 0
        ? ` · ${data.skippedCount} row${data.skippedCount === 1 ? "" : "s"} skipped`
        : "";
      const clearedMsg = data.cleared ? " (existing rows for these storefronts were cleared first)" : "";
      setImportStatus(`Imported ${data.inserted} products${skippedMsg}${clearedMsg}.`);
      void load();
    } catch (err) {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImportBusy(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  };

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data || []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((p) => p.storefront === filter)),
    [items, filter]
  );

  const update = async (id: string, patch: Partial<Product>) => {
    if (!supabase) return;
    setSavingId(id);
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase
      .from("products")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingId(null);
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Delete this product?")) return;
    setSavingId(id);
    await supabase.from("products").delete().eq("id", id);
    setSavingId(null);
    void load();
  };

  const add = async () => {
    if (!supabase) return;
    setAddError(null);
    if (!draft.title.trim() || !draft.click_url.trim()) {
      setAddError("Title and link URL are required.");
      return;
    }
    const payload = {
      ...draft,
      title: draft.title.trim(),
      click_url: draft.click_url.trim(),
      image_url: draft.image_url?.trim() || null,
      price_label: draft.price_label?.trim() || null,
    };
    const { error } = await supabase.from("products").insert(payload);
    if (error) {
      setAddError(error.message);
      return;
    }
    setDraft({ ...EMPTY });
    void load();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Products</h1>
          </div>
          <Link
            href="/admin/ad-metrics"
            className="text-sm text-brand-blue hover:underline"
          >
            Metrics &rarr;
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 p-4 bg-white border border-zinc-100 rounded-xl text-sm text-zinc-600">
          <p>
            Products surface inside blog posts as a 3-up grid (2-up tablet, stacked on mobile).
            Each row is matched to a post by category and/or tag, the same way affiliates are scoped.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Impressions fire when a card crosses 50% into the viewport; clicks fire on link
            interaction. See the <Link href="/admin/ad-metrics" className="text-brand-blue hover:underline">metrics page</Link> for performance over time.
          </p>
        </div>

        <div className="bg-white border border-zinc-100 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Import from CSV</h2>
          <p className="text-xs text-zinc-500 mb-3">
            Expected columns (case-insensitive): <span className="font-mono">Name</span>,{" "}
            <span className="font-mono">Product URL</span> (both required),{" "}
            <span className="font-mono">Image URL</span>, <span className="font-mono">Regular price ($)</span>,{" "}
            <span className="font-mono">Category</span>, <span className="font-mono">Tags</span>,{" "}
            <span className="font-mono">Storefront</span> (optional — falls back to the dropdown below).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-zinc-600 flex items-center gap-2">
              Default storefront
              <select
                value={importStorefront}
                onChange={(e) => setImportStorefront(e.target.value as Storefront)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded-lg"
              >
                {(Object.keys(STOREFRONT_LABEL) as Storefront[]).map((k) => (
                  <option key={k} value={k}>{STOREFRONT_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-600 flex items-center gap-2">
              <input
                type="checkbox"
                checked={importClear}
                onChange={(e) => setImportClear(e.target.checked)}
              />
              Wipe existing rows for this storefront first (full reseed)
            </label>
            <label className={`inline-flex items-center px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-50 ${importBusy ? "opacity-60 pointer-events-none" : ""}`}>
              {importBusy ? "Importing…" : "Choose CSV file"}
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void runImport(f);
                }}
              />
            </label>
          </div>
          {importStatus && (
            <p className={`mt-3 text-xs ${importStatus.startsWith("Imported") ? "text-brand-green" : "text-brand-red"}`}>
              {importStatus}
            </p>
          )}
        </div>

        <div className="bg-white border border-zinc-100 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Add product</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <select
              value={draft.storefront}
              onChange={(e) => setDraft({ ...draft, storefront: e.target.value as Storefront })}
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg"
            >
              {(Object.keys(STOREFRONT_LABEL) as Storefront[]).map((k) => (
                <option key={k} value={k}>
                  {STOREFRONT_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Product title"
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg"
            />
            <input
              value={draft.price_label || ""}
              onChange={(e) => setDraft({ ...draft, price_label: e.target.value })}
              placeholder="Price label (e.g. $14.99)"
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg"
            />
            <input
              value={draft.image_url || ""}
              onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
              placeholder="Image URL"
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg sm:col-span-2"
            />
            <input
              value={draft.click_url}
              onChange={(e) => setDraft({ ...draft, click_url: e.target.value })}
              placeholder="Click URL (with affiliate tag)"
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg sm:col-span-2 lg:col-span-1"
            />
            <input
              value={draft.category_filter?.join(", ") || ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  category_filter:
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean) || null,
                })
              }
              placeholder="Categories (comma sep)"
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg"
            />
            <input
              value={draft.tag_filter?.join(", ") || ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  tag_filter:
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean) || null,
                })
              }
              placeholder="Tags (comma sep)"
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg"
            />
            <button
              onClick={add}
              className="px-3 py-1.5 text-sm font-medium bg-brand-blue hover:bg-brand-blue-dark text-white rounded-lg"
            >
              Add product
            </button>
          </div>
          {addError && <p className="mt-2 text-xs text-brand-red">{addError}</p>}
        </div>

        <div className="flex items-center gap-2 mb-4">
          {(["all", ...Object.keys(STOREFRONT_LABEL)] as Array<"all" | Storefront>).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                filter === k ? "bg-brand-blue text-white" : "bg-white border border-zinc-200 text-zinc-600"
              }`}
            >
              {k === "all" ? `All (${items.length})` : `${STOREFRONT_LABEL[k]} (${items.filter((p) => p.storefront === k).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No products yet.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-zinc-100 p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="w-20 h-20 object-contain bg-zinc-50 rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-zinc-50 rounded-lg flex items-center justify-center text-[10px] text-zinc-400 shrink-0">
                      no image
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                        {STOREFRONT_LABEL[p.storefront]}
                      </span>
                      <label className="flex items-center gap-1 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          checked={p.is_active}
                          onChange={(e) => update(p.id, { is_active: e.target.checked })}
                        />
                        Active
                      </label>
                    </div>
                    <input
                      value={p.title}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x))
                        )
                      }
                      onBlur={(e) => update(p.id, { title: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-zinc-200 rounded"
                    />
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input
                        value={p.image_url || ""}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, image_url: e.target.value } : x))
                          )
                        }
                        onBlur={(e) => update(p.id, { image_url: e.target.value || null })}
                        placeholder="Image URL"
                        className="px-2 py-1 text-xs border border-zinc-200 rounded font-mono"
                      />
                      <input
                        value={p.click_url}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, click_url: e.target.value } : x))
                          )
                        }
                        onBlur={(e) => update(p.id, { click_url: e.target.value })}
                        placeholder="Click URL"
                        className="px-2 py-1 text-xs border border-zinc-200 rounded font-mono"
                      />
                      <input
                        value={p.price_label || ""}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, price_label: e.target.value } : x))
                          )
                        }
                        onBlur={(e) => update(p.id, { price_label: e.target.value || null })}
                        placeholder="Price label"
                        className="px-2 py-1 text-xs border border-zinc-200 rounded"
                      />
                      <input
                        value={p.category_filter?.join(", ") || ""}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === p.id
                                ? {
                                    ...x,
                                    category_filter: e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  }
                                : x
                            )
                          )
                        }
                        onBlur={(e) =>
                          update(p.id, {
                            category_filter:
                              e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean) || null,
                          })
                        }
                        placeholder="Categories"
                        className="px-2 py-1 text-xs border border-zinc-200 rounded"
                      />
                      <input
                        value={p.tag_filter?.join(", ") || ""}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === p.id
                                ? {
                                    ...x,
                                    tag_filter: e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  }
                                : x
                            )
                          )
                        }
                        onBlur={(e) =>
                          update(p.id, {
                            tag_filter:
                              e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean) || null,
                          })
                        }
                        placeholder="Tags"
                        className="px-2 py-1 text-xs border border-zinc-200 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => remove(p.id)}
                      disabled={savingId === p.id}
                      className="text-xs text-brand-red hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
