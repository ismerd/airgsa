import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { listLivePartnerContracts, listRoutesForGsa } from "@/lib/services/tender-workflow-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "gsa") {
    return NextResponse.json({ routes: await listRoutesForGsa(session) });
  }

  if (session.role === "admin") {
    const contracts = await listLivePartnerContracts();
    return NextResponse.json({
      routes: contracts.flatMap((contract) =>
        contract.contractRoutes
          .filter((route) => route.status === "assigned")
          .map((route) => ({
            ...route,
            contractId: contract.id,
            tenderId: contract.tenderId,
            airline: contract.airline,
            airlineEmail: contract.airlineEmail,
            airlineCompanyId: contract.airlineCompanyId,
            gsaId: contract.gsaId,
            gsaCompanyId: contract.gsaCompanyId,
            gsaName: contract.gsaName,
            contractStartDate: contract.startDate,
            contractEndDate: contract.endDate,
            commercialTerms: contract.commercialTerms,
            commissionRate: contract.commissionRate,
          })),
      ),
    });
  }

  const contracts = (await listLivePartnerContracts()).filter((contract) => canViewContract(session, contract));
  return NextResponse.json({
    routes: contracts.flatMap((contract) =>
      contract.contractRoutes
        .filter((route) => route.status === "assigned")
        .map((route) => ({
          ...route,
          contractId: contract.id,
          tenderId: contract.tenderId,
          airline: contract.airline,
          airlineEmail: contract.airlineEmail,
          airlineCompanyId: contract.airlineCompanyId,
          gsaId: contract.gsaId,
          gsaCompanyId: contract.gsaCompanyId,
          gsaName: contract.gsaName,
          contractStartDate: contract.startDate,
          contractEndDate: contract.endDate,
          commercialTerms: contract.commercialTerms,
          commissionRate: contract.commissionRate,
        })),
    ),
  });
}
