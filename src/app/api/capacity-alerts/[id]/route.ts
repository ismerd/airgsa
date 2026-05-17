import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateCapacityAlert, type CapacityAlertUpdateInput } from "@/lib/services/capacity-alert-store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.accessRole === "viewer" || session.accessRole === "operator") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  try {
    const alert = await updateCapacityAlert(session, (await params).id, (await req.json()) as CapacityAlertUpdateInput);
    if (!alert) return NextResponse.json({ error: "Capacity alert not found" }, { status: 404 });
    return NextResponse.json({ alert });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
