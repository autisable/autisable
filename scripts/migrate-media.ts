/**
 * Media Migration Script
 *
 * Scans all blog posts for image URLs pointing to WordPress,
 * downloads them, uploads to Supabase Storage, and updates
 * the post content + featured image with new URLs.
 *
 * BEFORE RUNNING:
 * 1. Create a storage bucket called "media" in Supabase Dashboard
 *    (Storage → New Bucket → name: "media", Public: ON)
 * 2. Make sure .env.local has your Supabase keys
 *
 * RUN: npm run migrate-media
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, extname } from "path";

// Load env
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET = "Media";
const BATCH_SIZE = 10; // concurrent downloads
const CACHE_DIR = resolve(__dirname, "../.media-cache");

function log(msg: string) {
  console.log(`[media] ${msg}`);
}

/**
 * Extract all image URLs from HTML content that point to WordPress
 */
function extractImageUrls(content: string): string[] {
  const urls = new Set<string>();

  // Match src="..." and src='...' in img tags
  const srcRegex = /(?:src|href)=["'](https?:\/\/[^"']+?\.(?:jpg|jpeg|png|gif|webp|svg|bmp|ico)(?:\?[^"']*)?)["']/gi;
  let match;
  while ((match = srcRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }

  // Also match background-image: url(...)
  const bgRegex = /url\(["']?(https?:\/\/[^"')]+?\.(?:jpg|jpeg|png|gif|webp|svg|bmp|ico)(?:\?[^"')]*)?)["']?\)/gi;
  while ((match = bgRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }

  return Array.from(urls);
}

/**
 * Filter to only WordPress/autisable hosted images
 */
function isWordPressImage(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("autisable.com") ||
    lower.includes("autismcleveland.net") ||
    lower.includes("wp-content/uploads")
  );
}

/**
 * Generate a clean storage path from the original URL
 * e.g., https://autisable.com/wp-content/uploads/2024/04/image.jpg → uploads/2024/04/image.jpg
 */
function urlToStoragePath(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;

    // Strip /wp-content/ prefix
    path = path.replace(/^\/wp-content\//, "");

    // Remove leading slash
    path = path.replace(/^\//, "");

    // Remove query params from filename
    path = path.split("?")[0];

    // Ensure it has a valid extension
    if (!path.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i)) {
      path += ".jpg";
    }

    return path;
  } catch {
    // Fallback: hash the URL
    const hash = Buffer.from(url).toString("base64url").slice(0, 20);
    const ext = extname(url.split("?")[0]) || ".jpg";
    return `misc/${hash}${ext}`;
  }
}

/**
 * Download an image with timeout and retry
 */
async function downloadImage(url: string, retries = 2): Promise<Buffer | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Autisable Migration Bot)",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (attempt === retries) return null;
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      if (attempt === retries) return null;
    }
  }
  return null;
}

/**
 * Get content type from file extension
 */
function getContentType(path: string): string {
  const ext = extname(path).toLowerCase();
  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
  };
  return types[ext] || "image/jpeg";
}

// ── Main ───────────────────────────────────────────────

async function main() {
  // Create local cache directory
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Track already-migrated URLs to avoid re-uploading
  const migratedPath = resolve(CACHE_DIR, "migrated-urls.json");
  let migratedUrls: Record<string, string> = {};
  if (existsSync(migratedPath)) {
    migratedUrls = JSON.parse(readFileSync(migratedPath, "utf-8"));
    log(`Loaded ${Object.keys(migratedUrls).length} previously migrated URLs from cache`);
  }

  // ── Step 1: Get all posts ──
  log("Fetching all blog posts from Supabase...");
  const posts: { id: string; slug: string; content: string; image: string | null }[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, slug, content, image")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to fetch posts:", error.message);
      return;
    }
    if (!data || data.length === 0) break;
    posts.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  log(`  Found ${posts.length} posts`);

  // ── Step 2: Collect all unique WordPress image URLs ──
  log("Scanning posts for WordPress image URLs...");
  const allUrls = new Set<string>();
  const postImageMap = new Map<string, string[]>(); // post.id → [urls]

  for (const post of posts) {
    const urls = extractImageUrls(post.content || "");
    const wpUrls = urls.filter(isWordPressImage);

    // Also check featured image
    if (post.image && isWordPressImage(post.image)) {
      wpUrls.push(post.image);
    }

    if (wpUrls.length > 0) {
      postImageMap.set(post.id, wpUrls);
      wpUrls.forEach((u) => allUrls.add(u));
    }
  }

  log(`  Found ${allUrls.size} unique WordPress images across ${postImageMap.size} posts`);

  // ── Step 3: Download and upload images ──
  log("Downloading and uploading images to Supabase Storage...");
  const urlToNewUrl = new Map<string, string>();
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const urlArray = Array.from(allUrls);

  for (let i = 0; i < urlArray.length; i += BATCH_SIZE) {
    const batch = urlArray.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (originalUrl) => {
        // Check cache first
        if (migratedUrls[originalUrl]) {
          urlToNewUrl.set(originalUrl, migratedUrls[originalUrl]);
          skipped++;
          return;
        }

        const storagePath = urlToStoragePath(originalUrl);
        const imageData = await downloadImage(originalUrl);

        if (!imageData) {
          failed++;
          return;
        }

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, imageData, {
            contentType: getContentType(storagePath),
            upsert: true,
          });

        if (uploadError) {
          failed++;
          if (failed <= 5) {
            console.error(`  Upload failed for ${storagePath}: ${uploadError.message}`);
          }
          return;
        }

        // Build public URL
        const newUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
        urlToNewUrl.set(originalUrl, newUrl);
        migratedUrls[originalUrl] = newUrl;
        downloaded++;
      })
    );

    // Save cache periodically
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= urlArray.length) {
      writeFileSync(migratedPath, JSON.stringify(migratedUrls, null, 2));
      log(`  Progress: ${Math.min(i + BATCH_SIZE, urlArray.length)}/${urlArray.length} (${downloaded} new, ${skipped} cached, ${failed} failed)`);
    }
  }

  // Final cache save
  writeFileSync(migratedPath, JSON.stringify(migratedUrls, null, 2));
  log(`  Done: ${downloaded} downloaded, ${skipped} from cache, ${failed} failed`);

  // ── Step 4: Update post content with new URLs ──
  log("Updating blog posts with new image URLs...");
  let updatedPosts = 0;

  for (const post of posts) {
    const urls = postImageMap.get(post.id);
    if (!urls) continue;

    let newContent = post.content || "";
    let newImage = post.image;
    let changed = false;

    for (const originalUrl of urls) {
      const newUrl = urlToNewUrl.get(originalUrl);
      if (!newUrl) continue;

      if (newContent.includes(originalUrl)) {
        newContent = newContent.split(originalUrl).join(newUrl);
        changed = true;
      }

      if (newImage === originalUrl) {
        newImage = newUrl;
        changed = true;
      }
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from("blog_posts")
        .update({ content: newContent, image: newImage })
        .eq("id", post.id);

      if (updateError) {
        console.error(`  Failed to update post ${post.slug}: ${updateError.message}`);
      } else {
        updatedPosts++;
      }
    }
  }

  log(`  Updated ${updatedPosts} posts with new image URLs`);

  // ── Done ──
  log("──────────────────────────────────");
  log("Media migration complete!");
  log(`  Images downloaded: ${downloaded}`);
  log(`  Images from cache: ${skipped}`);
  log(`  Images failed: ${failed}`);
  log(`  Posts updated: ${updatedPosts}`);
  log("──────────────────────────────────");
}

main().catch(console.error);
