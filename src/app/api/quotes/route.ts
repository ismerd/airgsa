import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { createMandateQuote, listMandateQuotes, type QuoteCreateInput } from "@/lib/services/mandate-execution-store";

const QUOTE_BODY_LIMIT_BYTES = 32 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ quotes: await listMandateQuotes(session) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "gsa") return NextResponse.json({ error: "GSA login required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `quote-create:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: QuoteCreateInput;
  try {
    input = await readJsonWithLimit<QuoteCreateInput>(req, QUOTE_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

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
