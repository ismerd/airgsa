import { getSession } from "@/lib/auth/session";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { GsaMarketplaceClient } from "./marketplace-client";

export default async function GsaMarketplacePage() {
  const session = await getSession();
  const gsa = realGsaPartners.find((partner) => partner.name === session?.company) ?? realGsaPartners[0];

  return <GsaMarketplaceClient gsaName={gsa.name} markets={gsa.markets} />;
}
