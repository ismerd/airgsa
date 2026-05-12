import { FlightWorldMap } from "@/components/dashboard/flight-world-map";
import { GsaAssignedRoutesSummary } from "@/components/dashboard/gsa-assigned-routes-summary";
import { TenderCard } from "@/components/dashboard/tender-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { dummyFlights, getFlightsForGsa } from "@/lib/dummy-flight-data";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { newsPosts, tenders } from "@/lib/services/platform";

export default async function GsaMarketplacePage() {
  const session = await getSession();
  const demoGsa = realGsaPartners.find((partner) => partner.name === session?.company) ?? realGsaPartners[0];
  const trackedFlights = getFlightsForGsa(dummyFlights, { gsaName: demoGsa.name });

  return (
    <>
      <Topbar title="Open tender marketplace" subtitle="GSA opportunity desk" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Open tenders" value="12" />
          <Metric label="Matched markets" value="7" />
          <Metric label="New signals" value={String(newsPosts.length)} />
        </div>
        <GsaAssignedRoutesSummary companyName={demoGsa.name} />
        <FlightWorldMap
          title="GSA shipment tracker"
          subtitle={`Only shipments sold or handled by ${demoGsa.name} are shown.`}
          flights={trackedFlights}
          markerColorMode="gsa"
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {tenders.map((tender) => (
            <TenderCard key={tender.id} tender={tender} href={`/gsa/tenders/${tender.id}`} cta="Open tender" />
          ))}
        </div>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-ink-muted">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
