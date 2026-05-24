import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { addGsaQuoteRoomMessage } from "@/lib/services/quote-room-store";

const BODY_LIMIT_BYTES = 8 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "admin")) {
    return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  }

  const { id } = await params;
  const rateLimited = enforceRateLimit({
    key: `quote-room-message:${id}:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { body?: unknown };
  try {
    body = await readJsonWithLimit(req, BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const room = await addGsaQuoteRoomMessage(session, id, {
      body: typeof body.body === "string" ? body.body : "",
    });
    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
