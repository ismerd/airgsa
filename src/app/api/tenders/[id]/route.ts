import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLiveTender } from "@/lib/services/tender-workflow-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tender = await getLiveTender(id);
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  if (session.role === "gsa" && tender.status !== "open") {
    return NextResponse.json({ error: "Tender not available" }, { status: 404 });
  }

  return NextResponse.json({ tender });
}
