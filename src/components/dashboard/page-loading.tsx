import { Plane } from "lucide-react";

export function PageLoading({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="flex w-full max-w-xs flex-col items-center gap-5 text-center animate-fade-in">
        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light"
          style={{ boxShadow: '0 0 32px rgba(26,90,255,0.25)' }}
        >
          <Plane className="h-6 w-6 text-brand" />
          <span
            className="absolute inset-0 rounded-2xl border-2 border-brand/30 animate-[loading-pulse_1.6s_ease-in-out_infinite]"
            style={{ animationDelay: '0ms' }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-1 text-xs text-ink-muted">Fetching the latest data</p>
        </div>
        <div className="h-[2px] w-48 overflow-hidden rounded-full bg-surface2">
          <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] rounded-full bg-brand opacity-80" />
        </div>
      </div>
    </main>
  );
}
