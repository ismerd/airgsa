import { getSession } from "@/lib/auth/session";
import { realGsaPartners, type RealGsaPartner } from "@/lib/real-gsa-data";
import { ApplyTenderClient } from "./apply-tender-client";

export default async function ApplyTenderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const gsa = realGsaPartners.find((partner) => partner.name === session?.company) ??
    realGsaPartners.find((partner) => partner.email === session?.email) ??
    createSessionGsaProfile(session);

  return <ApplyTenderClient tenderId={id} gsa={gsa} />;
}

function createSessionGsaProfile(session: Awaited<ReturnType<typeof getSession>>): RealGsaPartner {
  return {
    id: session?.companyId ?? session?.email ?? "gsa-session",
    name: session?.company ?? "GSA",
    contactName: session?.name ?? "GSA user",
    email: session?.email ?? "",
    country: "Germany",
    headquarters: "Not provided",
    coverage: [],
    markets: [],
    certifications: [],
    cargoFocus: "General cargo",
    color: "#2563EB",
    networkScore: 50,
    financialScore: 50,
    complianceScore: 50,
    winRate: 0,
    summary: "GSA profile will be completed after account verification.",
  };
}
