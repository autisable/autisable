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
 * affiliate for a placement, optionally filtered to a content category and/or
 * tags. Each render picks fresh, so different page loads naturally rotate.
 *
 * Filter logic per affiliate row:
 *   - If category_filter and tag_filter are both NULL → eligible everywhere
 *   - If category_filter is set → category must match
 *   - If tag_filter is set → at least one tag must match
 *   - If both are set → it's an OR (either matching is enough), so partners
 *     can be scoped broadly without forcing every targeted post to satisfy
 *     both conditions.
 *
 * Returns null if nothing eligible — caller should render no banner at all
 * rather than showing an empty slot.
 */
export async function pickAffiliate(
  placement: "sidebar" | "footer",
  category: string | null = null,
  tags: string[] | null = null
): Promise<Affiliate | null> {
  if (!supabaseAdmin) return null;
  const placementCol = placement === "sidebar" ? "show_in_sidebar" : "show_in_footer";

  const { data } = await supabaseAdmin
    .from("affiliates")
    .select("id, slug, name, tagline, cta_label, click_url, banner_300x250_url, banner_468x60_url, category_filter, tag_filter")
    .eq("is_active", true)
    .eq(placementCol, true)
    .order("position", { ascending: true });

  if (!data || data.length === 0) return null;

  const lowerTags = (tags || []).map((t) => t.toLowerCase().trim());

  const eligible = data.filter((a) => {
    const catFilter = a.category_filter as string[] | null;
    const tagFilter = a.tag_filter as string[] | null;
    const hasCatFilter = !!catFilter && catFilter.length > 0;
    const hasTagFilter = !!tagFilter && tagFilter.length > 0;

    // No restrictions → eligible everywhere
    if (!hasCatFilter && !hasTagFilter) return true;

    // OR semantics: either the category matches OR a tag matches
    const catMatches = hasCatFilter && category ? catFilter.includes(category) : false;
    const tagMatches = hasTagFilter
      ? tagFilter.some((t) => lowerTags.includes(t.toLowerCase().trim()))
      : false;

    return catMatches || tagMatches;
  });

  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)] as Affiliate;
}
