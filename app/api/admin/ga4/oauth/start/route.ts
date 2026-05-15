import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { requireAdmin } from "@/app/lib/adminAuth";
import { supabaseAdmin } from "@/app/lib/supabase";
import { mintState } from "@/app/lib/ga4OAuthState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of the GA4 OAuth bootstrap. The admin's browser POSTs here
 * with a Bearer token; we mint a signed state and return the Google
 * consent-screen URL. Caller does `window.location = authUrl` to
 * redirect.
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const clientId = process.env.GA4_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GA4_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "GA4_OAUTH_CLIENT_ID / GA4_OAUTH_CLIENT_SECRET not set. Create an OAuth 2.0 Web client in GCP Console → Credentials and add both to Vercel.",
      },
      { status: 500 }
    );
  }

  // Resolve the admin's user.id so we can stamp the state with it.
  // requireAdmin already validated the Bearer; we just re-parse it here
  // because the helper doesn't return the user object.
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectUri = `${req.nextUrl.origin}/api/admin/ga4/oauth/callback`;
  const oauthClient = new OAuth2Client({ clientId, clientSecret, redirectUri });

  const authUrl = oauthClient.generateAuthUrl({
    // offline access + forced consent are both required to guarantee a
    // refresh_token in the callback. Without prompt=consent, Google
    // skips the consent screen on repeat auths and omits the refresh
    // token from the response.
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/analytics.readonly"],
    state: mintState(user.id),
  });

  return NextResponse.json({ authUrl });
}
