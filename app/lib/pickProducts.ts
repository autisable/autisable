import { supabaseAdmin } from "./supabase";

export interface Product {
  id: string;
  storefront: "bookshop" | "special_learning" | "amazon";
  title: string;
  image_url: string | null;
  click_url: string;
  price_label: string | null;
}

/**
 * Server-side product picker for inline product showcases. Same filter
 * semantics as pickAffiliate (category OR tag match; unscoped products
 * eligible everywhere) so editors can target inventory to specific
 * post categories without bespoke logic per storefront.
 *
 * Returns up to `count` products, shuffled — different visits surface
 * different inventory. Returns [] if nothing eligible so the caller can
 * cleanly skip rendering the slot instead of showing an empty grid.
 */
export async function pickProducts(
  category: string | null,
  tags: string[] | null,
  count: number
): Promise<Product[]> {
  if (count <= 0 || !supabaseAdmin) return [];

  const { data } = await supabaseAdmin
    .from("products")
    .select("id, storefront, title, image_url, click_url, price_label, category_filter, tag_filter")
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (!data || data.length === 0) return [];

  const lowerTags = (tags || []).map((t) => t.toLowerCase().trim());
  const eligible = data.filter((p) => {
    const catFilter = p.category_filter as string[] | null;
    const tagFilter = p.tag_filter as string[] | null;
    const hasCatFilter = !!catFilter && catFilter.length > 0;
    const hasTagFilter = !!tagFilter && tagFilter.length > 0;
    if (!hasCatFilter && !hasTagFilter) return true;
    const catMatches = hasCatFilter && category ? catFilter.includes(category) : false;
    const tagMatches = hasTagFilter
      ? tagFilter.some((t) => lowerTags.includes(t.toLowerCase().trim()))
      : false;
    return catMatches || tagMatches;
  });

  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  return eligible.slice(0, count) as Product[];
}
