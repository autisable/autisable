import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/app/lib/supabase";
import FollowControls from "@/app/components/profile/FollowControls";
import FollowersList from "@/app/components/profile/FollowersList";
import JournalTab from "@/app/components/profile/JournalTab";

export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const SELF_ID_TAG_LABELS: Record<string, { label: string; chipClass: string }> = {
  parent_guardian: {
    label: "Parent / Guardian",
    chipClass: "bg-purple-100 text-purple-700 border-purple-200",
  },
  neurodiverse: {
    label: "Neurodiverse",
    chipClass: "bg-brand-blue-light text-brand-blue border-brand-blue/20",
  },
  professional: {
    label: "Professional",
    chipClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

const SOCIAL_FIELDS = [
  { key: "website", label: "Website" },
  { key: "social_twitter", label: "Twitter / X" },
  { key: "social_facebook", label: "Facebook" },
  { key: "social_instagram", label: "Instagram" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_youtube", label: "YouTube" },
  { key: "social_tiktok", label: "TikTok" },
] as const;

const TABS = ["Posts", "Journal", "About", "Followers"] as const;
type Tab = typeof TABS[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("display_name, bio, avatar_url")
    .eq("id", id)
    .single();
  if (!profile) return { title: "Member Not Found" };
  return {
    title: `${profile.display_name} — Autisable`,
    description: profile.bio || `${profile.display_name} on Autisable.`,
  };
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "Posts";

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, display_name, bio, avatar_url, cover_photo_url, role, status, created_at, website, social_twitter, social_facebook, social_instagram, social_linkedin, social_youtube, social_tiktok, self_id_tags")
    .eq("id", id)
    .single();

  if (!profile || profile.status !== "active") notFound();

  // Posts authored by this member (current join is via author_name match — most
  // reliable until we unify authors/user_profiles).
  const [postsRes, followerCountRes, followingCountRes] = await Promise.all([
    supabaseAdmin
      .from("blog_posts")
      .select("slug, title, excerpt, image, date")
      .eq("is_published", true)
      .eq("author_name", profile.display_name)
      .order("date", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", id),
    supabaseAdmin
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", id),
  ]);

  const posts = postsRes.data || [];
  const followerCount = followerCountRes.count || 0;
  const followingCount = followingCountRes.count || 0;

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const socials = SOCIAL_FIELDS
    .map((f) => ({ ...f, url: (profile as Record<string, unknown>)[f.key] as string | null }))
    .filter((f) => f.url);

  const tags: string[] = Array.isArray(profile.self_id_tags) ? profile.self_id_tags : [];
  const firstName = profile.display_name?.split(" ")[0];

  return (
    <div>
      {/* Cover banner — vivid Autisable gradient when no cover photo set, so it
          reads as an intentional brand banner rather than an empty gray block. */}
      <div
        className="w-full h-44 sm:h-64 bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-orange-light"
        style={
          profile.cover_photo_url
            ? { backgroundImage: `url(${profile.cover_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Identity row — avatar overlapping cover, z-10 keeps it stacked above */}
        <div className="relative z-10 -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 mb-8">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white bg-white overflow-hidden shrink-0 shadow-md">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                width={160}
                height={160}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-blue-light to-brand-orange-light text-4xl font-bold text-white">
                {profile.display_name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 sm:pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">{profile.display_name}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              <span className="capitalize">{profile.role}</span> · Joined {memberSince}
            </p>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((t) => {
                  const meta = SELF_ID_TAG_LABELS[t];
                  if (!meta) return null;
                  return (
                    <span key={t} className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.chipClass}`}>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-base text-zinc-700 leading-relaxed mb-8 max-w-3xl">{profile.bio}</p>
        )}

        {/* Tabs */}
        <div className="border-b border-zinc-200 mb-8">
          <nav className="flex gap-6 overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <Link
                  key={t}
                  href={t === "Posts" ? `/member/${id}` : `/member/${id}?tab=${t}`}
                  scroll={false}
                  className={`pb-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? "border-brand-blue text-brand-blue"
                      : "border-transparent text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {t}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tab content + sidebar */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2">
            {tab === "Posts" && (
              <>
                {posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/blog/${p.slug}/`}
                        className="block p-5 bg-white rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all"
                      >
                        <h3 className="text-base font-semibold text-zinc-900 mb-2 line-clamp-2">{p.title}</h3>
                        {p.excerpt && (
                          <p className="text-sm text-zinc-600 line-clamp-2 leading-relaxed">{p.excerpt}</p>
                        )}
                        <p className="text-xs text-zinc-400 mt-3">
                          {new Date(p.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 italic">No published posts yet.</p>
                )}
              </>
            )}

            {tab === "Journal" && <JournalTab profileUserId={id} />}

            {tab === "About" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Bio</h2>
                  <p className="text-base text-zinc-700 leading-relaxed">
                    {profile.bio || <span className="italic text-zinc-400">No bio yet.</span>}
                  </p>
                </div>
                {socials.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Links</h2>
                    <ul className="space-y-2">
                      {socials.map((s) => (
                        <li key={s.key}>
                          <a
                            href={s.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-brand-blue hover:underline break-all"
                          >
                            <span className="text-zinc-500">{s.label}:</span> {s.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === "Followers" && <FollowersList profileUserId={id} />}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <FollowControls
              profileUserId={id}
              initialFollowerCount={followerCount}
              initialFollowingCount={followingCount}
            />

            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Stats
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Published posts</dt>
                  <dd className="font-medium text-zinc-900">{posts.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Member since</dt>
                  <dd className="font-medium text-zinc-900">{memberSince}</dd>
                </div>
              </dl>
            </div>

            {socials.length > 0 && (
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                  Find {firstName} elsewhere
                </h3>
                <ul className="space-y-2 text-sm">
                  {socials.slice(0, 5).map((s) => (
                    <li key={s.key}>
                      <a
                        href={s.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-blue hover:underline"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
