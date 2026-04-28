import Link from "next/link";
import { CalendarDays, MapPin, PlaneTakeoff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
            <p className="mt-1 text-sm text-slate-400">{tender.airline}</p>
          </div>
          <StatusBadge status={tender.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm text-slate-300">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-300" />
            {tender.regions.join(", ")}
          </span>
          <span className="flex items-center gap-2">
            <PlaneTakeoff className="h-4 w-4 text-cyan-300" />
            {tender.lanes}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-cyan-300" />
            Deadline {tender.deadline}
          </span>
        </div>
        <div className="rounded-md bg-slate-950/60 p-3 text-sm text-slate-300">
          <span className="font-semibold text-white">{tender.annualTonnage.toLocaleString()} tons</span> expected annually,
          focused on {tender.productMix.toLowerCase()}.
        </div>
        <Link href={href} className={buttonVariants({ className: "w-full" })}>{cta}</Link>
      </CardContent>
    </Card>
  );
}
