import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canDeleteTender, canEditTender, canViewTender } from "@/lib/auth/permissions";
import { deleteLiveTender, getLiveTender, updateLiveTender, type TenderUpdateInput } from "@/lib/services/tender-workflow-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tender = await getLiveTender(id);
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  if (!canViewTender(session, tender)) {
    return NextResponse.json({ error: "Tender not available" }, { status: 404 });
  }

  return NextResponse.json({ tender });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "airline") return NextResponse.json({ error: "Airline login required" }, { status: 403 });

  const { id } = await params;
  const existing = await getLiveTender(id);
  if (!existing) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  if (!canEditTender(session, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const input = (await req.json()) as TenderUpdateInput;
  const tender = await updateLiveTender(id, input);
  return NextResponse.json({ tender });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "airline") return NextResponse.json({ error: "Airline login required" }, { status: 403 });

  const { id } = await params;
  const existing = await getLiveTender(id);
  if (!existing) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  if (!canDeleteTender(session, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await deleteLiveTender(id);
  return NextResponse.json({ ok: true });
}
