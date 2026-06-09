"use client";

// Wrapper page for the interactive Family Roadmap playbook served at
// /family-roadmap.html. The wrapper exists so the playbook picks up
// the standard Autisable Header + Footer (via MainLayoutShell) and
// the site's branding flows around it cleanly. The playbook itself
// stays as a self-contained static asset — much less brittle than
// porting its 660-line interactive script into React.
//
// Height syncing: the playbook posts its scrollHeight on load /
// resize / DOM mutation; we listen for those messages and resize the
// iframe so the page scrolls as one unit (no inner scrollbar).

import { useEffect, useRef, useState } from "react";

export default function FamilyRoadmapPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(900);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.data &&
        typeof e.data === "object" &&
        (e.data as { source?: string }).source === "family-roadmap"
      ) {
        const h = Number((e.data as { height?: number }).height);
        if (Number.isFinite(h) && h > 0) setHeight(h);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main className="bg-white">
      <iframe
        ref={iframeRef}
        src="/family-roadmap.html"
        title="Autisable Family Roadmap"
        // No scrolling on the iframe — the parent scrolls the whole
        // page, height tracks the playbook's own content size.
        scrolling="no"
        style={{
          width: "100%",
          height: `${height}px`,
          border: "0",
          display: "block",
        }}
      />
    </main>
  );
}
