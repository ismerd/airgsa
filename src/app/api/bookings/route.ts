import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createMandateBooking,
  listMandateBookings,
  type BookingCreateInput,
} from "@/lib/services/mandate-execution-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ bookings: await listMandateBookings(session) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "admin")) {
    return NextResponse.json({ error: "GSA login required" }, { status: 403 });
  }

  const input = (await req.json()) as BookingCreateInput;
  if (!input.quoteId) return NextResponse.json({ error: "Missing quote id" }, { status: 400 });

  try {
    const booking = await createMandateBooking(session, {
      ...input,
      flownWeightKg: input.flownWeightKg ? Number(input.flownWeightKg) : undefined,
      finalRatePerKg: input.finalRatePerKg ? Number(input.finalRatePerKg) : undefined,
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
