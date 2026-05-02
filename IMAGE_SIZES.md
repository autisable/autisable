# Image size reference

Quick reference for every image upload across Autisable. Use these dimensions for the cleanest result; the site will accept larger or different ratios but may crop.

## Member profile

| Field | Recommended size | Aspect | Notes |
|---|---|---|---|
| Avatar (profile picture) | **400 × 400** | 1:1 (square) | Cropped to a circle on display. Crop modal enforces 1:1. |
| Cover photo (profile banner) | **1500 × 500** | 3:1 (wide banner) | Crop modal enforces 3:1. Looks best with the focal subject in the middle band. |

## Blog posts

| Field | Recommended size | Aspect | Notes |
|---|---|---|---|
| Featured image | **1200 × 630** | 1.91:1 | Top of the post. Also used as the auto-generated social-share card if no OG image is set. |
| OG image (override) | **1200 × 630** | 1.91:1 | Optional. Overrides the auto-card on Facebook / LinkedIn / X / Threads. Leave blank to use the featured image. |
| Inline images (in body) | Up to **1600 wide** | any | Body images are responsive — anything 1600px wide or smaller looks good. JPEG preferred for photos, PNG for diagrams/screenshots. |

## Community feed

| Field | Recommended size | Aspect | Notes |
|---|---|---|---|
| Status update image | **1200 wide** (any height up to 1600px) | any | Cropped to fit the card on display. |

## Site-level

| Field | Recommended size | Aspect | Notes |
|---|---|---|---|
| Homepage social-share card | **1200 × 1200** (current) or **1200 × 630** (preferred) | 1:1 or 1.91:1 | Lives in `/public/Logo1.jpeg`. Square works on Threads/Pinterest; FB/LinkedIn prefer 1.91:1. |
| Site logo (header) | **600 × 160** | ~3.75:1 | `/public/Logo.png` |

## File format & size limits

- **Allowed formats:** JPG, PNG, WebP, GIF
- **Max file size:** 5 MB per image
- **Recommended formats:**
  - **JPEG (.jpg)** for photos
  - **PNG** for graphics, diagrams, anything with transparency
  - **WebP** if your tool supports it (smaller files at the same quality)
  - **GIF** only when you actually need animation

## Tips

- Don't upload phone screenshots taller than ~2000px — they'll be displayed small but waste bandwidth and storage.
- For featured images, **the focal point should be roughly centered** since aggressive crops happen on small screens.
- The crop modal in profile uploads exports JPEG at quality 0.92 — if you start with a PNG and care about color fidelity, upload it as a PNG first and the editor preserves the original.
