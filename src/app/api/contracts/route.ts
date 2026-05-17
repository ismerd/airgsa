import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { listLivePartnerContracts } from "@/lib/services/tender-workflow-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contracts = await listLivePartnerContracts();
  return NextResponse.json({
    contracts: contracts.filter((contract) => canViewContract(session, contract)),
  });
}
