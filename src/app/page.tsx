import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Globe2, Radar, ShieldCheck, TrendingUp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { newsPosts, tenders } from "@/lib/services/platform";

export default function Home() {
  return (
    <main className="min-h-screen bg-page">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          AirGSA
        </Link>
        <div className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
          <Link href="/pricing">Pricing</Link>
          <Link href="/news">Cargo intelligence</Link>
          <Link href="/login">Login</Link>
          <ThemeToggle />
        </div>
        <Link href="/role-selection" className={buttonVariants({ size: "sm" })}>Open prototype</Link>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">Aviation cargo partner network</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-tight text-ink md:text-7xl">
            AirGSA
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-muted">
            Connect airline cargo teams with qualified GSA partners, manage tenders, compare applications, and track commercial performance from one enterprise workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Start tender workflow <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/gsa" className={buttonVariants({ variant: "outline", size: "lg" })}>Browse marketplace</Link>
          </div>
          <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              ["$1.26M", "monthly cargo revenue tracked"],
              ["77%", "average loadfactor"],
              ["12", "active GSA opportunities"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-border-ui bg-surface p-4">
                <p className="text-2xl font-semibold text-ink">{value}</p>
                <p className="mt-1 text-xs text-ink-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border-ui bg-surface2 p-4 shadow-2xl shadow-black/5">
          <div className="rounded-md bg-surface p-4">
            <div className="flex items-center justify-between border-b border-border-ui pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand">Live cargo desk</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Tender control tower</h2>
              </div>
              <Radar className="h-8 w-8 text-brand" />
            </div>
            <div className="mt-4 space-y-3">
              {tenders.slice(0, 2).map((tender) => (
                <Card key={tender.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{tender.title}</p>
                        <p className="mt-1 text-sm text-ink-muted">{tender.lanes}</p>
                      </div>
                      <span className="rounded-full bg-brand-light px-2 py-1 text-xs font-semibold text-brand">{tender.deadline}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {([
                [Globe2, "Coverage", "42 markets"],
                [ShieldCheck, "Compliance", "96 avg score"],
                [TrendingUp, "Signals", `${newsPosts.length} new posts`],
              ] satisfies [LucideIcon, string, string][]).map(([Icon, label, value]) => (
                <div key={label} className="rounded-md border border-border-ui bg-surface2 p-3">
                  <Icon className="h-4 w-4 text-brand" />
                  <p className="mt-2 text-xs text-ink-muted">{label}</p>
                  <p className="text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
