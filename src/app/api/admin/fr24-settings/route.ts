import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { getFr24Settings, setFr24Enabled } from "@/lib/services/fr24-settings";

const FR24_SETTINGS_BODY_LIMIT_BYTES = 4 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = await getFr24Settings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `fr24-settings:${session.email}:${getClientIp(req)}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { enabled?: unknown };
  try {
    body = await readJsonWithLimit<{ enabled?: unknown }>(req, FR24_SETTINGS_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const settings = await setFr24Enabled(body.enabled);
  return NextResponse.json(settings);
}
