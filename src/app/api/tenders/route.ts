import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { canViewTender } from "@/lib/auth/permissions";
import { createLiveTender, listLiveTenders, type TenderCreateInput } from "@/lib/services/tender-workflow-store";

const TENDER_BODY_LIMIT_BYTES = 128 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenders = await listLiveTenders();
  const visibleTenders = tenders.filter((tender) => canViewTender(session, tender));

  return NextResponse.json({
    tenders: visibleTenders,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "airline") return NextResponse.json({ error: "Airline login required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `tender-create:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let input: Omit<TenderCreateInput, "airline" | "airlineEmail">;
  try {
    input = await readJsonWithLimit<Omit<TenderCreateInput, "airline" | "airlineEmail">>(req, TENDER_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tender = await createLiveTender({
    ...input,
    airline: session.company,
    airlineEmail: session.email,
    airlineCompanyId: session.companyId,
  });

  return NextResponse.json({ tender }, { status: 201 });
}
