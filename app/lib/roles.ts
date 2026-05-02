/**
 * The 5-role permission model. Roles are hierarchical — each role inherits
 * everything from the levels below it, and admin-only RLS policies still gate
 * the most sensitive writes at the database level. The helpers here are the
 * single source of truth for "can this user do X?" so the UI and API can
 * agree without duplicating role-name string checks.
 *
 * Hierarchy (low → high):
 *   member       Default community user. Posts, journals, replies, follows.
 *   contributor  + Can write blog posts (saved as pending_review for an editor).
 *   moderator    + Can moderate community comments and replies.
 *   editor       + Can approve/reject/publish blog posts; manage editorial pipeline.
 *   admin        + Full system access: users, settings, infrastructure.
 */

export type Role = "member" | "contributor" | "moderator" | "editor" | "admin";

export const ROLES: Role[] = ["member", "contributor", "moderator", "editor", "admin"];

const RANK: Record<Role, number> = {
  member: 0,
  contributor: 1,
  moderator: 2,
  editor: 3,
  admin: 4,
};

export const ROLE_LABEL: Record<Role, string> = {
  member: "Member",
  contributor: "Contributor",
  moderator: "Moderator",
  editor: "Editor",
  admin: "Admin",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  member: "Community user — post status updates, write journals, reply, follow.",
  contributor: "Can write blog posts that go through editorial review.",
  moderator: "Can moderate community comments and replies.",
  editor: "Can approve, reject, and publish blog posts.",
  admin: "Full system access including user and site settings.",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

/** Does `role` rank at or above `required`? (admin >= editor >= ...) */
export function hasAtLeast(role: Role | string | null | undefined, required: Role): boolean {
  if (!isRole(role)) return false;
  return RANK[role] >= RANK[required];
}

// Capability checks. Wrap the rank logic so callers don't think in role names.
export const can = {
  writeBlogPosts: (role: Role | string | null | undefined) => hasAtLeast(role, "contributor"),
  moderateComments: (role: Role | string | null | undefined) => hasAtLeast(role, "moderator"),
  publishBlogPosts: (role: Role | string | null | undefined) => hasAtLeast(role, "editor"),
  manageMembers: (role: Role | string | null | undefined) => hasAtLeast(role, "admin"),
  manageSiteSettings: (role: Role | string | null | undefined) => hasAtLeast(role, "admin"),
};
