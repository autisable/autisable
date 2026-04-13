import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { count } = await supabase.from("comments").select("id", { count: "exact", head: true });
  console.log("Total comments:", count);

  const { data: sample } = await supabase.from("comments").select("id, page, name, comment").limit(3);
  console.log("Samples:", sample?.map(c => ({ page: c.page, name: c.name, comment: c.comment?.slice(0, 50) })));

  // Test anon read
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: anonRead, error: anonErr } = await anon.from("comments").select("id").limit(1);
  console.log("Anon read:", anonRead ? `OK (${anonRead.length})` : `FAIL: ${anonErr?.message}`);
}
main().catch(console.error);
