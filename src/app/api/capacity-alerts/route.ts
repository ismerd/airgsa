import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createCapacityAlert,
  listCapacityAlertCandidates,
  listCapacityAlerts,
  type CapacityAlertInput,
} from "@/lib/services/capacity-alert-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [alerts, routes] = await Promise.all([
    listCapacityAlerts(session),
    listCapacityAlertCandidates(session),
  ]);
  return NextResponse.json({ alerts, routes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.accessRole === "viewer" || session.accessRole === "operator") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  try {
    const alert = await createCapacityAlert(session, (await req.json()) as CapacityAlertInput);
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
