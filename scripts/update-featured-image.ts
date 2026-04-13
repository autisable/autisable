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
  const imageData = readFileSync(resolve(__dirname, "../public/VizyAdvocate.png"));

  const { error: uploadError } = await supabase.storage
    .from("Media")
    .upload("featured/VizyAdvocate.png", imageData, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) console.error("Upload error:", uploadError.message);
  else console.log("Uploaded to Supabase Storage");

  const newUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/Media/featured/VizyAdvocate.png`;

  const { data, error } = await supabase
    .from("blog_posts")
    .update({ image: newUrl })
    .eq("slug", "504-plan-vs-iep-which-one-does-your-child-need")
    .select("id, slug, title");

  if (error) console.error("DB error:", error.message);
  else console.log("Updated blog post:", data);
}

main().catch(console.error);
