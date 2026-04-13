/**
 * Fix missing featured images by extracting from post content
 * RUN: npx tsx scripts/fix-images.ts
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
  const { count: total } = await supabase.from("blog_posts").select("id", { count: "exact", head: true });
  const { count: noImage } = await supabase.from("blog_posts").select("id", { count: "exact", head: true }).or("image.is.null,image.eq.");

  console.log(`Total posts: ${total}`);
  console.log(`Missing featured image: ${noImage}`);

  let fixed = 0;
  let page = 0;
  const PAGE_SIZE = 500;

  while (true) {
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("id, content, image")
      .or("image.is.null,image.eq.")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!posts || posts.length === 0) break;

    for (const post of posts) {
      if (!post.content) continue;

      const match = post.content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        const { error } = await supabase
          .from("blog_posts")
          .update({ image: match[1] })
          .eq("id", post.id);

        if (!error) fixed++;
      }
    }

    console.log(`  Processed page ${page + 1}...`);
    page++;
  }

  console.log(`\nFixed ${fixed} posts by extracting image from content`);
  console.log(`Still missing: ${(noImage || 0) - fixed} posts have no images at all`);
}

main().catch(console.error);
