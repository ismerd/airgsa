import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { updateMandateBooking, type BookingUpdateInput } from "@/lib/services/mandate-execution-store";

const BOOKING_PATCH_BODY_LIMIT_BYTES = 48 * 1024;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "airline" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimit({
    key: `booking-id-patch:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 160,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const { id } = await params;
  let input: BookingUpdateInput;
  try {
    input = await readJsonWithLimit<BookingUpdateInput>(req, BOOKING_PATCH_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const booking = await updateMandateBooking(session, id, {
      ...input,
      flownWeightKg: input.flownWeightKg ? Number(input.flownWeightKg) : undefined,
      finalRatePerKg: input.finalRatePerKg ? Number(input.finalRatePerKg) : undefined,
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
