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
import {
  createLiveTender,
  listLiveTenders,
  type TenderCoverageModel,
  type TenderCreateInput,
  type TenderMandateType,
  type TenderReportingCadence,
} from "@/lib/services/tender-workflow-store";

const TENDER_BODY_LIMIT_BYTES = 128 * 1024;
const mandateTypes = new Set<TenderMandateType>(["full-gsa", "sales-only", "route-launch", "product-specialist", "regional-cluster"]);
const coverageModels = new Set<TenderCoverageModel>(["country-wide", "airport-led", "route-led", "regional-cluster"]);
const reportingCadences = new Set<TenderReportingCadence>(["weekly", "biweekly", "monthly", "quarterly"]);

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

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const countryScope = typeof input.countryScope === "string" ? input.countryScope.trim() : "";
  if (!title) return NextResponse.json({ error: "Tender title is required." }, { status: 400 });
  if (!countryScope) return NextResponse.json({ error: "Tender market scope is required." }, { status: 400 });
  if (input.mandateType && !mandateTypes.has(input.mandateType)) {
    return NextResponse.json({ error: "Invalid mandate type." }, { status: 400 });
  }
  if (input.coverageModel && !coverageModels.has(input.coverageModel)) {
    return NextResponse.json({ error: "Invalid coverage model." }, { status: 400 });
  }
  if (input.reportingCadence && !reportingCadences.has(input.reportingCadence)) {
    return NextResponse.json({ error: "Invalid reporting cadence." }, { status: 400 });
  }
  if (input.coverageModel === "route-led" && (!Array.isArray(input.routes) || input.routes.length === 0)) {
    return NextResponse.json({ error: "Route-led tenders need at least one route lane." }, { status: 400 });
  }
  if (input.coverageModel === "airport-led" && !input.lanes?.trim() && (!Array.isArray(input.routes) || input.routes.length === 0)) {
    return NextResponse.json({ error: "Airport-led tenders need key airports or route lanes." }, { status: 400 });
  }
  const commissionRate = Number(input.commissionRate);
  if (Number.isFinite(commissionRate) && (commissionRate < 0 || commissionRate > 100)) {
    return NextResponse.json({ error: "Commission target must be between 0 and 100%." }, { status: 400 });
  }
  const targetLoadFactor = Number(input.targetLoadFactor);
  if (Number.isFinite(targetLoadFactor) && (targetLoadFactor < 0 || targetLoadFactor > 100)) {
    return NextResponse.json({ error: "Target load factor must be between 0 and 100%." }, { status: 400 });
  }

  const tender = await createLiveTender({
    ...input,
    title,
    countryScope,
    mandateType: input.mandateType ?? "full-gsa",
    coverageModel: input.coverageModel ?? "country-wide",
    commissionRate: Number.isFinite(commissionRate) ? commissionRate : undefined,
    targetLoadFactor: Number.isFinite(targetLoadFactor) ? targetLoadFactor : undefined,
    monthlyRevenueTarget: Number.isFinite(Number(input.monthlyRevenueTarget)) ? Number(input.monthlyRevenueTarget) : undefined,
    requiredCapabilities: Array.isArray(input.requiredCapabilities) ? input.requiredCapabilities.map((item) => String(item).trim()).filter(Boolean) : [],
    airline: session.company,
    airlineEmail: session.email,
    airlineCompanyId: session.companyId,
  });

  return NextResponse.json({ tender }, { status: 201 });
}
