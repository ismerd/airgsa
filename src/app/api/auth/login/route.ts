import { NextRequest, NextResponse } from "next/server";
import { authenticateCredentials } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";
import {
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/api/protection";

const LOGIN_BODY_MAX_BYTES = 8 * 1024;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipLimit = enforceRateLimit({ key: `login:ip:${ip}`, limit: 20, windowMs: 10 * 60 * 1000 });
    if (ipLimit) return ipLimit;

    const body = await readJsonWithLimit<{ email: string; password: string }>(req, LOGIN_BODY_MAX_BYTES);
    const { email, password } = body as { email: string; password: string };
    const emailKey = email?.trim().toLowerCase();
    if (emailKey) {
      const emailLimit = enforceRateLimit({ key: `login:email:${emailKey}`, limit: 10, windowMs: 10 * 60 * 1000 });
      if (emailLimit) return emailLimit;
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const account = await authenticateCredentials(email, password);
    if (!account) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await createSession(account);
    return NextResponse.json({ role: account.role, accessRole: account.accessRole, company: account.company });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
