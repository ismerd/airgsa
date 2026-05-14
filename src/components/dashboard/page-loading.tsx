import { Plane } from "lucide-react";

export function PageLoading({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border-ui bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Plane className="h-5 w-5 animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-semibold text-ink">{label}</p>
        <p className="mt-1 text-xs text-ink-muted">Please wait while the latest data is loaded.</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface2">
          <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
        </div>
      </div>
    </main>
  );
}
