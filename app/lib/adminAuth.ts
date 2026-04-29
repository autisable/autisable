import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase";

/**
 * Verify the request is from an authenticated admin user.
 * Reads the Supabase auth cookie, looks up the user_profiles row, checks role.
 * Returns null if authorized, or a NextResponse error to short-circuit.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  // Look for Supabase access token in cookies
  const cookies = req.cookies.getAll();
  const authCookie = cookies.find(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token")
  );

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse the cookie value — Supabase stores [access_token, refresh_token, ...] as JSON
  let accessToken: string | null = null;
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

  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
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
