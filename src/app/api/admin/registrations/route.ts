import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAllRegistrations } from "@/lib/registrations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const registrations = await getAllRegistrations();
  return NextResponse.json(registrations);
}
