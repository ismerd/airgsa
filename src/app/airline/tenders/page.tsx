"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlaneTakeoff } from "lucide-react";
import { TenderCard } from "@/components/dashboard/tender-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveTender } from "@/lib/services/tender-workflow-store";

export default function AirlineTendersPage() {
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tenders")
      .then((res) => res.json())
      .then((data) => setTenders(data.tenders ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar title="Tender overview" subtitle="Airline tender desk" />
      <main className="p-5">
        <div className="mb-5 flex justify-end">
          <Link href="/airline/tenders/create" className={buttonVariants()}>Create tender</Link>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-sm text-ink-muted">Loading tenders...</CardContent>
          </Card>
        ) : tenders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <PlaneTakeoff className="h-10 w-10 text-ink-muted/40" />
              <div>
                <p className="text-lg font-semibold text-ink">No tenders published yet</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Create the first Saudia Cargo GSA tender. It will appear in the GSA marketplace immediately when published.
                </p>
              </div>
              <Button asChild>
                <Link href="/airline/tenders/create">Create tender</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {tenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} href="/airline/applications" cta="Review applications" />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
