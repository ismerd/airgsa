"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Inbox, MapPin } from "lucide-react";
import { TenderCard } from "@/components/dashboard/tender-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";

export function GsaMarketplaceClient({ gsaName, markets }: { gsaName: string; markets: string[] }) {
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [applications, setApplications] = useState<LiveTenderApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/tenders").then((res) => (res.ok ? res.json() : { tenders: [] })),
      fetch("/api/applications").then((res) => (res.ok ? res.json() : { applications: [] })),
    ])
      .then(([tenderData, applicationData]) => {
        if (!active) return;
        setTenders(tenderData.tenders ?? []);
        setApplications(applicationData.applications ?? []);
      })
      .catch(() => {
        if (!active) return;
        setTenders([]);
        setApplications([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const appliedTenderIds = new Set(applications.map((application) => application.tenderId));
  const newTenders = tenders.filter((tender) => !appliedTenderIds.has(tender.id));
  const matchedTenders = useMemo(
    () => tenders.filter((tender) => tender.regions.some((region) => markets.includes(region))),
    [markets, tenders],
  );

  return (
    <>
      <Topbar title="Open tender marketplace" subtitle={gsaName} />
      <main className="space-y-5 p-5">
        {newTenders.length > 0 && (
          <Card className="border-brand/25">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-brand-light p-2 text-brand">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">
                    {newTenders.length} live tender{newTenders.length === 1 ? "" : "s"} available
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    New Saudia Cargo requests are live. Open a tender to review the scope and submit your application.
                  </p>
                </div>
              </div>
              <Badge variant="success">New opportunity</Badge>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Open tenders" value={String(tenders.length)} />
          <Metric label="Matched markets" value={String(matchedTenders.length)} />
          <Metric label="Submitted applications" value={String(applications.length)} />
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-sm text-ink-muted">Loading marketplace...</CardContent>
          </Card>
        ) : tenders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <Inbox className="h-10 w-10 text-ink-muted/40" />
              <div>
                <p className="text-lg font-semibold text-ink">No live tenders right now</p>
                <p className="mt-1 text-sm text-ink-muted">
                  When Saudia Cargo publishes a tender, it will appear here and trigger the notification above.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {tenders.map((tender) => (
              <TenderCard
                key={tender.id}
                tender={tender}
                href={appliedTenderIds.has(tender.id) ? `/gsa/tenders/${tender.id}/apply` : `/gsa/tenders/${tender.id}`}
                cta={appliedTenderIds.has(tender.id) ? "View application" : "Open tender"}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-ink-muted">
          <MapPin className="h-4 w-4 text-brand" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
