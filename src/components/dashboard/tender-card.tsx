import Link from "next/link";
import { CalendarDays, MapPin, PlaneTakeoff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { Tender } from "@/lib/types";

export function TenderCard({ tender, href, cta = "View tender" }: { tender: Tender; href: string; cta?: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{tender.title}</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">{tender.airline}</p>
          </div>
          <StatusBadge status={tender.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2.5 text-sm text-ink-muted">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand" />
            {tender.regions.join(", ")}
          </span>
          <span className="flex items-center gap-2">
            <PlaneTakeoff className="h-4 w-4 text-brand" />
            {tender.lanes}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            Deadline {tender.deadline}
          </span>
        </div>
        <div className="rounded-xl bg-surface2 border border-border-ui p-3 text-sm text-ink-muted">
          <span className="font-semibold text-ink">{tender.annualTonnage.toLocaleString()} tons</span> expected annually,
          focused on {tender.productMix.toLowerCase()}.
        </div>
        <div className="rounded-xl border border-border-ui bg-surface2 p-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{getAwardLabel(tender)}</Badge>
            <Badge variant="muted">{getCommercialLabel(tender)}</Badge>
          </div>
          <p className="mt-2 text-sm leading-5 text-ink-muted">{getCommercialHelper(tender)}</p>
        </div>
        <Link href={href} className={buttonVariants({ className: "w-full" })}>{cta}</Link>
      </CardContent>
    </Card>
  );
}

function getAwardLabel(tender: Tender) {
  if (tender.awardMode === "multi") return `${Math.max(2, tender.maxAwards ?? 2)} winners possible`;
  return "Single winner";
}

function getCommercialLabel(tender: Tender) {
  const model = tender.commercialModel ?? "commission";
  if (model === "capacity-risk") return "Capacity-risk";
  if (model === "hybrid") return "Hybrid";
  return "Commission bid";
}

function getCommercialHelper(tender: Tender) {
  const model = tender.commercialModel ?? "commission";
  if (model === "capacity-risk") return "You take responsibility for selling allocated capacity profitably.";
  if (model === "hybrid") return "Bid a base commercial proposal with volume or yield upside.";
  return "Bid commission terms, account access, launch timeline, and sales plan.";
}
