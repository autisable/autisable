"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import BehavioralTracker from "./BehavioralTracker";

const NO_SHELL_PREFIXES = ["/admin"];

export default function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = NO_SHELL_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (hideShell) return <>{children}</>;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <BehavioralTracker />
    </>
  );
}
