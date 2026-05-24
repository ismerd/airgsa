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
  ensureQuoteRoomForQuote,
  getQuoteRoomPublicUrl,
  listQuoteRoomsForSession,
} from "@/lib/services/quote-room-store";

const BODY_LIMIT_BYTES = 16 * 1024;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "admin")) {
    return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  }

  const rooms = await listQuoteRoomsForSession(session);
  const origin = req.headers.get("origin") ?? undefined;
  return NextResponse.json({
    rooms,
    links: Object.fromEntries(rooms.map((room) => [room.id, getQuoteRoomPublicUrl(room, origin)])),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "admin")) {
    return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `quote-room-create:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { quoteId?: unknown; sendInvite?: unknown; createInitialOffer?: unknown };
  try {
    body = await readJsonWithLimit(req, BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim() : "";
  if (!quoteId) return NextResponse.json({ error: "quoteId is required" }, { status: 400 });

  try {
    const origin = req.headers.get("origin") ?? undefined;
    const result = await ensureQuoteRoomForQuote(session, quoteId, {
      sendInvite: body.sendInvite === true,
      createInitialOffer: body.createInitialOffer === true,
      origin,
    });
    return NextResponse.json({
      room: result.room,
      publicUrl: getQuoteRoomPublicUrl(result.room, origin),
      email: result.email,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
