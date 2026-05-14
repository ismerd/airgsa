"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Inbox } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveTender } from "@/lib/services/tender-workflow-store";

export default function NotificationsPage() {
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
      <Topbar title="Notifications" subtitle="Tender and workflow updates" />
      <main className="space-y-5 p-5">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-brand" />
          <p className="text-sm font-semibold text-ink">Live tender notifications</p>
          {tenders.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {tenders.length}
            </span>
          )}
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-ink-muted">Loading notifications...</CardContent>
          </Card>
        ) : tenders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <Inbox className="h-10 w-10 text-ink-muted/40" />
              <div>
                <p className="font-semibold text-ink">No tender notifications</p>
                <p className="mt-1 text-sm text-ink-muted">
                  When an airline publishes a tender, the GSA workspace will show it here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tenders.map((tender) => (
              <Card key={tender.id} className="border-brand/30">
                <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="success">New tender live</Badge>
                      <span className="text-xs text-ink-muted">{new Date(tender.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 font-semibold text-ink">{tender.title}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {tender.airline} is requesting GSA representation for {tender.countryScope || tender.lanes}.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/gsa/tenders/${tender.id}`}>Open tender</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
