import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listWorkflowEmailDeliveries } from "@/lib/services/notification-email";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ deliveries: await listWorkflowEmailDeliveries() });
}
