/**
 * Migrate WordPress user data → Supabase authors table
 * Pulls: display_name, bio, website, social links
 * Then links authors to blog posts by author_name
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SQL_FILE = resolve(__dirname, "../10_204_132_8.sql");
const TABLE_PREFIX = "wp_fcvr0hzgpz_";

function cleanValue(val: string): string {
  if (val === "NULL") return "";
  return val.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function parseTable(sql: string, tableName: string): string[][] {
  const fullName = `${TABLE_PREFIX}${tableName}`;
  const allRows: string[][] = [];
  let searchFrom = 0;
  while (true) {
    const insertIdx = sql.indexOf(`INSERT INTO \`${fullName}\``, searchFrom);
    if (insertIdx === -1) break;
    const valuesIdx = sql.indexOf("VALUES", insertIdx);
    if (valuesIdx === -1) break;
    let pos = valuesIdx + 6;
    while (pos < sql.length && (sql[pos] === " " || sql[pos] === "\n" || sql[pos] === "\r")) pos++;
    while (pos < sql.length && sql[pos] === "(") {
      pos++;
      const values: string[] = [];
      let current = "";
      let inString = false;
      let escaped = false;
      while (pos < sql.length) {
        const ch = sql[pos];
        if (escaped) { current += ch; escaped = false; pos++; continue; }
        if (ch === "\\" && inString) { escaped = true; current += ch; pos++; continue; }
        if (ch === "'" && !inString) { inString = true; pos++; continue; }
        if (ch === "'" && inString) {
          if (pos + 1 < sql.length && sql[pos + 1] === "'") { current += "'"; pos += 2; continue; }
          inString = false; pos++; continue;
        }
        if (inString) { current += ch; pos++; continue; }
        if (ch === ",") { values.push(current.trim()); current = ""; pos++; continue; }
        if (ch === ")") { values.push(current.trim()); allRows.push(values); pos++; break; }
        current += ch; pos++;
      }
      while (pos < sql.length && (sql[pos] === "," || sql[pos] === "\n" || sql[pos] === "\r" || sql[pos] === " ")) pos++;
      if (pos < sql.length && sql[pos] === ";") { pos++; break; }
    }
    searchFrom = pos;
  }
  return allRows;
}

async function main() {
  console.log("Reading SQL dump...");
  const sql = readFileSync(SQL_FILE, "utf-8");

  // Parse users
  console.log("Parsing users...");
  const users = parseTable(sql, "users");

  // Parse usermeta
  console.log("Parsing usermeta...");
  const metaRows = parseTable(sql, "usermeta");

  // Build meta map: user_id → { key: value }
  const userMeta = new Map<string, Record<string, string>>();
  for (const row of metaRows) {
    const userId = row[1];
    const key = cleanValue(row[2]);
    const val = cleanValue(row[3]);
    if (!val) continue;
    if (!userMeta.has(userId)) userMeta.set(userId, {});
    userMeta.get(userId)![key] = val;
  }

  // Build author records
  console.log("Building author records...");
  const authors: {
    wp_user_id: string;
    display_name: string;
    bio: string | null;
    website: string | null;
    twitter: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    youtube: string | null;
  }[] = [];

  for (const row of users) {
    const wpId = row[0];
    const displayName = cleanValue(row[9]);
    const websiteFromUser = cleanValue(row[5]);
    const meta = userMeta.get(wpId) || {};

    const bio = meta.description || null;
    const website = meta["company-website-url"] || websiteFromUser || null;
    const twitter = meta.sabtwitter || meta.twitter || meta.social_media_url_twitter || meta.twitter_link || null;
    const facebook = meta.sabfacebook || meta.facebook || meta.social_media_url_facebook || meta.facebook_link || null;
    const instagram = meta.sabinstagram || meta.instagram || meta.social_media_url_instagram || null;
    const linkedin = meta.sablinkedin || meta.linkedin || meta.social_media_url_linkedin || meta.linkedin_link || null;
    const youtube = meta.sabyoutube || meta.youtube || meta.social_media_url_youtube || null;

    if (!displayName) continue;

    authors.push({
      wp_user_id: wpId,
      display_name: displayName,
      bio: bio && bio.length > 3 ? bio : null,
      website: website || null,
      twitter: twitter || null,
      facebook: facebook || null,
      instagram: instagram || null,
      linkedin: linkedin || null,
      youtube: youtube || null,
    });
  }

  console.log(`  Built ${authors.length} author records`);

  // Create authors table if not exists
  console.log("Creating authors table...");
  const { error: createError } = await supabase.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS authors (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        wp_user_id TEXT,
        display_name TEXT NOT NULL,
        bio TEXT,
        website TEXT,
        twitter TEXT,
        facebook TEXT,
        instagram TEXT,
        linkedin TEXT,
        youtube TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(display_name)
      );
      ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Authors are viewable by everyone" ON authors;
      CREATE POLICY "Authors are viewable by everyone" ON authors FOR SELECT USING (true);
    `,
  });

  if (createError) {
    // Table might already exist or rpc not available, try direct insert
    console.log("  Note: Could not run RPC, table may already exist. Proceeding with inserts...");
  }

  // Insert authors
  console.log("Inserting authors...");
  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < authors.length; i += BATCH) {
    const batch = authors.slice(i, i + BATCH);
    const { error } = await supabase.from("authors").upsert(batch, { onConflict: "display_name" });
    if (error) {
      // Try one at a time
      for (const author of batch) {
        const { error: singleErr } = await supabase.from("authors").upsert(author, { onConflict: "display_name" });
        if (!singleErr) inserted++;
        else if (inserted < 3) console.error(`  Error: ${singleErr.message}`);
      }
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  Inserted ${inserted} authors`);

  // Link blog posts to authors
  console.log("Linking blog posts to authors...");
  const { data: allAuthors } = await supabase.from("authors").select("id, display_name");
  if (allAuthors) {
    const nameToId = new Map<string, string>();
    allAuthors.forEach((a) => nameToId.set(a.display_name, a.id));

    let linked = 0;
    let page = 0;
    while (true) {
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("id, author_name")
        .not("author_name", "is", null)
        .range(page * 500, (page + 1) * 500 - 1);

      if (!posts || posts.length === 0) break;

      for (const post of posts) {
        const authorId = nameToId.get(post.author_name);
        if (authorId) {
          await supabase.from("blog_posts").update({ author_id: authorId }).eq("id", post.id);
          linked++;
        }
      }
      page++;
    }
    console.log(`  Linked ${linked} posts to authors`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
