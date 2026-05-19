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
  getAirlineApplicationSeenState,
  updateAirlineApplicationSeenState,
} from "@/lib/services/user-state-store";

const APPLICATION_SEEN_BODY_LIMIT_BYTES = 8 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "airline" && session.role !== "admin") {
    return NextResponse.json({ error: "Airline login required" }, { status: 403 });
  }

  return NextResponse.json({ state: await getAirlineApplicationSeenState(session) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "airline" && session.role !== "admin") {
    return NextResponse.json({ error: "Airline login required" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `applications-seen:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: {
    markAllSeen?: boolean;
    tenderId?: string;
    latestPendingSubmittedAt?: number;
  };
  try {
    input = await readJsonWithLimit<typeof input>(req, APPLICATION_SEEN_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    input = {};
  }

  return NextResponse.json({
    state: await updateAirlineApplicationSeenState(session, {
      markAllSeen: Boolean(input.markAllSeen),
      tenderId: input.tenderId,
      latestPendingSubmittedAt: input.latestPendingSubmittedAt,
    }),
  });
}
