import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { count: total } = await supabase.from("blog_posts").select("id", { count: "exact", head: true });
  console.log("Total posts in db:", total);

  const { count: published } = await supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true);
  console.log("Published:", published);

  const { count: drafts } = await supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", false);
  console.log("Drafts (is_published=false):", drafts);

  const { count: scheduled } = await supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("draft_status", "ready_for_scheduling");
  console.log("draft_status=ready_for_scheduling:", scheduled);

  const { count: pending } = await supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("draft_status", "pending_review");
  console.log("draft_status=pending_review:", pending);

  const { count: inProg } = await supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("draft_status", "in_progress");
  console.log("draft_status=in_progress:", inProg);

  const { data: sample } = await supabase
    .from("blog_posts")
    .select("title, slug, is_published, draft_status")
    .eq("is_published", false)
    .limit(5);
  console.log("\nSample drafts:");
  sample?.forEach((p) => console.log(`  [${p.draft_status}] ${p.title?.slice(0, 50)} | ${p.slug}`));

  // Test what the anon user sees (admin uses anon key on client side)
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { count: anonDrafts, error: anonErr } = await anon.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", false);
  console.log("\nAnon (browser) sees drafts count:", anonDrafts, anonErr?.message || "");
}
main().catch(console.error);
