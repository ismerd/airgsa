import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createMandateBooking,
  listMandateBookings,
  updateMandateBooking,
  type BookingCreateInput,
  type BookingUpdateInput,
} from "@/lib/services/mandate-execution-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ bookings: await listMandateBookings(session) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "airline" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = (await req.json()) as BookingUpdateInput & { id?: string; awbNumber?: string };
  const id = input.id ?? input.awbNumber;
  if (!id) return NextResponse.json({ error: "Missing booking id or AWB number" }, { status: 400 });

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
