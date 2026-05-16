export type SessionPayload = {
  email: string;
  role: "airline" | "gsa" | "admin";
  name: string;
  company: string;
  companyId?: string;
};

const encoder = new TextEncoder();

export const SESSION_COOKIE_NAME = "airgsa-session";

export async function signSessionPayload(payload: SessionPayload) {
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = bytesToBase64Url(await sign(body));
  return `${body}.${signature}`;
}

export async function verifySessionCookie(value: string | undefined): Promise<SessionPayload | null> {
  try {
    if (!value) return null;
    const [body, signature] = value.split(".");
    if (!body || !signature) return null;

    const signatureBytes = base64UrlToBytes(signature);
    if (!signatureBytes || signatureBytes.byteLength === 0) return null;

    const valid = await verify(body, signatureBytes);
    if (!valid) return null;

    const payload = JSON.parse(decodeBase64Url(body)) as SessionPayload;
    if (!payload.email || !payload.role || !payload.name || !payload.company) return null;
    if (!["airline", "gsa", "admin"].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function sign(value: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return new Uint8Array(signature);
}

async function verify(value: string, signature: Uint8Array) {
  const expected = await sign(value);
  return timingSafeEqual(expected, signature);
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function getSessionSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "airgsa-development-session-secret-change-me"
  );
}

function encodeBase64Url(value: string) {
  if (typeof Buffer !== "undefined") return Buffer.from(value, "utf8").toString("base64url");
  return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  if (typeof Buffer !== "undefined") return Buffer.from(value, "base64url").toString("utf8");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}

function bytesToBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64url");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64url"));
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false;
  let diff = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}
