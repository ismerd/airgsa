import { Topbar } from "@/components/dashboard/topbar";
import { ECARGOWARE_OPERATIONS } from "@/lib/integrations/ecargoware-catalog";
import { CargoWorkspaceClient } from "./cargo-workspace-client";

export default function CargoWorkspacePage() {
  return (
    <main className="min-h-screen bg-page">
      <Topbar title="Cargo workspace" subtitle="GSA operations" />
      <section className="space-y-6 p-6">
        <CargoWorkspaceClient operations={ECARGOWARE_OPERATIONS} />
      </section>
    </main>
  );
}
