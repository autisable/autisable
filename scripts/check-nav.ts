import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: rows, error } = await admin.from("nav_links").select("*").order("position");
  console.log("Service role sees nav_links:", rows?.length || 0, error?.message || "");
  rows?.forEach((r) => console.log(`  [${r.position}] ${r.label} → ${r.url}`));

  const { data: anonRows, error: anonErr } = await anon.from("nav_links").select("*").order("position");
  console.log("\nAnon (browser) sees:", anonRows?.length || 0, anonErr?.message || "");
}
main().catch(console.error);
