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
  const { error } = await supabase.from("user_profiles").insert({
    id: "2404832b-2aca-4217-9010-c5abd9dbf0c5",
    email: "jbowman@vizyplan.com",
    display_name: "Justin Bowman",
    role: "admin",
    status: "active",
  });

  if (error) console.error("Error:", error.message);
  else console.log("Profile created! You are now admin.");
}

main().catch(console.error);
