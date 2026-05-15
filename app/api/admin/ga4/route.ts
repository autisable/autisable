import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { OAuth2Client } from "google-auth-library";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClient(): {
  client?: BetaAnalyticsDataClient;
  error?: string;
  authMode?: "oauth" | "service_account";
  clientEmail?: string;
  projectId?: string;
} {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return { error: "GA4_PROPERTY_ID is not set" };

  // OAuth takes priority over service-account credentials. Service
  // accounts are still supported as a fallback for any setup where
  // GA4 actually accepts the SA email — but on gmail-owned GA4
  // accounts the UI rejects SAs, hence the OAuth path.
  const oauthClientId = process.env.GA4_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GA4_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GA4_OAUTH_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    const auth = new OAuth2Client({
      clientId: oauthClientId,
      clientSecret: oauthClientSecret,
    });
    auth.setCredentials({ refresh_token: oauthRefreshToken });
    return {
      // The google-gax types want a generic AuthClient; OAuth2Client
      // satisfies the runtime contract but the type isn't quite
      // assignable, so we widen via unknown for the cast.
      client: new BetaAnalyticsDataClient({
        authClient: auth as unknown as ConstructorParameters<typeof BetaAnalyticsDataClient>[0] extends {
          authClient?: infer T;
        }
          ? T
          : never,
      }),
      authMode: "oauth",
    };
  }

  const credsRaw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!credsRaw) {
    return {
      error:
        "No GA4 credentials configured. Set GA4_OAUTH_REFRESH_TOKEN (recommended) or GA4_SERVICE_ACCOUNT_JSON.",
    };
  }

  let credentials: { client_email?: string; private_key?: string; project_id?: string };
  try {
    credentials = JSON.parse(credsRaw);
  } catch (err) {
    return {
      error: `GA4_SERVICE_ACCOUNT_JSON is not valid JSON: ${(err as Error).message}. Make sure you pasted the full service-account JSON file (one line, no truncation).`,
    };
  }

  if (!credentials.client_email) {
    return { error: "Service account JSON is missing 'client_email' field" };
  }
  if (!credentials.private_key) {
    return { error: "Service account JSON is missing 'private_key' field" };
  }

  // Vercel sometimes escapes \n in env vars; convert back to real newlines so
  // the PEM parser doesn't trip.
  const privateKey = credentials.private_key.replace(/\\n/g, "\n");

  return {
    client: new BetaAnalyticsDataClient({
      credentials: { client_email: credentials.client_email, private_key: privateKey },
    }),
    authMode: "service_account",
    clientEmail: credentials.client_email,
    projectId: credentials.project_id,
  };
}

