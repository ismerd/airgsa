import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createMandateQuote, listMandateQuotes, type QuoteCreateInput } from "@/lib/services/mandate-execution-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ quotes: await listMandateQuotes(session) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "gsa") return NextResponse.json({ error: "GSA login required" }, { status: 403 });

  const input = (await req.json()) as QuoteCreateInput;
  if (!input.contractId || !input.customer || !input.origin || !input.destination || !input.requestedRatePerKg) {
    return NextResponse.json({ error: "Missing quote fields" }, { status: 400 });
  }

  try {
    const quote = await createMandateQuote(session, {
      ...input,
      weightKg: Number(input.weightKg),
      pieces: Number(input.pieces),
      requestedRatePerKg: Number(input.requestedRatePerKg),
    });
    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
