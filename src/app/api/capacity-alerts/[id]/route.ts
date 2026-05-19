import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { updateCapacityAlert, type CapacityAlertUpdateInput } from "@/lib/services/capacity-alert-store";

const CAPACITY_ALERT_PATCH_BODY_LIMIT_BYTES = 32 * 1024;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.accessRole === "viewer" || session.accessRole === "operator") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `capacity-alert-patch:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 100,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const input = await readJsonWithLimit<CapacityAlertUpdateInput>(req, CAPACITY_ALERT_PATCH_BODY_LIMIT_BYTES);
    const alert = await updateCapacityAlert(session, (await params).id, input);
    if (!alert) return NextResponse.json({ error: "Capacity alert not found" }, { status: 404 });
    return NextResponse.json({ alert });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
