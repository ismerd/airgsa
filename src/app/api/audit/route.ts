import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listMandateAuditEvents } from "@/lib/services/mandate-execution-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ auditEvents: await listMandateAuditEvents(session) });
}
