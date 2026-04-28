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
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Building2 className="h-4 w-4 text-cyan-300" />
          {gsa.headquarters}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-300">{gsa.summary}</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-slate-950/60 p-2">
            <p className="text-slate-400">Network</p>
            <p className="text-lg font-semibold text-white">{gsa.networkScore}</p>
          </div>
          <div className="rounded-md bg-slate-950/60 p-2">
            <p className="text-slate-400">Finance</p>
            <p className="text-lg font-semibold text-white">{gsa.financialScore}</p>
          </div>
          <div className="rounded-md bg-slate-950/60 p-2">
            <p className="text-slate-400">Compliance</p>
            <p className="text-lg font-semibold text-white">{gsa.complianceScore}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {gsa.certifications.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
              <ShieldCheck className="h-3 w-3" />
              {item}
            </span>
          ))}
        </div>
        <Link href={`/airline/gsa/${gsa.id}`} className={buttonVariants({ variant: "outline", className: "w-full" })}>
          Open profile
        </Link>
      </CardContent>
    </Card>
  );
}
