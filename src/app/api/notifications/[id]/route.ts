import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { markWorkflowNotificationRead } from "@/lib/services/mandate-execution-store";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const notification = await markWorkflowNotificationRead(session, (await params).id);
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    return NextResponse.json({ notification });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
