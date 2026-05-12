import { NextResponse } from "next/server";
import { getSaudiaCargoFlights } from "@/lib/services/fr24";

export async function GET() {
  const result = await getSaudiaCargoFlights();
  return NextResponse.json(result);
}
