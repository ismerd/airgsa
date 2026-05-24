import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { decideQuoteRoomOffer } from "@/lib/services/quote-room-store";

const BODY_LIMIT_BYTES = 8 * 1024;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; offerId: string }> },
) {
  const { token, offerId } = await params;
  const rateLimited = enforceRateLimit({
    key: `public-quote-room-offer:${token}:${getClientIp(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { action?: unknown; note?: unknown };
  try {
    body = await readJsonWithLimit(req, BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action !== "accept" && body.action !== "reject") {
    return NextResponse.json({ error: "Action must be accept or reject" }, { status: 400 });
  }

  try {
    const room = await decideQuoteRoomOffer(token, offerId, {
      action: body.action,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    if (!room) return NextResponse.json({ error: "Quote room not found" }, { status: 404 });
    return NextResponse.json({ room: { ...room, publicToken: undefined } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
