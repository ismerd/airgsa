import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canEditContract } from "@/lib/auth/permissions";
import { getLivePartnerContract, unassignRouteFromContract } from "@/lib/services/tender-workflow-store";
import { appendMandateAuditEvent } from "@/lib/services/mandate-execution-store";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; routeId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, routeId } = await params;
  const existing = await getLivePartnerContract(id);
  if (!existing || !canEditContract(session, existing)) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const contract = await unassignRouteFromContract(id, routeId);
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  await appendMandateAuditEvent(session, {
    entityType: "route",
    entityId: contract.id,
    action: "route.unassigned",
    summary: `${session.company} removed ${routeId} from ${contract.gsaName}`,
    metadata: { routeId },
  });

  return NextResponse.json({ contract });
}
