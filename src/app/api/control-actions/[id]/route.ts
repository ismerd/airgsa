import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { updateControlAction, type ControlActionUpdateInput } from "@/lib/services/mandate-execution-store";

const STATUSES = new Set(["open", "in-progress", "completed", "cancelled"]);
const SEVERITIES = new Set(["info", "warning", "critical"]);
const CONTROL_ACTION_PATCH_BODY_LIMIT_BYTES = 48 * 1024;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `control-action-patch:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: ControlActionUpdateInput;
  try {
    input = await readJsonWithLimit<ControlActionUpdateInput>(req, CONTROL_ACTION_PATCH_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (input.status && !STATUSES.has(input.status)) {
    return NextResponse.json({ error: "Invalid control action status" }, { status: 400 });
  }
  if (input.severity && !SEVERITIES.has(input.severity)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }

  try {
    const action = await updateControlAction(session, (await params).id, input);
    if (!action) return NextResponse.json({ error: "Control action not found" }, { status: 404 });
    return NextResponse.json({ controlAction: action });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
