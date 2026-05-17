import { Topbar } from "@/components/dashboard/topbar";
import { getSession } from "@/lib/auth/session";
import { listTeamAccounts } from "@/lib/services/team-accounts";
import { TeamAccessClient } from "@/app/gsa/team/team-access-client";

export default async function AirlineTeamPage() {
  const session = await getSession();
  const accounts = session ? await listTeamAccounts(session.company, "airline") : [];

  return (
    <main className="min-h-screen bg-page">
      <Topbar title="Team & access" subtitle="Airline company" />
      <section className="space-y-6 p-6">
        <TeamAccessClient initialAccounts={accounts} company={session?.company ?? "Airline"} role="airline" />
      </section>
    </main>
  );
}
