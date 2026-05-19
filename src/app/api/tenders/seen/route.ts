import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { getGsaTenderSeenState, updateGsaTenderSeenState } from "@/lib/services/user-state-store";

const TENDER_SEEN_BODY_LIMIT_BYTES = 12 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "gsa" && session.role !== "admin") {
    return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  }

  return NextResponse.json({ state: await getGsaTenderSeenState(session) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "gsa" && session.role !== "admin") {
    return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `tenders-seen:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: { tenderIds?: unknown; markAllSeenIds?: unknown };
  try {
    input = await readJsonWithLimit<{ tenderIds?: unknown; markAllSeenIds?: unknown }>(req, TENDER_SEEN_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    input = {};
  }

  const tenderIds = Array.isArray(input.tenderIds) ? input.tenderIds.map(String) : [];
  const markAllSeenIds = Array.isArray(input.markAllSeenIds) ? input.markAllSeenIds.map(String) : [];

  return NextResponse.json({
    state: await updateGsaTenderSeenState(session, { tenderIds, markAllSeenIds }),
  });
}
