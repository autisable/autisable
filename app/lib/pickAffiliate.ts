import { supabaseAdmin } from "./supabase";

export interface Affiliate {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  cta_label: string | null;
  click_url: string;
  banner_300x250_url: string | null;
  banner_468x60_url: string | null;
}

/**
 * Server-side affiliate picker. Used from RSC pages to choose one active
 * affiliate for a placement, optionally filtered to a content category.
 * Each render picks fresh, so different page loads naturally rotate.
 *
 * Returns null if nothing eligible — caller should render no banner at all
 * rather than showing an empty slot.
 */
export async function pickAffiliate(
  placement: "sidebar" | "footer",
  category: string | null = null
): Promise<Affiliate | null> {
  if (!supabaseAdmin) return null;
  const placementCol = placement === "sidebar" ? "show_in_sidebar" : "show_in_footer";

  const { data } = await supabaseAdmin
    .from("affiliates")
    .select("id, slug, name, tagline, cta_label, click_url, banner_300x250_url, banner_468x60_url, category_filter")
    .eq("is_active", true)
    .eq(placementCol, true)
    .order("position", { ascending: true });

  if (!data || data.length === 0) return null;

  const eligible = data.filter((a) => {
    const filter = a.category_filter as string[] | null;
    if (!filter || filter.length === 0) return true;
    if (!category) return false;
    return filter.includes(category);
  });

  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)] as Affiliate;
}