function dateRange(days: number) {
  return { startDate: `${days}daysAgo`, endDate: "today" };
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const propertyId = process.env.GA4_PROPERTY_ID;
  const { client, error: clientError, authMode, clientEmail, projectId } = getClient();

  if (!client) {
    // Distinguish "not configured at all" (show setup guide) from "configured
    // but with bad value" (show what's wrong so they can fix it).
    const isMissing = clientError?.includes("not set") || clientError?.includes("No GA4 credentials");
    return NextResponse.json({
      error: clientError || "GA4 not configured.",
      configured: !isMissing,
    }, { status: 200 });
  }
  if (!propertyId) {
    return NextResponse.json({
      error: "GA4_PROPERTY_ID is not set",
      configured: false,
    }, { status: 200 });
  }

  const params = req.nextUrl.searchParams;
  const metric = params.get("metric") || "overview";
  const days = parseInt(params.get("days") || "30", 10);
  // Normalize: strip a leading "properties/" if pasted with prefix, and
  // surrounding whitespace/quotes that often sneak in from copy/paste.
  const cleanPropertyId = propertyId.replace(/^properties\//, "").replace(/["'\s]/g, "");
  if (!/^\d+$/.test(cleanPropertyId)) {
    return NextResponse.json({
      error: `GA4_PROPERTY_ID must be the numeric property ID (e.g. 123456789), got: "${propertyId}"`,
      configured: true,
    }, { status: 500 });
  }
  const property = `properties/${cleanPropertyId}`;

  try {
    switch (metric) {
      case "overview": {
        const [response] = await client.runReport({
          property,
          dateRanges: [dateRange(days)],
          metrics: [
            { name: "totalUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
            { name: "engagementRate" },
          ],
        });
        const row = response.rows?.[0]?.metricValues || [];
        return NextResponse.json({
          configured: true,
          totalUsers: parseInt(row[0]?.value || "0", 10),
          sessions: parseInt(row[1]?.value || "0", 10),
          pageviews: parseInt(row[2]?.value || "0", 10),
          avgSessionDuration: parseFloat(row[3]?.value || "0"),
          bounceRate: parseFloat(row[4]?.value || "0"),
          engagementRate: parseFloat(row[5]?.value || "0"),
        });
      }

      case "topPages": {
        const [response] = await client.runReport({
          property,
          dateRanges: [dateRange(days)],
          dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
          metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 25,
        });
        return NextResponse.json({
          configured: true,
          rows: (response.rows || []).map((r) => ({
            page: r.dimensionValues?.[0]?.value || "",
            title: r.dimensionValues?.[1]?.value || "",
            views: parseInt(r.metricValues?.[0]?.value || "0", 10),
            users: parseInt(r.metricValues?.[1]?.value || "0", 10),
          })),
        });
      }

      case "sources": {
        const [response] = await client.runReport({
          property,
          dateRanges: [dateRange(days)],
          dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 20,
        });
        return NextResponse.json({
          configured: true,
          rows: (response.rows || []).map((r) => ({
            source: r.dimensionValues?.[0]?.value || "(direct)",
            medium: r.dimensionValues?.[1]?.value || "(none)",
            sessions: parseInt(r.metricValues?.[0]?.value || "0", 10),
          })),
        });
      }

      case "devices": {
        const [response] = await client.runReport({
          property,
          dateRanges: [dateRange(days)],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        });
        return NextResponse.json({
          configured: true,
          rows: (response.rows || []).map((r) => ({
            device: r.dimensionValues?.[0]?.value || "",
            sessions: parseInt(r.metricValues?.[0]?.value || "0", 10),
            users: parseInt(r.metricValues?.[1]?.value || "0", 10),
          })),
        });
      }

      case "countries": {
        const [response] = await client.runReport({
          property,
          dateRanges: [dateRange(days)],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 15,
        });
        return NextResponse.json({
          configured: true,
          rows: (response.rows || []).map((r) => ({
            country: r.dimensionValues?.[0]?.value || "",
            sessions: parseInt(r.metricValues?.[0]?.value || "0", 10),
            users: parseInt(r.metricValues?.[1]?.value || "0", 10),
          })),
        });
      }

      case "timeline": {
        const [response] = await client.runReport({
          property,
          dateRanges: [dateRange(days)],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        });
        return NextResponse.json({
          configured: true,
          rows: (response.rows || []).map((r) => {
            const d = r.dimensionValues?.[0]?.value || "";
            const formatted = d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : d;
            return {
              date: formatted,
              users: parseInt(r.metricValues?.[0]?.value || "0", 10),
              sessions: parseInt(r.metricValues?.[1]?.value || "0", 10),
              pageviews: parseInt(r.metricValues?.[2]?.value || "0", 10),
            };
          }),
        });
      }

      default:
        return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
    }
  } catch (err: unknown) {
    // Google's GA Data API frequently throws an error whose `.message` is
    // literally "undefined undefined: undefined" because of how their gRPC
    // wrapper builds the string when the underlying response is missing
    // expected fields. Dig into the wrapped error/cause/details for the real
    // info, and as a last resort dump every own-property to JSON so the
    // admin sees something actionable.
    const e = err as Record<string, unknown> & {
      message?: string;
      code?: number | string;
      details?: string;
      reason?: string;
      status?: string;
      statusDetails?: unknown;
      metadata?: unknown;
      response?: { error?: { message?: string; status?: string } };
      cause?: { message?: string; code?: string };
    };

    console.error("[ga4] API error (raw):", err);
    console.error("[ga4] API error keys:", Object.getOwnPropertyNames(e));

    // Try the most informative fields first
    const responseError = e?.response?.error;
    const candidates: Array<string | number | undefined> = [
      responseError?.message && `${responseError.status || ""} ${responseError.message}`.trim(),
      e?.cause?.message,
      e?.reason,
      e?.details,
      typeof e?.message === "string" && !e.message.includes("undefined undefined") ? e.message : undefined,
      e?.code !== undefined ? `code ${e.code}` : undefined,
    ];
    let msg = candidates.find((c) => typeof c === "string" && c.trim().length > 0) as string | undefined;

    // Last resort: dump own enumerable properties so we at least see what's there
    if (!msg) {
      try {
        const dump: Record<string, unknown> = {};
        for (const key of Object.getOwnPropertyNames(e)) {
          if (key === "stack") continue;
          dump[key] = (e as Record<string, unknown>)[key];
        }
        msg = `GA4 error (raw): ${JSON.stringify(dump).slice(0, 500)}`;
      } catch {
        msg = "GA4 API error (no detail available)";
      }
    }

    // The "undefined undefined: undefined" message is a gax/gRPC artifact: the
    // underlying error response was missing status/code, so the wrapper
    // stringifies the empty fields. There's no reliable way to distinguish
    // the cause from the error object alone (gRPC Metadata is a class whose
    // Object.keys returns its internal slots, so emptiness checks misfire).
    // Surface the three common causes with the info needed to verify each.
    if (typeof e?.message === "string" && e.message.includes("undefined undefined")) {
      if (authMode === "oauth") {
        msg = [
          `GA4 API call failed with no status (typical of a misconfiguration). Check, in order:`,
          `1. The Google account that authorized via OAuth still has Viewer access (or higher) on the GA4 property`,
          `2. The Google Analytics Data API is enabled in the GCP project tied to the OAuth client: https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com`,
          `3. GA4_PROPERTY_ID (${cleanPropertyId}) is the numeric property ID, not a Measurement ID (G-...) or Stream ID`,
          `4. The refresh token hasn't been revoked at myaccount.google.com/connections — if it has, re-run the OAuth flow from /admin/analytics`,
        ].join(" • ");
      } else {
        const enableUrl = projectId
          ? `https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=${projectId}`
          : "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com";
        msg = [
          `GA4 API call failed with no status (typical of a misconfiguration). Check, in order:`,
          `1. Google Analytics Data API enabled in GCP project${projectId ? ` "${projectId}"` : ""}: ${enableUrl}`,
          `2. Service account ${clientEmail || "(unknown)"} added as Viewer in GA4 Admin → Property Access Management for property ${cleanPropertyId}`,
          `3. GA4_PROPERTY_ID (${cleanPropertyId}) is the numeric property ID, not a Measurement ID (G-...) or Stream ID`,
        ].join(" • ");
      }
    }

    return NextResponse.json({ error: msg, configured: true }, { status: 500 });
  }
}
