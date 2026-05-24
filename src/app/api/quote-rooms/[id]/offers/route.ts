import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { createQuoteRoomOffer, getQuoteRoomPublicUrl, type RateOfferInput } from "@/lib/services/quote-room-store";

const BODY_LIMIT_BYTES = 16 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "admin")) {
    return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `quote-room-offer:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: RateOfferInput;
  try {
    input = await readJsonWithLimit(req, BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const room = await createQuoteRoomOffer(session, id, {
      ...input,
      ratePerKg: Number(input.ratePerKg),
    });
    return NextResponse.json({ room, publicUrl: getQuoteRoomPublicUrl(room, req.headers.get("origin") ?? undefined) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
