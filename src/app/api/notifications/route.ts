import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import {
  listWorkflowNotifications,
  markAllWorkflowNotificationsRead,
} from "@/lib/services/mandate-execution-store";

const NOTIFICATION_PATCH_BODY_LIMIT_BYTES = 4 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ notifications: await listWorkflowNotifications(session) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `notifications-patch:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: { markAllRead?: boolean };
  try {
    input = await readJsonWithLimit<{ markAllRead?: boolean }>(req, NOTIFICATION_PATCH_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    input = {};
  }

  if (!input.markAllRead) return NextResponse.json({ error: "Unsupported notification update" }, { status: 400 });

  return NextResponse.json({ notifications: await markAllWorkflowNotificationsRead(session) });
}
