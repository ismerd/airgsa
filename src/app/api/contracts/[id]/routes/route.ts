import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canEditContract } from "@/lib/auth/permissions";
import { assignRoutesToContract, getLivePartnerContract } from "@/lib/services/tender-workflow-store";
import { appendMandateAuditEvent } from "@/lib/services/mandate-execution-store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getLivePartnerContract(id);
  if (!existing || !canEditContract(session, existing)) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  if (existing.status === "closed") {
    return NextResponse.json({ error: "Closed contracts cannot receive route assignments" }, { status: 409 });
  }

  const body = (await req.json()) as { routeId?: string; routeIds?: string[] };
  const routeIds = Array.isArray(body.routeIds) ? body.routeIds : body.routeId ? [body.routeId] : [];
  if (routeIds.length === 0) {
    return NextResponse.json({ error: "At least one routeId is required" }, { status: 400 });
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
