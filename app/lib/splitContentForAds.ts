// Split rendered post HTML into paragraph-bounded chunks so the article
// template can interleave inline ad slots between paragraphs (not at fixed
// pixel offsets). Paragraph-based positions stay sensible across devices
// and across edits — adding or removing a paragraph shifts every ad slot
// in the same direction, which is the correct behavior.
//
// Each returned chunk ends at a `</p>` boundary (with the closing tag kept
// on the chunk) except possibly the final tail chunk, which preserves any
// trailing non-paragraph markup so we don't drop content from the end of
// the post.
export function splitByParagraph(html: string): string[] {
  if (!html) return [];
  const parts = html.split(/<\/p>/i);
  const chunks: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i < parts.length - 1) {
      chunks.push(parts[i] + "</p>");
    } else if (parts[i].trim().length > 0) {
      chunks.push(parts[i]);
    }
  }
  return chunks;
}

// Decide where inline ads should land for a post with `paragraphCount`
// paragraph chunks. Returns a set of zero-indexed positions: "after this
// chunk, insert an ad". Empty set means the post is too short and we'll
// rely on the existing bottom banner only.
//
// The thresholds (min 6 paragraphs, max 3 ads, first ad after the 4th
// paragraph) come from the brief: first screenful should be mostly
// content, ads should be paragraph-anchored, and a third placement is
// optional only if there's enough remaining content to justify it.
export function chooseInlineAdPositions(paragraphCount: number, maxAds = 3): Set<number> {
  const positions = new Set<number>();
  if (paragraphCount < 6) return positions; // too short — keep article clean

  // First ad: after the 4th paragraph (index 3). On long posts this lands
  // roughly past the introduction and below the fold on most viewports.
  positions.add(3);

  if (maxAds < 2) return positions;

  // Middle ad: floor(count / 2), but ensure at least 3 paragraphs of gap
  // from the first slot so two ads don't appear in the same screenful.
  const mid = Math.floor(paragraphCount / 2);
  if (mid - 3 >= 3) positions.add(mid);

  if (maxAds < 3) return positions;

  // Third ad: near the end (count - 2) — leaves a paragraph below it so
  // the reader exits on content, not on a banner. Skip if it'd collide
  // with the middle slot.
  const tail = paragraphCount - 2;
  if (tail > mid + 2 && tail > 3) positions.add(tail);

  return positions;
}
