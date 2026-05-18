import { Topbar } from "@/components/dashboard/topbar";
import { GsaNetworkMap } from "@/components/dashboard/gsa-network-map";
import gsaData from "@/lib/gsa-network-data.json";

export default function GsaNetworkPage() {
  const totalCountries = new Set(
    (gsaData as { geoCountry: string }[]).map((g) => g.geoCountry).filter(Boolean),
  ).size;

  return (
    <>
      <Topbar
        title="GSA Network"
        subtitle="GSA partners by country"
      />
      <main className="space-y-5 p-5">
        <GsaNetworkMap gsas={gsaData as never} totalCountries={totalCountries} />
      </main>
    </>
  );
}
