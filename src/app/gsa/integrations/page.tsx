import { Topbar } from "@/components/dashboard/topbar";
import { getFreshSession } from "@/lib/auth/session";
import { getCargoIntegrationSettings } from "@/lib/services/cargo-integration-store";
import { GsaIntegrationsClient } from "./gsa-integrations-client";

export const dynamic = "force-dynamic";

export default async function GsaIntegrationsPage() {
  const session = await getFreshSession();
  const ecargoware = await getCargoIntegrationSettings(session, "ecargoware");

  return (
    <>
      <Topbar title="Integrations" subtitle="Connect cargo systems per GSA company" />
      <main className="p-5">
        <GsaIntegrationsClient initialIntegration={ecargoware} />
      </main>
    </>
  );
}
