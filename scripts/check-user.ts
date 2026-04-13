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
  // Check auth users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const jb = users?.find(u => u.email === "jbowman@vizyplan.com");
  console.log("Auth user:", jb ? { id: jb.id, email: jb.email, created: jb.created_at } : "NOT FOUND");

  // Check user_profiles
  if (jb) {
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", jb.id)
      .single();
    console.log("Profile:", profile || "NOT FOUND", error?.message || "");
  }
}

main().catch(console.error);
