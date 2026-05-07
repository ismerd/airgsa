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
    <div className="relative overflow-hidden rounded-2xl border border-border-ui bg-surface p-5 shadow-[0_1px_4px_rgba(11,30,79,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(26,90,255,0.1)]">
      {/* Gradient accent bar */}
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-brand to-cyan-accent" />

      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
        <div className="rounded-lg bg-brand-light p-2 text-brand">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-xs font-semibold text-success">↑ {change}</p>
    </div>
  );
}
