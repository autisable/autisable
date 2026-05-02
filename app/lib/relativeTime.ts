/**
 * Format an ISO timestamp as a friendly relative time. Falls back to a date
 * for anything older than a week so we don't show "47d ago" — at that point
 * the absolute date is more useful.
 */
export function relativeTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const ms = Date.now() - date.getTime();
  const sec = Math.round(ms / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (sec < 45) return "just now";
  if (sec < 90) return "1 min ago";
  if (min < 45) return `${min} min ago`;
  if (min < 90) return "1 hour ago";
  if (hr < 24) return `${hr} hours ago`;
  if (hr < 36) return "yesterday";
  if (day < 7) return `${day} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}
