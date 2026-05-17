import { supabaseAdmin } from "./supabase";

// Shape returned to the blog byline renderer. Same fields BlogPostClient
// already expects on its `author` prop — adding new ones means updating
// the consumer too.
export interface ResolvedAuthor {
  display_name: string;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
  avatar_url: string | null;
}

interface ResolveInput {
  author_id?: string | null;
  author_name?: string | null;
}

// Resolve a post's byline by merging the `authors` row with the
// linked `user_profiles` row (when present). Member-authors get live
// data from their member profile; external authors keep their
// authors-table data.
//
// Lookup order:
//   1. By author_id (the strong ref)
//   2. By author_name (display_name match) — covers WordPress imports
//      where author_id was never set
//
// Returns null if no author info is available at all (post should
// fall back to post.author_name in the renderer).
interface AuthorRow extends Partial<ResolvedAuthor> {
  user_profile_id?: string | null;
}

interface ProfileRow {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  social_twitter: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
}

export async function resolveAuthor(input: ResolveInput): Promise<ResolvedAuthor | null> {
  if (!supabaseAdmin) return null;

  let authorRow: AuthorRow | null = null;

  if (input.author_id) {
    const { data } = await supabaseAdmin
      .from("authors")
      .select(
        "display_name, bio, website, twitter, facebook, instagram, linkedin, youtube, avatar_url, user_profile_id"
      )
      .eq("id", input.author_id)
      .maybeSingle();
    authorRow = (data ?? null) as AuthorRow | null;
  }

  if (!authorRow && input.author_name) {
    const { data } = await supabaseAdmin
      .from("authors")
      .select(
        "display_name, bio, website, twitter, facebook, instagram, linkedin, youtube, avatar_url, user_profile_id"
      )
      .ilike("display_name", input.author_name)
      .maybeSingle();
    authorRow = (data ?? null) as AuthorRow | null;
  }

  let profileRow: ProfileRow | null = null;

  if (authorRow?.user_profile_id) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select(
        "display_name, bio, avatar_url, website, social_twitter, social_facebook, social_instagram, social_linkedin, social_youtube"
      )
      .eq("id", authorRow.user_profile_id)
      .maybeSingle();
    profileRow = (data ?? null) as ProfileRow | null;
  }

  if (!authorRow && !profileRow) return null;

  // Merge: prefer profile values when linked, fall back to author row.
  // Empty strings count as "not set" so a member with a blank bio
  // doesn't blank out an existing authors-table bio.
  const pick = <T>(a: T | null | undefined, b: T | null | undefined): T | null => {
    if (a !== null && a !== undefined && a !== "") return a;
    if (b !== null && b !== undefined && b !== "") return b;
    return null;
  };

  return {
    display_name: pick(profileRow?.display_name, authorRow?.display_name) || input.author_name || "",
    bio: pick(profileRow?.bio, authorRow?.bio),
    website: pick(profileRow?.website, authorRow?.website),
    twitter: pick(profileRow?.social_twitter, authorRow?.twitter),
    facebook: pick(profileRow?.social_facebook, authorRow?.facebook),
    instagram: pick(profileRow?.social_instagram, authorRow?.instagram),
    linkedin: pick(profileRow?.social_linkedin, authorRow?.linkedin),
    youtube: pick(profileRow?.social_youtube, authorRow?.youtube),
    avatar_url: pick(profileRow?.avatar_url, authorRow?.avatar_url),
  };
}
