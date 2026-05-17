import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  listWorkflowNotifications,
  markAllWorkflowNotificationsRead,
} from "@/lib/services/mandate-execution-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ notifications: await listWorkflowNotifications(session) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = (await req.json().catch(() => ({}))) as { markAllRead?: boolean };
  if (!input.markAllRead) return NextResponse.json({ error: "Unsupported notification update" }, { status: 400 });

  return NextResponse.json({ notifications: await markAllWorkflowNotificationsRead(session) });
}
