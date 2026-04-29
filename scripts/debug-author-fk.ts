import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((l) => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Pull authors twice to see if pagination matches
  const { data: page1 } = await supabase.from("authors").select("id, display_name").range(0, 999);
  console.log("Authors page 1:", page1?.length);

  const { count } = await supabase.from("authors").select("id", { count: "exact", head: true });
  console.log("Total authors count:", count);

  // Look up "Joel Manzer"
  const { data: joel } = await supabase.from("authors").select("id, display_name").eq("display_name", "Joel Manzer").single();
  console.log("Joel:", joel);

  // Try inserting a test row to see what FK error looks like
  const testAuthorId = joel?.id;
  if (testAuthorId) {
    const { error } = await supabase.from("blog_posts").upsert({
      slug: "test-fk-check-12345",
      title: "FK Test",
      content: "test",
      author_id: testAuthorId,
      author_name: "Joel Manzer",
      is_published: false,
    }, { onConflict: "slug" });
    console.log("Test insert with valid author_id:", error?.message || "SUCCESS");
    if (!error) await supabase.from("blog_posts").delete().eq("slug", "test-fk-check-12345");
  }

  // Try inserting with a fake author_id
  const { error: fakeErr } = await supabase.from("blog_posts").upsert({
    slug: "test-fk-fake-12345",
    title: "Fake FK Test",
    content: "test",
    author_id: "00000000-0000-0000-0000-000000000000",
    author_name: "Fake",
    is_published: false,
  }, { onConflict: "slug" });
  console.log("Test insert with fake author_id:", fakeErr?.message || "SUCCESS");
  if (!fakeErr) await supabase.from("blog_posts").delete().eq("slug", "test-fk-fake-12345");
}

main().catch(console.error);
