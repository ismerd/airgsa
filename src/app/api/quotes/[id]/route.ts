import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateMandateQuoteStatus, type QuoteActionInput } from "@/lib/services/mandate-execution-store";

const ACTIONS = new Set(["approve", "reject", "counter", "decline"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const input = (await req.json()) as QuoteActionInput;
  if (!input.action || !ACTIONS.has(input.action)) {
    return NextResponse.json({ error: "Invalid quote action" }, { status: 400 });
  }

  try {
    const quote = await updateMandateQuoteStatus(session, id, input);
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    return NextResponse.json({ quote });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
