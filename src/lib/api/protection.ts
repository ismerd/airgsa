import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown";
}

export function enforceRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const existing = buckets.get(options.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count <= options.limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export async function readJsonWithLimit<T>(request: NextRequest, maxBytes: number): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes);
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes);
  }
  if (!raw.trim()) return {} as T;
  return JSON.parse(raw) as T;
}

export class RequestBodyTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Request body must be ${Math.round(maxBytes / 1024)} KB or smaller`);
  }
}

export function bodyTooLargeResponse(error: RequestBodyTooLargeError) {
  return NextResponse.json({ error: error.message }, { status: 413 });
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}
