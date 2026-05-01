import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase";

/**
 * Verify the request is from an authenticated admin user.
 * Reads the Supabase auth cookie, looks up the user_profiles row, checks role.
 * Returns null if authorized, or a NextResponse error to short-circuit.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  // Try Authorization: Bearer header first — that's what our admin pages send.
  // Falls back to the Supabase auth cookie if the client used cookie storage.
  let accessToken: string | null = null;

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.slice(7).trim();
  }

  if (!accessToken) {
    const cookies = req.cookies.getAll();
    const authCookie = cookies.find(
      (c) => c.name.startsWith("sb-") && c.name.includes("auth-token")
    );
    if (authCookie) {
      try {
        let raw = authCookie.value;
        if (raw.startsWith("base64-")) {
          raw = Buffer.from(raw.slice(7), "base64").toString();
        }
        const parsed = JSON.parse(raw);
        accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
      } catch {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null; // authorized
}
