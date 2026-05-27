import type { LucideIcon } from "lucide-react";

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
    <div className="flex flex-col gap-4 rounded-2xl border border-border-ui bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(26,90,255,0.10)]"
      style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <div className="rounded-lg bg-brand-light p-1.5 text-brand">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div>
        <p className="text-[26px] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</p>
        <p className="mt-2 text-xs text-ink-muted">{change}</p>
      </div>
    </div>
  );
}
