import { Topbar } from "@/components/dashboard/topbar";
import { getSession } from "@/lib/auth/session";
import { listTeamAccounts } from "@/lib/services/team-accounts";
import { TeamAccessClient } from "./team-access-client";

export default async function GsaTeamPage() {
  const session = await getSession();
  const accounts = session ? await listTeamAccounts(session.company, "gsa", session.companyId) : [];

  return (
    <main className="min-h-screen bg-page">
      <Topbar title="Team & access" subtitle="GSA company" />
      <section className="space-y-6 p-6">
        <TeamAccessClient initialAccounts={accounts} company={session?.company ?? "GSA"} role="gsa" />
      </section>
    </main>
  );
}
