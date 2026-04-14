import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data } = await supabase.from("authors").select("*").in("display_name", ["Rob Gorski", "Joel Manzer", "Margalit Sturm Francus"]);
  data?.forEach(a => {
    console.log(`\n=== ${a.display_name} ===`);
    console.log("  bio:", a.bio?.slice(0, 80) || "NULL");
    console.log("  website:", a.website || "NULL");
    console.log("  twitter:", a.twitter || "NULL");
    console.log("  facebook:", a.facebook || "NULL");
    console.log("  instagram:", a.instagram || "NULL");
    console.log("  linkedin:", a.linkedin || "NULL");
    console.log("  youtube:", a.youtube || "NULL");
  });
}
main().catch(console.error);

// Check a Rob Gorski post
async function checkPost() {
  const { data } = await supabase.from("blog_posts").select("id, title, author_name, author_id").eq("author_name", "Rob Gorski").limit(3);
  console.log("\n=== Rob Gorski posts ===");
  data?.forEach(p => console.log(`  ${p.title?.slice(0, 50)} | author_id: ${p.author_id || "NULL"}`));
}
checkPost().catch(console.error);
