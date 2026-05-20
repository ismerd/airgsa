import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  Handshake,
  Plane,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Home() {
  return (
    <main className="min-h-screen bg-page">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-30 border-b border-border-ui bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-sm font-bold uppercase tracking-[0.28em] text-brand">
            AirGSA
          </Link>
          <div className="hidden items-center gap-7 text-sm text-ink-muted md:flex">
            <Link href="#features" className="hover:text-ink transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-ink transition-colors">How it works</Link>
            <Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
            <Link href="/news" className="hover:text-ink transition-colors">Cargo intelligence</Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Request access
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            Aviation cargo partner network
          </span>
          <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.08] tracking-tight text-ink md:text-6xl">
            The operating system for airline cargo partnerships
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink-muted">
            AirGSA connects airline cargo teams with qualified General Sales Agents. Run structured tenders, compare applications with AI-assisted scoring, and track commercial performance — all in one workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Request access <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Sign in to dashboard
            </Link>
          </div>

          {/* Social proof stats */}
          <div className="mt-12 flex flex-wrap gap-6">
            {[
              ["$1.26M+", "Monthly cargo revenue tracked"],
              ["77%", "Average network load factor"],
              ["3", "Open GSA tenders"],
              ["12", "Qualified GSA partners"],
            ].map(([value, label]) => (
              <div key={label} className="min-w-[120px]">
                <p className="text-2xl font-bold text-ink">{value}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="rounded-2xl border border-border-ui bg-surface p-1 shadow-2xl shadow-black/10">
          <div className="rounded-xl bg-surface2 p-5">
            <div className="flex items-center justify-between border-b border-border-ui pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">AeroNova Cargo - Live desk</p>
                <h2 className="mt-0.5 text-lg font-bold text-ink">Tender control tower</h2>
              </div>
              <Radar className="h-7 w-7 text-brand" />
            </div>
            <div className="mt-4 space-y-2.5">
              {PREVIEW_TENDERS.map((t) => (
                <div key={t.title} className="flex items-center justify-between gap-4 rounded-xl border border-border-ui bg-surface px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{t.lanes}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">{t.deadline}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {([
                [Globe2, "Coverage", "42 markets"],
                [ShieldCheck, "Compliance", "96 avg score"],
                [TrendingUp, "AI signals", "4 new"],
              ] as [LucideIcon, string, string][]).map(([Icon, label, value]) => (
                <div key={label} className="rounded-lg border border-border-ui bg-surface px-3 py-3">
                  <Icon className="h-4 w-4 text-brand" />
                  <p className="mt-2 text-[11px] text-ink-muted">{label}</p>
                  <p className="text-sm font-bold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── For Airlines + For GSAs ── */}
      <section id="features" className="border-y border-border-ui bg-surface2 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Platform features</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">Built for airline and GSA teams</h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-muted">
              AirGSA gives airline cargo teams and General Sales Agents the tools to run tenders, applications, contracts, and performance in one workspace.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {/* Airlines */}
            <div className="rounded-2xl border border-border-ui bg-surface p-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                <Plane className="h-3.5 w-3.5" /> For Airlines
              </span>
              <h3 className="mt-5 text-xl font-semibold text-ink">Structured GSA procurement</h3>
              <p className="mt-2 text-sm leading-7 text-ink-muted">
                Replace ad-hoc GSA selection with a systematic tender process. Define lanes, requirements, and timelines — then let qualified partners compete for your business.
              </p>
              <ul className="mt-6 space-y-3">
                {AIRLINE_FEATURES.map((f) => <FeatureItem key={f} text={f} />)}
              </ul>
            </div>

            {/* GSAs */}
            <div className="rounded-2xl border border-border-ui bg-surface p-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-400">
                <Building2 className="h-3.5 w-3.5" /> For GSAs
              </span>
              <h3 className="mt-5 text-xl font-semibold text-ink">Discover & win airline mandates</h3>
              <p className="mt-2 text-sm leading-7 text-ink-muted">
                Stop chasing opportunity by email. Access a curated marketplace of open airline tenders, build a credible profile, and submit structured proposals that win.
              </p>
              <ul className="mt-6 space-y-3">
                {GSA_FEATURES.map((f) => <FeatureItem key={f} text={f} />)}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── Key capabilities ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border-ui bg-surface p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <h4 className="mt-4 text-base font-semibold text-ink">{title}</h4>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-y border-border-ui bg-surface2 py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Process</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">From tender to contract in four steps</h2>
          </div>
          <div className="relative mt-14">
            {/* Connector line */}
            <div className="absolute left-8 top-0 hidden h-full w-px bg-border-ui lg:block" />
            <div className="space-y-10">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.title} className="flex gap-6">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border-ui bg-surface text-xl font-bold text-brand">
                    {i + 1}
                  </div>
                  <div className="pt-3">
                    <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-7 text-ink-muted">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl font-semibold text-ink md:text-4xl">
            Ready to modernize your cargo partnerships?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-muted">
            AirGSA is invite-only during the current rollout. Request access and our team will review your application within 48 hours.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Request access <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Already have access? Sign in
            </Link>
          </div>
          <p className="mt-6 text-xs text-ink-muted">
            IATA-aligned · GDP-ready · CEIV-compatible · SOC 2 in progress
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border-ui bg-surface2 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-xs text-ink-muted sm:flex-row">
          <span className="font-semibold uppercase tracking-[0.24em] text-brand">AirGSA</span>
          <span>© 2026 AirGSA. Aviation cargo partnership infrastructure.</span>
          <div className="flex gap-5">
            <Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
            <Link href="/news" className="hover:text-ink transition-colors">Intelligence</Link>
            <Link href="/login" className="hover:text-ink transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-ink-muted">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      {text}
    </li>
  );
}

const PREVIEW_TENDERS = [
  { title: "Central Europe GSA representation", lanes: "FRA, MUC, VIE -> BCN, MXP", deadline: "May 24" },
  { title: "Nordics belly capacity growth", lanes: "CPH, ARN, OSL -> FRA, AMS", deadline: "Jun 3" },
];

const AIRLINE_FEATURES = [
  "Publish structured RFPs with lane, tonnage & product specs",
  "AI-assisted GSA scoring across network, financial & compliance dimensions",
  "Side-by-side application comparison with proposed commission breakdown",
  "Real-time performance tracking per GSA and per route",
  "Capacity alert broadcast to GSA partners with one click",
];

const GSA_FEATURES = [
  "Browse open airline tenders in your covered markets",
  "Build a scored GSA profile visible to airline procurement teams",
  "Submit structured proposals with network and commercial plans",
  "Track active contract KPIs and benchmark against targets",
  "Receive capacity hunt alerts from connected airlines",
];

const CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Radar,
    title: "Live flight tracking",
    body: "Real-time freighter positions and route context. Monitor your network as it moves.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted scoring",
    body: "Applications are scored across network coverage, financial strength, and compliance — instantly.",
  },
  {
    icon: BarChart3,
    title: "Commercial analytics",
    body: "Revenue, yield, and load factor data per GSA, route, and market — updated every period.",
  },
  {
    icon: FileText,
    title: "Contract workflow",
    body: "From shortlist to signed contract without leaving the platform. Audit trails included.",
  },
  {
    icon: Globe2,
    title: "Market intelligence",
    body: "Cargo signals from airline and GSA LinkedIn activity, curated and confidence-scored.",
  },
  {
    icon: Handshake,
    title: "GSA marketplace",
    body: "A qualified directory of 40+ GSA partners rated on network, compliance, and win rate.",
  },
  {
    icon: Zap,
    title: "Capacity alerts",
    body: "Broadcast urgent capacity positions to GSA partners in seconds — with urgency levels.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance tracking",
    body: "GDP, IATA, CEIV certifications tracked per partner. Know who's qualified before you shortlist.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "Publish your RFP",
    body: "Define the lanes, tonnage, product mix, and GSA requirements for the market you want to cover. AirGSA structures it into a formal tender visible to qualified partners.",
  },
  {
    title: "GSAs apply with structured proposals",
    body: "Interested GSAs submit applications with network plans, proposed commission structures, and key account pipelines. Every submission is scored automatically.",
  },
  {
    title: "Review, shortlist, and negotiate",
    body: "Compare applications side by side, move candidates through shortlist and negotiation stages, and request clarifications — all tracked in one place.",
  },
  {
    title: "Activate and track performance",
    body: "Once a contract is signed, the GSA's monthly KPIs flow into your performance dashboard. Set targets, monitor yield and load factor, and manage renewals proactively.",
  },
];
