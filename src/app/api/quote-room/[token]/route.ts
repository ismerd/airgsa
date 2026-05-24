import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { addCustomerQuoteRoomMessage, getPublicQuoteRoom } from "@/lib/services/quote-room-store";

const BODY_LIMIT_BYTES = 8 * 1024;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const room = await getPublicQuoteRoom(token);
    if (!room) return NextResponse.json({ error: "Quote room not found" }, { status: 404 });
    return NextResponse.json({ room: sanitizePublicRoom(room) });
  } catch (error) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Quote room could not be loaded" : (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rateLimited = enforceRateLimit({
    key: `public-quote-room-message:${token}:${getClientIp(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { body?: unknown; authorName?: unknown };
  try {
    body = await readJsonWithLimit(req, BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const room = await addCustomerQuoteRoomMessage(token, {
      body: typeof body.body === "string" ? body.body : "",
      authorName: typeof body.authorName === "string" ? body.authorName : undefined,
    });
    if (!room) return NextResponse.json({ error: "Quote room not found" }, { status: 404 });
    return NextResponse.json({ room: sanitizePublicRoom(room) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}

function sanitizePublicRoom<T extends { publicToken?: string }>(room: T) {
  return { ...room, publicToken: undefined };
}
