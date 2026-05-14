import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createLiveApplication, type ApplicationCreateInput } from "@/lib/services/tender-workflow-store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "gsa") return NextResponse.json({ error: "GSA login required" }, { status: 403 });

  const { id } = await params;
  const input = (await req.json()) as ApplicationCreateInput;

  try {
    const application = await createLiveApplication(id, session.company, input);
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
