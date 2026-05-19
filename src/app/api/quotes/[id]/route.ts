import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { updateMandateQuoteStatus, type QuoteActionInput } from "@/lib/services/mandate-execution-store";

const ACTIONS = new Set(["approve", "reject", "counter", "decline"]);
const QUOTE_ACTION_BODY_LIMIT_BYTES = 16 * 1024;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `quote-action:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 160,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const { id } = await params;
  let input: QuoteActionInput;
  try {
    input = await readJsonWithLimit<QuoteActionInput>(req, QUOTE_ACTION_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!input.action || !ACTIONS.has(input.action)) {
    return NextResponse.json({ error: "Invalid quote action" }, { status: 400 });
  }
  if (input.action === "counter") {
    input.counterRatePerKg = Number(input.counterRatePerKg);
    if (!Number.isFinite(input.counterRatePerKg) || input.counterRatePerKg <= 0) {
      return NextResponse.json({ error: "Counter rate must be greater than zero" }, { status: 400 });
    }
  }

  try {
    const quote = await updateMandateQuoteStatus(session, id, input);
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    return NextResponse.json({ quote });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
