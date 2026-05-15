import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { verifyState } from "@/app/lib/ga4OAuthState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 2 of the GA4 OAuth bootstrap. Google redirects here after the
 * admin grants access. We verify the signed state (proves an admin
 * started the flow within the last 10 minutes), exchange the code for
 * tokens, and display the refresh token as plain text the admin can
 * copy into Vercel as GA4_OAUTH_REFRESH_TOKEN.
 *
 * No requireAdmin on this endpoint — Google's redirect doesn't carry
 * our Bearer or Supabase cookie. The state HMAC is the auth proof.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const googleError = sp.get("error");

  if (googleError) {
    return htmlResponse(
      `<h1>Google rejected the request</h1><p>Error: <code>${escapeHtml(googleError)}</code></p>`,
      400
    );
  }
  if (!code || !state) {
    return htmlResponse(`<h1>Missing code or state</h1>`, 400);
  }
  if (!verifyState(state)) {
    return htmlResponse(
      `<h1>Invalid or expired state</h1><p>Restart the flow from /admin/analytics.</p>`,
      400
    );
  }

  const clientId = process.env.GA4_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GA4_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return htmlResponse(`<h1>OAuth client not configured</h1>`, 500);
  }

  const redirectUri = `${req.nextUrl.origin}/api/admin/ga4/oauth/callback`;
  const oauthClient = new OAuth2Client({ clientId, clientSecret, redirectUri });

  let refreshToken: string | null = null;
  let userEmail: string | null = null;
  try {
    const { tokens } = await oauthClient.getToken(code);
    refreshToken = tokens.refresh_token || null;
    // Best-effort: fetch the email of the Google account that authorized
    // so we can show the admin which identity is now bound.
    if (tokens.id_token) {
      const ticket = await oauthClient.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
      userEmail = ticket.getPayload()?.email || null;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return htmlResponse(
      `<h1>Token exchange failed</h1><p><code>${escapeHtml(msg)}</code></p>`,
      500
    );
  }

  if (!refreshToken) {
    return htmlResponse(
      `<h1>No refresh token returned</h1>
       <p>Google only returns a refresh token on the first authorization for a given OAuth client + Google account combination.</p>
       <p>Fix: visit <a href="https://myaccount.google.com/connections" target="_blank">myaccount.google.com/connections</a>, find this app, click <b>Remove access</b>, then restart the flow.</p>`,
      400
    );
  }

  return htmlResponse(`
    <h1>GA4 OAuth: refresh token captured</h1>
    <p>Authorized as: <b>${escapeHtml(userEmail || "(unknown)")}</b></p>
    <h2>Next step</h2>
    <ol>
      <li>Open Vercel → Project → Settings → Environment Variables.</li>
      <li>Add (or update) <code>GA4_OAUTH_REFRESH_TOKEN</code> with the value below.</li>
      <li>Redeploy.</li>
    </ol>
    <p><b>Refresh token (copy this — Google won't show it again):</b></p>
    <pre style="white-space:pre-wrap;word-break:break-all;background:#f4f4f5;padding:12px;border-radius:8px;border:1px solid #d4d4d8;font-family:ui-monospace,monospace;">${escapeHtml(refreshToken)}</pre>
    <p style="color:#52525b;font-size:13px;">After Vercel redeploys, <code>/admin/analytics</code> will use this token instead of the service account. The service account env vars can stay or go — they're ignored once OAuth is configured.</p>
  `);
}

function htmlResponse(body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>GA4 OAuth</title>
     <style>body{font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.5;color:#18181b;}h1{font-size:22px;}h2{font-size:16px;margin-top:24px;}code{background:#f4f4f5;padding:2px 6px;border-radius:4px;}</style>
     </head><body>${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
