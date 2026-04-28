import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="bg-white text-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className="rounded-md bg-cyan-50 p-2 text-cyan-600">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-emerald-600">{change}</p>
      </CardContent>
    </Card>
  );
}

