import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_ORIGIN = "https://autisable.com";

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = (body.url || "").trim();
  if (!input) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Resolve relative paths against the production origin so admins testing
  // from any environment (dev preview, prod) see the same answer real
  // visitors would get.
  let target: URL;
  try {
    target = input.startsWith("http") ? new URL(input) : new URL(input, SITE_ORIGIN);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // HEAD first — cheaper, and almost all server frameworks answer it for
  // routes that also answer GET. Fall back to GET if the server rejects
  // HEAD (some hosts return 405) so we still get a usable status code.
  const fetchOnce = async (method: "HEAD" | "GET") => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      return await fetch(target.toString(), {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Autisable-Admin-LinkChecker/1.0" },
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    let res = await fetchOnce("HEAD");
    if (res.status === 405 || res.status === 501) {
      res = await fetchOnce("GET");
    }
    return NextResponse.json({
      requestedUrl: target.toString(),
      status: res.status,
      ok: res.ok,
      finalUrl: res.url,
      redirected: res.redirected,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { requestedUrl: target.toString(), error: msg, status: 0, ok: false },
      { status: 200 }
    );
  }
}
