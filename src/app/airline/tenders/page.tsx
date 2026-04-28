import Link from "next/link";
import { TenderCard } from "@/components/dashboard/tender-card";
import { Topbar } from "@/components/dashboard/topbar";
import { buttonVariants } from "@/components/ui/button";
import { tenders } from "@/lib/services/platform";

export default function AirlineTendersPage() {
  return (
    <>
      <Topbar title="Tender overview" subtitle="Airline tender desk" />
      <main className="p-5">
        <div className="mb-5 flex justify-end">
          <Link href="/airline/tenders/create" className={buttonVariants()}>Create tender</Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {tenders.map((tender) => (
            <TenderCard key={tender.id} tender={tender} href="/airline/applications" cta="Review applications" />
          ))}
        </div>
      </main>
    </>
  );
}
