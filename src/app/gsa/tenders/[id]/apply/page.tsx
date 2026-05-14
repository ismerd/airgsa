import { getSession } from "@/lib/auth/session";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { ApplyTenderClient } from "./apply-tender-client";

export default async function ApplyTenderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const gsa = realGsaPartners.find((partner) => partner.name === session?.company) ?? realGsaPartners[0];

  return <ApplyTenderClient tenderId={id} gsa={gsa} />;
}
