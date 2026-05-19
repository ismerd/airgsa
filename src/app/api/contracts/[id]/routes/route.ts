import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { canEditContract } from "@/lib/auth/permissions";
import { assignRoutesToContract, getLivePartnerContract } from "@/lib/services/tender-workflow-store";
import { appendMandateAuditEvent } from "@/lib/services/mandate-execution-store";

const ROUTE_ASSIGN_BODY_LIMIT_BYTES = 8 * 1024;
const MAX_ROUTE_ASSIGNMENTS_PER_REQUEST = 50;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `contract-routes:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const existing = await getLivePartnerContract(id);
  if (!existing || !canEditContract(session, existing)) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  if (existing.status === "closed") {
    return NextResponse.json({ error: "Closed contracts cannot receive route assignments" }, { status: 409 });
  }

  let body: { routeId?: string; routeIds?: string[] };
  try {
    body = await readJsonWithLimit<{ routeId?: string; routeIds?: string[] }>(req, ROUTE_ASSIGN_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const routeIds = Array.isArray(body.routeIds) ? body.routeIds : body.routeId ? [body.routeId] : [];
  if (routeIds.length === 0) {
    return NextResponse.json({ error: "At least one routeId is required" }, { status: 400 });
  }
  if (routeIds.length > MAX_ROUTE_ASSIGNMENTS_PER_REQUEST) {
    return NextResponse.json({ error: `A maximum of ${MAX_ROUTE_ASSIGNMENTS_PER_REQUEST} routes can be assigned per request` }, { status: 400 });
  }

  try {
    const contract = await assignRoutesToContract(id, routeIds, session.email);
    if (contract) {
      await appendMandateAuditEvent(session, {
        entityType: "route",
        entityId: contract.id,
        action: "route.assigned",
        summary: `${session.company} assigned ${routeIds.join(", ")} to ${contract.gsaName}`,
        metadata: { routeCount: routeIds.length },
      });
    }
    return NextResponse.json({ contract });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
