import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Get all authors
  const { data: authors } = await supabase.from("authors").select("id, display_name");
  if (!authors) return;
  
  const nameToId = new Map<string, string>();
  authors.forEach(a => nameToId.set(a.display_name, a.id));
  console.log(`Loaded ${authors.length} authors`);

  // Get all posts missing author_id but having author_name
  let linked = 0;
  let page = 0;
  while (true) {
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("id, author_name")
      .not("author_name", "is", null)
      .is("author_id", null)
      .range(page * 500, (page + 1) * 500 - 1);

    if (!posts || posts.length === 0) break;
    console.log(`  Page ${page + 1}: ${posts.length} posts to link`);

    for (const post of posts) {
      const authorId = nameToId.get(post.author_name);
      if (authorId) {
        await supabase.from("blog_posts").update({ author_id: authorId }).eq("id", post.id);
        linked++;
      }
    }
    page++;
  }
  console.log(`\nLinked ${linked} posts to authors`);
}
main().catch(console.error);
