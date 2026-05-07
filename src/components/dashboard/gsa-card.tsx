import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GsaProfile } from "@/lib/types";

export function GsaCard({ gsa }: { gsa: GsaProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{gsa.name}</CardTitle>
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Building2 className="h-4 w-4 text-brand" />
          {gsa.headquarters}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-muted">{gsa.summary}</p>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-border-ui bg-surface2 p-2.5">
            <p className="text-ink-muted">Network</p>
            <p className="mt-0.5 text-lg font-bold text-ink">{gsa.networkScore}</p>
          </div>
          <div className="rounded-xl border border-border-ui bg-surface2 p-2.5">
            <p className="text-ink-muted">Finance</p>
            <p className="mt-0.5 text-lg font-bold text-ink">{gsa.financialScore}</p>
          </div>
          <div className="rounded-xl border border-border-ui bg-surface2 p-2.5">
            <p className="text-ink-muted">Compliance</p>
            <p className="mt-0.5 text-lg font-bold text-ink">{gsa.complianceScore}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {gsa.certifications.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand"
            >
              <ShieldCheck className="h-3 w-3" />
              {item}
            </span>
          ))}
        </div>

        <Link
          href={`/airline/gsa/${gsa.id}`}
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          Open profile
        </Link>
      </CardContent>
    </Card>
  );
}
