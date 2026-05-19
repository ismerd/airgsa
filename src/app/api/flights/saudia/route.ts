import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSaudiaFlights } from "@/lib/services/fr24";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "airline", "gsa"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await getSaudiaFlights();
  return NextResponse.json(result);
}
