import { NextResponse } from "next/server";
import { getSaudiaFlights } from "@/lib/services/fr24";

export async function GET() {
  const result = await getSaudiaFlights();
  return NextResponse.json(result);
}
