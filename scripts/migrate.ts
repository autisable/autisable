/**
 * WordPress → Supabase Migration Script
 *
 * Reads the WordPress SQL dump and migrates:
 * - Posts (publish status, type=post) → blog_posts
 * - Comments (approved) → comments
 * - Categories → mapped to blog_posts.category
 * - Nav links and site settings
 *
 * BEFORE RUNNING:
 * 1. Run supabase-schema.sql in your Supabase SQL Editor
 * 2. Make sure .env.local has your Supabase keys
 *
 * RUN: npm run migrate
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const SQL_FILE = resolve(__dirname, "../10_204_132_8.sql");
const TABLE_PREFIX = "wp_fcvr0hzgpz_";

function log(msg: string) {
  console.log(`[migrate] ${msg}`);
}

function cleanValue(val: string): string {
  if (val === "NULL") return "";
  return val
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function estimateReadTime(content: string): string {
  const text = content.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 250));
  return `${minutes} min read`;
}

function makeExcerpt(content: string, maxLen = 300): string {
  const text = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s\S*$/, "") + "...";
}

function extractFirstImage(content: string): string | null {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * Parse all rows from INSERT INTO statements for a given table.
 * Handles escaped quotes, multi-line content, and all MySQL edge cases.
 */
function parseTable(sql: string, tableName: string): string[][] {
  const fullName = `${TABLE_PREFIX}${tableName}`;
  const allRows: string[][] = [];

  // Find each INSERT INTO ... VALUES block
  let searchFrom = 0;
  while (true) {
    const insertIdx = sql.indexOf(`INSERT INTO \`${fullName}\``, searchFrom);
    if (insertIdx === -1) break;

    const valuesIdx = sql.indexOf("VALUES", insertIdx);
    if (valuesIdx === -1) break;

    let pos = valuesIdx + 6;
    // Skip whitespace/newlines
    while (pos < sql.length && (sql[pos] === " " || sql[pos] === "\n" || sql[pos] === "\r")) pos++;

    // Parse rows until we hit a semicolon
    while (pos < sql.length && sql[pos] === "(") {
      pos++; // skip opening (

      const values: string[] = [];
      let current = "";
      let inString = false;
      let escaped = false;

      while (pos < sql.length) {
        const ch = sql[pos];

        if (escaped) {
          current += ch;
          escaped = false;
          pos++;
          continue;
        }

        if (ch === "\\" && inString) {
          escaped = true;
          current += ch;
          pos++;
          continue;
        }

        if (ch === "'" && !inString) {
          inString = true;
          pos++;
          continue;
        }

        if (ch === "'" && inString) {
          // Check for escaped '' (double single quote)
          if (pos + 1 < sql.length && sql[pos + 1] === "'") {
            current += "'";
            pos += 2;
            continue;
          }
          inString = false;
          pos++;
          continue;
        }

        if (inString) {
          current += ch;
          pos++;
          continue;
        }

        // Outside string
        if (ch === ",") {
          values.push(current.trim());
          current = "";
          pos++;
          continue;
        }

        if (ch === ")") {
          values.push(current.trim());
          allRows.push(values);
          pos++;
          break;
        }

        current += ch;
        pos++;
      }

      // Skip comma/whitespace between rows
      while (pos < sql.length && (sql[pos] === "," || sql[pos] === "\n" || sql[pos] === "\r" || sql[pos] === " ")) {
        pos++;
      }

      // Semicolon means end of this INSERT block
      if (pos < sql.length && sql[pos] === ";") {
        pos++;
        break;
      }
    }

    searchFrom = pos;
  }

  return allRows;
}

// ── Main ───────────────────────────────────────────────

