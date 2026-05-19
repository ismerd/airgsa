import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { canViewContract } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { extractCustomerQuoteEmail } from "@/lib/services/customer-email-parser";
import { listLivePartnerContracts } from "@/lib/services/tender-workflow-store";

const EMAIL_PARSE_BODY_LIMIT_BYTES = 24 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "gsa") return NextResponse.json({ error: "GSA login required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `quote-email-parse:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { emailText?: unknown; contractId?: unknown };
  try {
    body = await readJsonWithLimit<{ emailText?: unknown; contractId?: unknown }>(req, EMAIL_PARSE_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const emailText = typeof body.emailText === "string" ? body.emailText.trim() : "";
  if (!emailText) return NextResponse.json({ error: "Email text is required" }, { status: 400 });

  try {
    const [parseResult, contracts] = await Promise.all([
      extractCustomerQuoteEmail(emailText),
      listLivePartnerContracts(),
    ]);
    const visibleContracts = contracts.filter((contract) => canViewContract(session, contract));
    const selectedContract =
      visibleContracts.find((contract) => contract.id === body.contractId) ??
      visibleContracts.find((contract) =>
        contract.contractRoutes.some(
          (route) =>
            route.status === "assigned" &&
            route.origin === parseResult.extracted.origin &&
            route.destination === parseResult.extracted.destination,
        ),
      ) ??
      visibleContracts[0] ??
      null;
    const selectedRoute =
      selectedContract?.contractRoutes.find(
        (route) =>
          route.status === "assigned" &&
          route.origin === parseResult.extracted.origin &&
          route.destination === parseResult.extracted.destination,
      ) ??
      selectedContract?.contractRoutes.find((route) => route.status === "assigned") ??
      null;

    return NextResponse.json({
      ...parseResult,
      match: {
        contractId: selectedContract?.id,
        routeId: selectedRoute?.id,
        routeOrigin: selectedRoute?.origin,
        routeDestination: selectedRoute?.destination,
        exactRouteMatch: Boolean(
          selectedRoute &&
            selectedRoute.origin === parseResult.extracted.origin &&
            selectedRoute.destination === parseResult.extracted.destination,
        ),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
