/**
 * Behavioral analytics config — funnels, CTA patterns, tag rules.
 * Edit FUNNELS to add new conversion paths.
 */

export const TRACKER_CONFIG = {
  collectUrl: "/api/analytics/collect",
  sessionKey: "as_sid",
  lastSeenKey: "as_last",
  pageCountKey: "as_pc",
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  flushIntervalMs: 5_000,
  flushBatchSize: 50,
  rageClickWindowMs: 500,
  rageClickRadius: 50,
  rageClickThreshold: 3,
  // Routes that NEVER receive the tracker (privacy promise)
  privatePathPrefixes: ["/admin", "/dashboard", "/login", "/register", "/api"],
};

// Tag/element types considered "interactive" — clicks on anything else = dead click
export const INTERACTIVE_TAGS = ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT", "LABEL", "SUMMARY"];

// URL/href patterns that mark a click as a CTA conversion
export const CTA_PATTERNS = [
  /^\/register/,
  /^\/contact/,
  /^\/blog\//,
  /^\/podcasts\//,
  /^\/community/,
  /^\/resources/,
  /vizyplan\.com/,
  /bookshop\.org/,
  /amazon\.com/,
  /legalshield/,
  /special-learning/,
];

// Conversion funnels — ordered list of page paths
export const FUNNELS: { name: string; steps: string[] }[] = [
  {
    name: "Story → Subscribe",
    steps: ["/", "/blog/", "/register/"],
  },
  {
    name: "Podcast Discovery",
    steps: ["/", "/podcasts/", "/podcasts/autisable-dads/"],
  },
  {
    name: "Resources Click-Through",
    steps: ["/", "/resources/", "external"],
  },
  {
    name: "Community Join",
    steps: ["/", "/community/", "/register/"],
  },
];
