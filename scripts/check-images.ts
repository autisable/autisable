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

async function main() {
  // Get the latest 10 posts
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, title, image, date")
    .eq("is_published", true)
    .order("date", { ascending: false })
    .limit(10);

  if (!posts) return;
  
  for (const post of posts) {
    const hasImage = post.image && post.image.trim() !== "";
    let imageWorks = false;
    
    if (hasImage) {
      try {
        const res = await fetch(post.image, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        imageWorks = res.ok;
      } catch {
        imageWorks = false;
      }
    }

    console.log(`${hasImage ? (imageWorks ? "✓" : "✗ BROKEN") : "— NO IMG"} | ${post.date?.slice(0,10)} | ${post.title?.slice(0, 60)}`);
    if (hasImage && !imageWorks) {
      console.log(`    URL: ${post.image?.slice(0, 120)}`);
    }
  }
}

main().catch(console.error);
