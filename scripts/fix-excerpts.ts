/**
 * Clean up excerpts — strip HTML tags from all post excerpts
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

const supabase = createClient(
  env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  let page = 0;
  let fixed = 0;
  const PAGE_SIZE = 500;

  while (true) {
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("id, excerpt")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!posts || posts.length === 0) break;

    for (const post of posts) {
      if (!post.excerpt) continue;
      
      // Check if excerpt contains HTML
      if (post.excerpt.includes("<")) {
        const clean = post.excerpt
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 300);
        
        if (clean !== post.excerpt) {
          await supabase
            .from("blog_posts")
            .update({ excerpt: clean || null })
            .eq("id", post.id);
          fixed++;
        }
      }
    }

    page++;
  }

  console.log(`Cleaned ${fixed} excerpts`);
}

main().catch(console.error);
