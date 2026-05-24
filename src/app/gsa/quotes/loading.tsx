import { Inbox, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="space-y-5 p-5">
      <div className="rounded-xl border border-border-ui bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          Loading quote inbox, customer rooms, and bookings...
        </div>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border-ui bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
                <Inbox className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-6 w-14 animate-pulse rounded bg-surface2" />
                <div className="h-3 w-28 animate-pulse rounded bg-surface2" />
              </div>
            </div>
          </div>
        ))}
      </section>
      <div className="rounded-2xl border border-border-ui bg-surface p-4 shadow-sm">
        <div className="h-5 w-52 animate-pulse rounded bg-surface2" />
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-surface2" />
      </div>
      <div className="rounded-2xl border border-border-ui bg-surface p-4 shadow-sm">
        <div className="h-5 w-44 animate-pulse rounded bg-surface2" />
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-surface2" />
      </div>
    </main>
  );
}
