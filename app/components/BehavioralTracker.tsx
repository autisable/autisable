"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/login", "/register", "/api"];

const COLLECT_URL = "/api/analytics/collect";
const SESSION_KEY = "as_sid";
const LAST_SEEN_KEY = "as_last";
const PAGE_COUNT_KEY = "as_pc";
const SESSION_TIMEOUT = 30 * 60 * 1000;
const FLUSH_INTERVAL = 5_000;
const FLUSH_BATCH_SIZE = 50;
const RAGE_WINDOW = 500;
const RAGE_RADIUS = 50;
const RAGE_THRESHOLD = 3;

const INTERACTIVE_TAGS = new Set(["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT", "LABEL", "SUMMARY"]);

const CTA_PATTERNS = [
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

interface TrackEvent {
  type: string;
  page_path: string;
  ts: number;
  metadata: Record<string, unknown>;
}

interface SessionPayload {
  session_id: string;
  entry_page: string;
  referrer: string;
  user_agent: string;
  viewport_w: number;
  viewport_h: number;
  device_type: string;
  page_count: number;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function ensureSessionId(): { sessionId: string; isNew: boolean } {
  const existing = localStorage.getItem(SESSION_KEY);
  const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || "0", 10);
  const now = Date.now();

  if (existing && now - lastSeen < SESSION_TIMEOUT) {
    localStorage.setItem(LAST_SEEN_KEY, String(now));
    return { sessionId: existing, isNew: false };
  }
  const fresh =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${now}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(SESSION_KEY, fresh);
  localStorage.setItem(LAST_SEEN_KEY, String(now));
  localStorage.setItem(PAGE_COUNT_KEY, "1");
  return { sessionId: fresh, isNew: true };
}

function describeElement(el: Element | null): { selector: string; text: string; href: string | null; isInteractive: boolean; isCta: boolean } {
  if (!el) return { selector: "", text: "", href: null, isInteractive: false, isCta: false };
  const tag = el.tagName;
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
  const cls = (el as HTMLElement).className && typeof (el as HTMLElement).className === "string"
    ? "." + ((el as HTMLElement).className as string).trim().split(/\s+/).slice(0, 3).join(".")
    : "";
  const selector = `${tag.toLowerCase()}${id}${cls}`.slice(0, 200);
  const text = (el.textContent || "").trim().slice(0, 80);
  const href = (el as HTMLAnchorElement).href || (el.closest("a") as HTMLAnchorElement | null)?.href || null;
  const isInteractive = INTERACTIVE_TAGS.has(tag) || !!el.closest(Array.from(INTERACTIVE_TAGS).join(","));
  const isCta = !!href && CTA_PATTERNS.some((re) => re.test(href));
  return { selector, text, href, isInteractive, isCta };
}

export default function BehavioralTracker() {
  const pathname = usePathname();
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (!pathname || isPrivate) return;

    // Heatmap iframe escape hatch — bail if rendered as preview
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("_heatmap")) {
      return;
    }

    const { sessionId, isNew } = ensureSessionId();
    const buffer: TrackEvent[] = [];
    const enterTime = Date.now();
    let maxScroll = 0;
    let scrollMilestones = new Set<number>();
    const recentClicks: { x: number; y: number; t: number }[] = [];
    let pageCount = parseInt(localStorage.getItem(PAGE_COUNT_KEY) || "1", 10);

    const sessionPayload: SessionPayload = {
      session_id: sessionId,
      entry_page: pathname,
      referrer: document.referrer || "",
      user_agent: navigator.userAgent.slice(0, 500),
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      device_type: getDeviceType(),
      page_count: pageCount,
    };

    function push(type: string, metadata: Record<string, unknown> = {}) {
      buffer.push({ type, page_path: pathname || "/", ts: Date.now(), metadata });
      if (buffer.length >= FLUSH_BATCH_SIZE) flush();
    }

    function flush(useBeacon = false) {
      if (buffer.length === 0) return;
      const events = buffer.splice(0, buffer.length);
      const body = JSON.stringify({ session: sessionPayload, events });

      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(COLLECT_URL, new Blob([body], { type: "application/json" }));
      } else {
        fetch(COLLECT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => { /* swallow */ });
      }
    }

    // Pageview
    push("pageview", { is_new_session: isNew });

    // Increment page count for non-new sessions
    if (!isNew) {
      pageCount += 1;
      localStorage.setItem(PAGE_COUNT_KEY, String(pageCount));
      sessionPayload.page_count = pageCount;
    }

    // Scroll milestones
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? Math.round((window.scrollY / docH) * 100) : 0;
      if (pct > maxScroll) maxScroll = pct;
      const milestone = Math.floor(pct / 10) * 10;
      if (milestone > 0 && !scrollMilestones.has(milestone)) {
        scrollMilestones.add(milestone);
        push("scroll", { depth: milestone });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Click handler
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const desc = describeElement(target);
      const clickX = e.clientX + window.scrollX;
      const clickY = e.clientY + window.scrollY;

      push("click", {
        x: clickX,
        y: clickY,
        vw: window.innerWidth,
        vh: window.innerHeight,
        selector: desc.selector,
        text: desc.text,
        href: desc.href,
        is_cta: desc.isCta,
      });

      if (!desc.isInteractive) {
        push("dead_click", { x: clickX, y: clickY, selector: desc.selector });
      }

      // Rage click detection — 3+ clicks within window AND radius
      const now = Date.now();
      recentClicks.push({ x: clickX, y: clickY, t: now });
      while (recentClicks.length && now - recentClicks[0].t > RAGE_WINDOW) recentClicks.shift();
      const inRadius = recentClicks.filter((c) => {
        const dx = c.x - clickX;
        const dy = c.y - clickY;
        return Math.sqrt(dx * dx + dy * dy) <= RAGE_RADIUS;
      });
      if (inRadius.length >= RAGE_THRESHOLD) {
        push("rage_click", { x: clickX, y: clickY, selector: desc.selector, count: inRadius.length });
        recentClicks.length = 0; // reset so we don't double-fire
      }
    };
    document.addEventListener("click", onClick, true);

    // Periodic flush
    const flushInterval = setInterval(() => flush(false), FLUSH_INTERVAL);

    // Page exit
    const onExit = () => {
      const timeOnPage = Math.round((Date.now() - enterTime) / 1000);
      push("page_exit", { time_on_page: timeOnPage, max_scroll: maxScroll });
      flush(true);
    };
    window.addEventListener("pagehide", onExit);
    window.addEventListener("beforeunload", onExit);

    // Visibility flush
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      onExit();
      clearInterval(flushInterval);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", onExit);
      window.removeEventListener("beforeunload", onExit);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, isPrivate]);

  return null;
}
