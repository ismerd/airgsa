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
  const signature = bytesToBase64Url(new Uint8Array(await sign(body)));
  return `${body}.${signature}`;
}

export async function verifySessionCookie(value: string | undefined): Promise<SessionPayload | null> {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const valid = await verify(body, base64UrlToBytes(signature));
  if (!valid) return null;

  try {
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
  return crypto.subtle.sign("HMAC", key, encoder.encode(value));
}

async function verify(value: string, signature: Uint8Array) {
  const key = await getSigningKey();
  return crypto.subtle.verify("HMAC", key, toArrayBuffer(signature), encoder.encode(value));
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

function base64UrlToBytes(value: string) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64url"));
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
