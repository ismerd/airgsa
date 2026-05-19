import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { resetRailwayPassword } from "@/lib/auth/railway-accounts";

const PASSWORD_RESET_CONFIRM_BODY_MAX_BYTES = 8 * 1024;

export async function POST(req: NextRequest) {
  try {
    const ipLimit = enforceRateLimit({ key: `password-reset-confirm:ip:${getClientIp(req)}`, limit: 20, windowMs: 60 * 60 * 1000 });
    if (ipLimit) return ipLimit;

    const body = await readJsonWithLimit<{ token?: string; password?: string }>(req, PASSWORD_RESET_CONFIRM_BODY_MAX_BYTES);
    const token = body.token?.trim();
    const password = body.password ?? "";

    if (!token) return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const updated = await resetRailwayPassword(token, password);
    if (!updated) return NextResponse.json({ error: "Reset token is invalid or expired." }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
