import crypto from "crypto";

// HMAC-signed, expiring state token for the GA4 OAuth round-trip. We
// can't authenticate the callback via the normal Bearer flow because
// Google's redirect runs in the browser and Supabase sessions live in
// localStorage (no auth cookie). Signing the state with a secret the
// callback can verify gives us the same guarantee without touching the
// session layer.
//
// Secret source: SUPABASE_SERVICE_ROLE_KEY is already a high-entropy
// server-only secret. Reusing it avoids another env var.

const TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY required to sign GA4 OAuth state");
  return secret;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

export function mintState(adminUserId: string): string {
  const payload = JSON.stringify({ uid: adminUserId, exp: Date.now() + TTL_MS });
  const payloadB64 = b64url(Buffer.from(payload));
  const mac = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64url(mac)}`;
}

export function verifyState(token: string): { uid: string } | null {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  const provided = fromB64url(sigB64);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }
  try {
    const { uid, exp } = JSON.parse(fromB64url(payloadB64).toString("utf8")) as {
      uid: string;
      exp: number;
    };
    if (typeof exp !== "number" || Date.now() > exp) return null;
    if (typeof uid !== "string") return null;
    return { uid };
  } catch {
    return null;
  }
}
