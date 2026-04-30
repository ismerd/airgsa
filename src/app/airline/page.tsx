import Link from "next/link";
import { DollarSign, Gauge, Handshake, PackageCheck } from "lucide-react";
import { FlightWorldMap } from "@/components/dashboard/flight-world-map";
import { GsaCard } from "@/components/dashboard/gsa-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TenderCard } from "@/components/dashboard/tender-card";
import { Topbar } from "@/components/dashboard/topbar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dummyFlights, getFlightsForAirline } from "@/lib/dummy-flight-data";
import { applications, gsaProfiles, kpiSeries, tenders } from "@/lib/services/platform";
import { formatCurrency } from "@/lib/utils";

export default function AirlineDashboardPage() {
  const latest = kpiSeries.at(-1)!;
  const trackedFlights = getFlightsForAirline(dummyFlights, {
    airlineName: "AeroBridge Cargo",
    salesTeams: ["AeroBridge DACH Sales", "AeroBridge Austria Desk"],
  });

  return (
    <>
      <Topbar title="Airline dashboard" subtitle="AeroBridge Cargo" />
      <main className="space-y-6 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Revenue" value={formatCurrency(latest.revenue)} change="+14.6% vs prior month" icon={DollarSign} />
          <KpiCard label="Loadfactor" value={`${latest.loadfactor}%`} change="+3 pts on focus lanes" icon={PackageCheck} />
          <KpiCard label="Yield" value={`$${latest.yield.toFixed(2)}/kg`} change="+6.1% blended yield" icon={Gauge} />
          <KpiCard label="Active GSAs" value="8" change="3 pending selection" icon={Handshake} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Tender overview</CardTitle>
              <Link href="/airline/tenders/create" className={buttonVariants({ size: "sm" })}>Create tender</Link>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {tenders.slice(0, 2).map((tender) => (
                <TenderCard key={tender.id} tender={tender} href="/airline/tenders" />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selection pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="rounded-md border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{application.gsaName}</p>
                    <p className="text-sm text-cyan-200">{application.commercialScore} score</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{application.proposedCommission}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <FlightWorldMap
          title="Sales flight tracker"
          subtitle="Flights connected to AeroBridge Cargo sales teams and GSA activity."
          flights={trackedFlights}
          markerColorMode="seller"
        />

        <div className="grid gap-5 lg:grid-cols-2">
          {gsaProfiles.slice(0, 2).map((gsa) => (
            <GsaCard key={gsa.id} gsa={gsa} />
          ))}
        </div>
      </main>
    </>
  );
}
