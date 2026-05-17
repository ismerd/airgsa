import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateMandateBooking, type BookingUpdateInput } from "@/lib/services/mandate-execution-store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "airline" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const input = (await req.json()) as BookingUpdateInput;

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
