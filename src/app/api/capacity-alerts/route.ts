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
  createCapacityAlert,
  listCapacityAlertCandidates,
  listCapacityAlerts,
  type CapacityAlertInput,
} from "@/lib/services/capacity-alert-store";

const CAPACITY_ALERT_BODY_LIMIT_BYTES = 32 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [alerts, routes] = await Promise.all([
    listCapacityAlerts(session),
    listCapacityAlertCandidates(session),
  ]);
  return NextResponse.json({ alerts, routes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.accessRole === "viewer" || session.accessRole === "operator") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `capacity-alert-create:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const input = await readJsonWithLimit<CapacityAlertInput>(req, CAPACITY_ALERT_BODY_LIMIT_BYTES);
    const alert = await createCapacityAlert(session, input);
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