async function main() {
  log("Reading SQL dump (this may take a moment for 314MB)...");
  const sql = readFileSync(SQL_FILE, "utf-8");
  log(`SQL dump loaded (${(sql.length / 1024 / 1024).toFixed(0)}MB)`);

  // ── Step 1: Parse terms ──
  log("Parsing terms...");
  const termsRows = parseTable(sql, "terms");
  const termsMap = new Map<string, string>();
  for (const row of termsRows) {
    termsMap.set(row[0], cleanValue(row[1]));
  }
  log(`  Found ${termsMap.size} terms`);

  // ── Step 2: Parse term_taxonomy ──
  log("Parsing term_taxonomy...");
  const taxonomyRows = parseTable(sql, "term_taxonomy");
  const categoryTaxonomyIds = new Map<string, string>();
  for (const row of taxonomyRows) {
    if (cleanValue(row[2]) === "category") {
      categoryTaxonomyIds.set(row[0], row[1]);
    }
  }
  log(`  Found ${categoryTaxonomyIds.size} category taxonomies`);

  // ── Step 3: Parse term_relationships ──
  log("Parsing term_relationships...");
  const relRows = parseTable(sql, "term_relationships");
  const postCategories = new Map<string, string>();
  for (const row of relRows) {
    const objectId = row[0];
    const termTaxId = row[1];
    if (categoryTaxonomyIds.has(termTaxId)) {
      const termId = categoryTaxonomyIds.get(termTaxId)!;
      const categoryName = termsMap.get(termId);
      if (categoryName && categoryName !== "Uncategorized") {
        postCategories.set(objectId, categoryName);
      }
    }
  }
  log(`  Mapped ${postCategories.size} post→category relationships`);

  // ── Step 4: Parse users ──
  log("Parsing users...");
  const userRows = parseTable(sql, "users");
  const usersMap = new Map<string, { displayName: string; email: string }>();
  for (const row of userRows) {
    usersMap.set(row[0], {
      displayName: cleanValue(row[9]),
      email: cleanValue(row[4]),
    });
  }
  log(`  Found ${usersMap.size} users`);

  // ── Step 5: Parse posts ──
  log("Parsing posts (this is the big one)...");
  const postRows = parseTable(sql, "posts");
  log(`  Found ${postRows.length} total post rows`);

  // Debug: show distribution of post_status and post_type
  const statusCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  for (const row of postRows) {
    const status = cleanValue(row[7]);
    const type = cleanValue(row[20]);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  log(`  Post statuses: ${JSON.stringify(statusCounts)}`);
  log(`  Post types: ${JSON.stringify(typeCounts)}`);

  // Filter to published posts of type 'post'
  const publishedPosts = postRows.filter((row) => {
    const postStatus = cleanValue(row[7]);
    const postType = cleanValue(row[20]);
    return postStatus === "publish" && postType === "post";
  });
  log(`  ${publishedPosts.length} published blog posts to migrate`);

  // Show sample row for verification
  if (publishedPosts.length > 0) {
    const sample = publishedPosts[0];
    log(`  Sample post: ID=${sample[0]}, title="${cleanValue(sample[5]).slice(0, 50)}", status="${cleanValue(sample[7])}", type="${cleanValue(sample[20])}"`);
  } else if (postRows.length > 0) {
    // Show first few rows for debugging
    for (let i = 0; i < Math.min(3, postRows.length); i++) {
      const row = postRows[i];
      log(`  Debug row ${i}: cols=${row.length}, [7]="${cleanValue(row[7])}", [20]="${cleanValue(row[20])}", title="${cleanValue(row[5]).slice(0, 40)}"`);
    }
  }

  // ── Step 6: Parse comments ──
  log("Parsing comments...");
  const commentRows = parseTable(sql, "comments");
  const approvedComments = commentRows.filter((row) => {
    const approved = cleanValue(row[10]);
    const commentType = cleanValue(row[12]);
    return approved === "1" && (commentType === "comment" || commentType === "");
  });
  log(`  Found ${commentRows.length} total comments, ${approvedComments.length} approved`);

  // ── Step 7: Insert blog posts ──
  log("Inserting blog posts into Supabase...");
  let postCount = 0;
  let errorCount = 0;
  const wpIdToSlug = new Map<string, string>();
  const BATCH_SIZE = 50;

  for (let i = 0; i < publishedPosts.length; i += BATCH_SIZE) {
    const batch = publishedPosts.slice(i, i + BATCH_SIZE);
    const rows = batch.map((row) => {
      const wpId = row[0];
      const authorId = row[1];
      const content = cleanValue(row[4]);
      const title = cleanValue(row[5]);
      const excerpt = cleanValue(row[6]);
      const slug = cleanValue(row[11]); // post_name
      const postDate = cleanValue(row[3]); // post_date_gmt
      const postModified = cleanValue(row[15]); // post_modified_gmt

      const author = usersMap.get(authorId);
      const category = postCategories.get(wpId) || "Uncategorized";
      const image = extractFirstImage(content);

      wpIdToSlug.set(wpId, slug);

      return {
        slug: slug || `post-${wpId}`,
        title: title || "Untitled",
        content,
        excerpt: excerpt || makeExcerpt(content),
        image,
        category,
        date: postDate && postDate !== "0000-00-00 00:00:00" ? postDate : new Date().toISOString(),
        date_modified: postModified && postModified !== "0000-00-00 00:00:00" ? postModified : null,
        read_time: estimateReadTime(content),
        author_name: author?.displayName || null,
        is_published: true,
        is_syndicated: false,
      };
    });

    const { error } = await supabase.from("blog_posts").upsert(rows, { onConflict: "slug" });
    if (error) {
      for (const row of rows) {
        const { error: singleError } = await supabase.from("blog_posts").upsert(row, { onConflict: "slug" });
        if (singleError) {
          errorCount++;
          if (errorCount <= 5) {
            console.error(`  Error inserting "${row.title.slice(0, 40)}": ${singleError.message}`);
          }
        } else {
          postCount++;
        }
      }
    } else {
      postCount += rows.length;
    }

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= publishedPosts.length) {
      log(`  Progress: ${Math.min(i + BATCH_SIZE, publishedPosts.length)}/${publishedPosts.length} posts`);
    }
  }
  log(`  Inserted ${postCount} posts (${errorCount} errors)`);

  // ── Step 8: Insert comments ──
  log("Inserting comments into Supabase...");
  let commentCount = 0;
  let commentErrors = 0;

  const { data: allPosts } = await supabase.from("blog_posts").select("id, slug");
  const slugToId = new Map<string, string>();
  if (allPosts) {
    allPosts.forEach((p) => slugToId.set(p.slug, p.id));
  }

  for (let i = 0; i < approvedComments.length; i += BATCH_SIZE) {
    const batch = approvedComments.slice(i, i + BATCH_SIZE);
    const rows = batch
      .map((row) => {
        const wpPostId = row[1];
        const author = cleanValue(row[2]);
        const content = cleanValue(row[8]);
        const date = cleanValue(row[7]);
        const slug = wpIdToSlug.get(wpPostId);

        if (!slug) return null;
        const supabasePostId = slugToId.get(slug);
        if (!supabasePostId) return null;

        const cleanedComment = content.replace(/<[^>]*>/g, "").trim();
        if (!cleanedComment) return null;

        return {
          page: `blog:${supabasePostId}`,
          name: author || "Anonymous",
          comment: cleanedComment,
          likes: 0,
          created_at: date && date !== "0000-00-00 00:00:00" ? date : new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (rows.length === 0) continue;

    const { error } = await supabase.from("comments").insert(rows);
    if (error) {
      commentErrors += rows.length;
      if (commentErrors <= 5) {
        console.error(`  Comment batch error: ${error.message}`);
      }
    } else {
      commentCount += rows.length;
    }

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= approvedComments.length) {
      log(`  Progress: ${Math.min(i + BATCH_SIZE, approvedComments.length)}/${approvedComments.length} comments`);
    }
  }
  log(`  Inserted ${commentCount} comments (${commentErrors} errors)`);

  // ── Step 9: Nav links & settings ──
  log("Setting up navigation and settings...");
  const navLinks = [
    { label: "Home", url: "/", position: 0, is_visible: true, is_external: false },
    { label: "Stories", url: "/blog", position: 1, is_visible: true, is_external: false },
    { label: "Podcasts", url: "/podcasts", position: 2, is_visible: true, is_external: false },
    { label: "Music", url: "/music", position: 3, is_visible: true, is_external: false },
    { label: "Community", url: "/community", position: 4, is_visible: true, is_external: false },
    { label: "Resources", url: "/resources", position: 5, is_visible: true, is_external: false },
    { label: "About", url: "/about", position: 6, is_visible: true, is_external: false },
    { label: "Contact", url: "/contact", position: 7, is_visible: true, is_external: false },
  ];
  await supabase.from("nav_links").upsert(navLinks);

  const settings = [
    { key: "site_title", value: "Autisable" },
    { key: "site_description", value: "Community, Stories & Resources for the Autism Community" },
    { key: "social_icons_visible", value: "true" },
  ];
  await supabase.from("site_settings").upsert(settings, { onConflict: "key" });

  // ── Done ──
  log("──────────────────────────────────");
  log("Migration complete!");
  log(`  Blog posts: ${postCount}`);
  log(`  Comments: ${commentCount}`);
  log(`  WP users found: ${usersMap.size}`);
  log("──────────────────────────────────");
  log("");
  log("NEXT STEPS:");
  log("1. Run the site: npm run dev");
  log("2. Create your admin account via /register");
  log("3. In Supabase SQL Editor, run:");
  log("   UPDATE user_profiles SET role = 'admin' WHERE email = 'your@email.com';");
  log("4. Access /admin to manage content");
}

main().catch(console.error);
