import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listContractTimeline } from "@/lib/services/mandate-execution-store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const timeline = await listContractTimeline(session, (await params).id);
    return NextResponse.json({ timeline });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
