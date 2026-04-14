import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Find all authors with HTML in their bios
  const { data: authors } = await supabase.from("authors").select("id, display_name, bio").not("bio", "is", null);
  if (!authors) return;

  let fixed = 0;
  for (const author of authors) {
    if (!author.bio || !author.bio.includes("<")) continue;
    
    // Strip HTML tags but keep the text content
    const clean = author.bio
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>[^<]*<\/a>/gi, (_, url) => url)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    
    if (clean !== author.bio) {
      await supabase.from("authors").update({ bio: clean }).eq("id", author.id);
      fixed++;
      if (fixed <= 5) console.log(`  Fixed: ${author.display_name} — "${clean.slice(0, 60)}..."`);
    }
  }
  console.log(`\nCleaned ${fixed} author bios with HTML tags`);
}
main().catch(console.error);
