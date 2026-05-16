import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canCreateApplication } from "@/lib/auth/permissions";
import { createLiveApplication, getLiveTender, type ApplicationCreateInput } from "@/lib/services/tender-workflow-store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "gsa") return NextResponse.json({ error: "GSA login required" }, { status: 403 });

  const { id } = await params;
  const input = (await req.json()) as ApplicationCreateInput;
  const tender = await getLiveTender(id);
  if (!tender || !canCreateApplication(session, tender)) {
    return NextResponse.json({ error: "Tender is not open for applications" }, { status: 403 });
  }

  try {
    const application = await createLiveApplication(id, session, input);
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
