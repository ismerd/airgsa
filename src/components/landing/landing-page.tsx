'use client';

import { useRef } from 'react';
import Link from 'next/link';
import {
  motion,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileText,
  Globe2,
  Plane,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

// ─── Animation ───────────────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
};

// ─── Shared primitives ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
      {children}
    </p>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[clamp(1.75rem,3vw,2.6rem)] font-bold leading-[1.13] tracking-tight text-ink">
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">
      {children}
    </p>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="sticky top-0 z-50 border-b border-border-ui bg-surface/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/"
          className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-brand">
          AirGSA
        </Link>
        <div className="hidden items-center gap-7 text-sm text-ink-muted md:flex">
          {[['#how-it-works', 'How it works'], ['#features', 'Features'],
            ['/pricing', 'Pricing'], ['/news', 'Intelligence']].map(([href, label]) => (
            <Link key={label} href={href}
              className="transition-colors hover:text-ink">{label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login"
            className="text-sm text-ink-muted transition-colors hover:text-ink">
            Log in
          </Link>
          <Link href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_16px_rgba(26,90,255,0.4)] transition-opacity hover:opacity-90">
            Request access
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroFloatingCard({
  className,
  delay,
  children,
}: {
  className: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={`glass-card rounded-xl p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function HeroSection({ reduced }: { reduced: boolean }) {
  return (
    <section className="landing-sky relative overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 pt-16 pb-0
                      lg:flex-row lg:items-center lg:gap-0 lg:pt-20">

        {/* ── Left: headline block ── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="z-10 shrink-0 lg:w-[42%]"
        >
          <motion.span
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20
                       bg-brand/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand"
          >
            <Sparkles className="h-3 w-3" />
            Aviation cargo partner network
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold leading-[1.06] tracking-[-0.03em] text-ink"
          >
            The operating system for{' '}
            <span className="text-brand">airline cargo</span>{' '}
            partnerships
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-lg text-[16px] leading-[1.8] text-ink-muted"
          >
            AirGSA connects airlines, GSAs and cargo markets through digital
            tenders, partner evaluation, route assignment and live market
            intelligence.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5
                         text-sm font-semibold text-white shadow-[0_4px_20px_rgba(26,90,255,0.45)]
                         transition-opacity hover:opacity-90">
              Book a demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-border-ui
                         bg-surface/70 px-6 py-3.5 text-sm font-semibold text-ink backdrop-blur
                         transition-colors hover:border-brand/30">
              Sign in to dashboard
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.p
            variants={fadeUp}
            className="mt-6 text-[11px] uppercase tracking-[0.18em] text-ink-faint"
          >
            IATA-aligned · GDP-ready · SOC 2 in progress
          </motion.p>
        </motion.div>

        {/* ── Right: aircraft + floating cards ── */}
        <div className="grid w-full gap-4 md:grid-cols-2 lg:w-[54%]">
          {/* Aircraft SVG — fills the column */}
          {/* Floating card 1 — Tender published (top left of aircraft) */}
          <HeroFloatingCard
            className="md:col-span-2"
            delay={0.7}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-bg">
                <CheckCircle2 className="h-3 w-3 text-success" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Tender Published
              </span>
            </div>
            <p className="text-[13px] font-semibold text-ink">
              Central Europe GSA Coverage
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              FRA · MUC · VIE → BCN · MXP · MAD
            </p>
            <div className="mt-2.5 flex gap-3">
              <span className="rounded-md bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">
                120t /mo
              </span>
              <span className="rounded-md bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">
                Deadline May 24
              </span>
            </div>
          </HeroFloatingCard>

          {/* Floating card 2 — Applications (bottom center) */}
          <HeroFloatingCard
            className="min-h-[150px]"
            delay={0.9}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Applications
              </span>
              <span className="text-[11px] font-bold text-brand">12 received</span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {[
                { name: 'Kühne+Nagel Air',   score: 87, status: 'Shortlisted' },
                { name: 'Panalpina (Flex)',   score: 81, status: 'In review'  },
              ].map((a) => (
                <div key={a.name} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-ink">{a.name}</p>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-border-ui">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${a.score}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-brand">{a.score}</span>
                </div>
              ))}
            </div>
          </HeroFloatingCard>

          {/* Floating card 3 — Route assigned (top right) */}
          <HeroFloatingCard
            className="min-h-[150px]"
            delay={1.05}
          >
            <div className="flex items-center gap-2">
              <Plane className="h-3.5 w-3.5 text-brand" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Route Assigned
              </span>
            </div>
            <p className="mt-1.5 text-[13px] font-bold text-ink">FRA → BCN</p>
            <p className="text-[11px] text-ink-muted">Partner: K+N Air & Sea</p>
            <p className="mt-2 text-[11px] text-ink-muted">
              Activation <span className="font-semibold text-ink">June 1</span> · 120t /mo
            </p>
          </HeroFloatingCard>
        </div>
      </div>

      {/* Scroll cue */}
      {!reduced && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
          className="flex flex-col items-center gap-2 pb-8 pt-6"
          aria-hidden
        >
          <span className="text-[9px] uppercase tracking-[0.28em] text-ink-faint">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-4 w-4 text-ink-faint" />
          </motion.div>
        </motion.div>
      )}

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16
                      bg-gradient-to-b from-transparent to-[var(--surface2)]" />
    </section>
  );
}

// ─── How it works ────────────────────────────────────────────────────────────

function StepCard({
  num,
  label,
  title,
  body,
  inView,
  i,
  reduced,
}: {
  num: string;
  label: string;
  title: string;
  body: string;
  inView: boolean;
  i: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: reduced ? 0.1 : 0.55, ease: EASE, delay: reduced ? 0 : i * 0.1 }}
      className="rounded-2xl border border-border-ui bg-surface p-6 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                         bg-brand text-[11px] font-extrabold text-white">
          {num}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand">
          {label}
        </span>
      </div>
      <h3 className="mb-2 text-[15px] font-bold text-ink">{title}</h3>
      <p className="text-[13px] leading-relaxed text-ink-muted">{body}</p>
    </motion.div>
  );
}

const STEPS = [
  {
    num: '1', label: 'Publish',
    title: 'Airline publishes a GSA tender',
    body: 'Define lanes, tonnage requirements, product mix, and commercial targets. Structured, not a PDF in an inbox.',
  },
  {
    num: '2', label: 'Apply',
    title: 'Qualified GSAs submit proposals',
    body: 'Network coverage maps, commission structures, and key account pipelines — every proposal scored by AI instantly.',
  },
  {
    num: '3', label: 'Evaluate',
    title: 'Side-by-side comparison & scoring',
    body: 'AI scores across network, financial strength, compliance, and market fit. Shortlist with confidence.',
  },
  {
    num: '4', label: 'Assign',
    title: 'Routes assigned, contracts activated',
    body: 'From shortlist to signed contract without leaving the platform. Monthly KPIs flow into your performance desk.',
  },
  {
    num: '5', label: 'Monitor',
    title: 'Live market and flight intelligence',
    body: 'Real-time freighter positions, yield tracking, capacity alerts, and cargo market signals — all in one workspace.',
  },
  {
    num: '6', label: 'Scale',
    title: 'Expand your GSA network',
    body: 'Add markets, run new tenders, and track commercial performance as your network grows.',
  },
];

function HowItWorksSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section id="how-it-works" ref={ref}
      className="bg-surface2 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={stagger} initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-14 text-center"
        >
          <motion.div variants={fadeUp}><SectionLabel>How it works</SectionLabel></motion.div>
          <motion.div variants={fadeUp}>
            <SectionHead>From tender to take-off in six steps</SectionHead>
          </motion.div>
          <motion.div variants={fadeUp}>
            <SectionSub>
              AirGSA replaces disconnected email threads with a structured digital
              workflow — from first RFP to live monthly performance tracking.
            </SectionSub>
          </motion.div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <StepCard key={step.num} {...step} inView={inView} i={i} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Tender UI mockup section ─────────────────────────────────────────────────

function TenderSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-12%' });

  return (
    <section ref={ref} className="bg-page py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">

        {/* Left: narrative */}
        <motion.div
          variants={stagger} initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <motion.div variants={fadeUp}><SectionLabel>01 — Tender Management</SectionLabel></motion.div>
          <motion.div variants={fadeUp}><SectionHead>Structured RFPs, not PDF attachments</SectionHead></motion.div>
          <motion.div variants={fadeUp}>
            <SectionSub>
              Define lane specifications, tonnage targets, product requirements,
              and compliance criteria. GSAs receive a structured brief, not a vague
              email. Every tender is trackable, scorable, and auditable.
            </SectionSub>
          </motion.div>
          <motion.ul variants={stagger} className="mt-8 space-y-3">
            {[
              'Route lanes with origin/destination pairs',
              'Minimum tonnage and yield targets per lane',
              'Compliance requirements (IATA, GDP, CEIV)',
              'Application deadline and review timeline',
              'Automatic broadcast to qualified GSAs',
            ].map((item) => (
              <motion.li key={item} variants={fadeUp}
                className="flex items-start gap-2.5 text-[13px] text-ink-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Right: product UI card */}
        <motion.div
          initial={{ opacity: 0, x: reduced ? 0 : 32 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: reduced ? 0.1 : 0.7, ease: EASE, delay: 0.2 }}
          className="rounded-2xl border border-border-ui bg-surface p-1 shadow-xl shadow-black/5"
        >
          <div className="rounded-xl bg-surface2 p-5">
            {/* Card header */}
            <div className="mb-4 flex items-center justify-between border-b border-border-ui pb-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-brand">
                  Active Tender · AeroNova Cargo
                </p>
                <h4 className="mt-1 text-[16px] font-bold text-ink">
                  Central Europe GSA Coverage
                </h4>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center
                              rounded-xl border border-border-ui bg-surface">
                <FileText className="h-4 w-4 text-brand" />
              </div>
            </div>

            {/* Lanes */}
            <div className="mb-4 space-y-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                Route Lanes
              </p>
              {[
                { from: 'FRA', to: 'BCN', label: 'Frankfurt → Barcelona' },
                { from: 'MUC', to: 'MXP', label: 'Munich → Milan'       },
                { from: 'VIE', to: 'MAD', label: 'Vienna → Madrid'       },
              ].map((lane) => (
                <div key={lane.from}
                  className="flex items-center gap-3 rounded-lg border border-border-ui
                             bg-surface px-3 py-2.5">
                  <span className="font-mono text-[12px] font-bold text-brand">
                    {lane.from}
                  </span>
                  <div className="flex flex-1 items-center gap-1">
                    <div className="h-px flex-1 bg-gradient-to-r from-brand/30 to-cyan-accent/30" />
                    <Plane className="h-3 w-3 text-cyan-accent" />
                    <div className="h-px flex-1 bg-gradient-to-r from-cyan-accent/30 to-transparent" />
                  </div>
                  <span className="font-mono text-[12px] font-bold text-ink">{lane.to}</span>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Tonnage',  '120t /mo'],
                ['Deadline', 'May 24'],
                ['Applied',  '7 GSAs'],
              ].map(([label, val]) => (
                <div key={label}
                  className="rounded-lg border border-border-ui bg-surface px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-ink">{val}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Applications + scoring ───────────────────────────────────────────────────

const APPS = [
  {
    name: 'Kühne+Nagel Air & Sea',
    code: 'KN',
    markets: 'FRA · MUC · VIE · BCN · MXP · MAD',
    score: 87,
    status: 'Shortlisted',
    statusColor: 'text-success bg-success-bg',
    highlight: true,
  },
  {
    name: 'Panalpina (Flexport)',
    code: 'PA',
    markets: 'FRA · VIE · BCN · MXP',
    score: 81,
    status: 'In review',
    statusColor: 'text-brand bg-brand-light',
    highlight: false,
  },
  {
    name: 'DB Schenker',
    code: 'DS',
    markets: 'FRA · MUC · BCN',
    score: 74,
    status: 'In review',
    statusColor: 'text-brand bg-brand-light',
    highlight: false,
  },
] as const;

function ApplicationsSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} className="bg-surface2 py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">

        {/* Left: product UI */}
        <motion.div
          initial={{ opacity: 0, x: reduced ? 0 : -32 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: reduced ? 0.1 : 0.7, ease: EASE, delay: 0.15 }}
          className="rounded-2xl border border-border-ui bg-surface p-1 shadow-xl shadow-black/5"
        >
          <div className="rounded-xl bg-surface2 p-5">
            <div className="mb-4 flex items-center justify-between border-b border-border-ui pb-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                  Central Europe · Applications
                </p>
                <h4 className="mt-1 text-[15px] font-bold text-ink">
                  12 received · 3 shortlisted
                </h4>
              </div>
              <span className="rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-semibold text-brand">
                AI scoring active
              </span>
            </div>

            <div className="space-y-3">
              {APPS.map((app, i) => (
                <motion.div
                  key={app.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: reduced ? 0 : 0.3 + i * 0.12, duration: 0.45, ease: EASE }}
                  className={`rounded-xl border p-3.5 ${
                    app.highlight
                      ? 'border-brand/25 bg-surface ring-1 ring-brand/10'
                      : 'border-border-ui bg-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center
                                      rounded-lg border border-border-ui bg-surface2 text-[10px]
                                      font-extrabold text-brand">
                        {app.code}
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-ink">{app.name}</p>
                        <p className="text-[10px] text-ink-muted">{app.markets}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${app.statusColor}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                      AI Score
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-border-ui" style={{ height: 5 }}>
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${app.score}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-brand">{app.score}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right: narrative */}
        <motion.div
          variants={stagger} initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <motion.div variants={fadeUp}><SectionLabel>02 — GSA Applications</SectionLabel></motion.div>
          <motion.div variants={fadeUp}><SectionHead>AI-scored proposals. No spreadsheets.</SectionHead></motion.div>
          <motion.div variants={fadeUp}>
            <SectionSub>
              Every GSA application is automatically scored across network coverage,
              financial strength, compliance credentials, and key account pipeline.
              Compare candidates side by side — in minutes, not weeks.
            </SectionSub>
          </motion.div>
          <motion.ul variants={stagger} className="mt-8 space-y-3">
            {[
              'Network coverage scored against your lane requirements',
              'Proposed commission structure and yield commitments',
              'Compliance certificates auto-verified (IATA, GDP, CEIV)',
              'Key account pipeline attached per application',
              'Shortlist, request clarification, negotiate — in one place',
            ].map((item) => (
              <motion.li key={item} variants={fadeUp}
                className="flex items-start gap-2.5 text-[13px] text-ink-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Features grid ────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Radar,       title: 'Live flight tracking',    body: 'Real-time freighter positions and route context. Monitor your network as it moves.' },
  { icon: Sparkles,    title: 'AI-assisted scoring',     body: 'Applications scored across coverage, financials, and compliance — instantly.' },
  { icon: BarChart3,   title: 'Commercial analytics',    body: 'Revenue, yield, and load factor per GSA, route, and market — every period.' },
  { icon: FileText,    title: 'Contract workflow',       body: 'From shortlist to signed contract without leaving the platform. Full audit trail.' },
  { icon: Globe2,      title: 'Market intelligence',     body: 'Cargo signals from airline and GSA activity, curated and confidence-scored.' },
  { icon: Building2,   title: 'GSA marketplace',         body: 'A qualified directory of 40+ GSA partners rated on network, compliance, and win rate.' },
  { icon: Zap,         title: 'Capacity alerts',         body: 'Broadcast urgent capacity positions to GSA partners in seconds.' },
  { icon: ShieldCheck, title: 'Compliance tracking',     body: 'GDP, IATA, CEIV certifications tracked per partner. Know who qualifies before you shortlist.' },
  { icon: TrendingUp,  title: 'Performance monitoring',  body: 'Set KPI targets per GSA and route. Track monthly performance automatically.' },
] as const;

function FeaturesSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section id="features" ref={ref} className="bg-page py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={stagger} initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-14 text-center"
        >
          <motion.div variants={fadeUp}><SectionLabel>Platform capabilities</SectionLabel></motion.div>
          <motion.div variants={fadeUp}><SectionHead>Every tool the journey needs</SectionHead></motion.div>
          <motion.p variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            From the first tender to monthly GSA performance reviews —
            AirGSA handles the full lifecycle of airline cargo partnerships.
          </motion.p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: reduced ? 0 : 22 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: reduced ? 0.1 : 0.55, ease: EASE, delay: reduced ? 0 : i * 0.06 }}
              className="group rounded-2xl border border-border-ui bg-surface p-6
                         transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl
                              border border-border-ui bg-brand-light
                              group-hover:border-brand/25 group-hover:bg-brand-light transition-colors">
                <Icon className="h-4.5 w-4.5 text-brand" style={{ width: 18, height: 18 }} />
              </div>
              <h4 className="mb-2 text-[14px] font-bold text-ink">{title}</h4>
              <p className="text-[13px] leading-relaxed text-ink-muted">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Performance dashboard section ───────────────────────────────────────────

function PerformanceSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  const KPIS = [
    { label: 'Monthly Revenue',  value: '$1.26M', delta: '+12% MoM', positive: true,  icon: TrendingUp },
    { label: 'Load Factor',      value: '77%',    delta: '↑ 3.2 pp',  positive: true,  icon: BarChart3 },
    { label: 'Avg Yield',        value: '$2.31/kg', delta: 'Above target', positive: true, icon: Sparkles },
    { label: 'Active GSAs',      value: '8',      delta: '3 markets',  positive: null,  icon: Globe2 },
  ] as const;

  return (
    <section ref={ref} className="bg-surface2 py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">

        {/* Left: narrative */}
        <motion.div
          variants={stagger} initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <motion.div variants={fadeUp}><SectionLabel>03 — Live Operation</SectionLabel></motion.div>
          <motion.div variants={fadeUp}>
            <SectionHead>Commercial performance, tracked every month</SectionHead>
          </motion.div>
          <motion.div variants={fadeUp}>
            <SectionSub>
              Once a GSA is activated, their monthly KPIs flow directly into your
              performance dashboard. Yield, load factor, and revenue — tracked
              against targets, no manual reporting required.
            </SectionSub>
          </motion.div>
          <motion.ul variants={stagger} className="mt-8 space-y-3">
            {[
              'Revenue and yield per GSA and per route',
              'Load factor vs. target with trend lines',
              'Automatic monthly performance review triggers',
              'Capacity alert broadcast to all GSA partners',
              'Contract renewal tracking and timeline',
            ].map((item) => (
              <motion.li key={item} variants={fadeUp}
                className="flex items-start gap-2.5 text-[13px] text-ink-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Right: KPI dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, x: reduced ? 0 : 32 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: reduced ? 0.1 : 0.7, ease: EASE, delay: 0.2 }}
          className="rounded-2xl border border-border-ui bg-surface p-1 shadow-xl shadow-black/5"
        >
          <div className="rounded-xl bg-surface2 p-5">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-border-ui pb-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                  AeroNova Cargo — Performance desk
                </p>
                <h4 className="mt-1 text-[15px] font-bold text-ink">
                  GSA Network · April 2026
                </h4>
              </div>
              <Radar className="h-5 w-5 text-brand" />
            </div>

            {/* KPI grid */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              {KPIS.map(({ label, value, delta, positive, icon: Icon }) => (
                <div key={label}
                  className="rounded-xl border border-border-ui bg-surface px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                      {label}
                    </p>
                    <Icon className="h-3.5 w-3.5 text-ink-faint" />
                  </div>
                  <p className="mt-2 text-[22px] font-bold tracking-tight text-ink">{value}</p>
                  <p className={`mt-1 text-[10px] font-semibold ${
                    positive === true ? 'text-success' :
                    positive === false ? 'text-danger' : 'text-ink-muted'
                  }`}>
                    {delta}
                  </p>
                </div>
              ))}
            </div>

            {/* Mini bar chart placeholder */}
            <div className="rounded-xl border border-border-ui bg-surface p-3">
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                Monthly yield ($/kg) — last 6 months
              </p>
              <div className="flex items-end gap-1.5" style={{ height: 52 }}>
                {[1.95, 2.08, 1.98, 2.15, 2.24, 2.31].map((val, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t bg-brand opacity-80"
                    style={{ height: `${((val - 1.8) / 0.65) * 100}%`, transformOrigin: 'bottom' }}
                    initial={{ scaleY: 0 }}
                    animate={inView ? { scaleY: 1 } : {}}
                    transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.5 + i * 0.06, ease: EASE }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between">
                {['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'].map((m) => (
                  <span key={m} className="text-[8px] text-ink-faint">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Takeoff / CTA ───────────────────────────────────────────────────────────

function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });

  return (
    <section ref={ref} className="bg-page py-28 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--brand) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
        aria-hidden
      />

      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(26,90,255,0.05) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <motion.div
        variants={stagger} initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <motion.div variants={fadeUp}><SectionLabel>Take-off</SectionLabel></motion.div>

        <motion.h2
          variants={fadeUp}
          className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold leading-[1.06]
                     tracking-[-0.03em] text-ink"
        >
          Launch your{' '}
          <span className="text-brand">GSA network</span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.8] text-ink-muted"
        >
          AirGSA is invite-only during the current rollout. Request access and
          our team will review your application within 48 hours.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-4
                       text-sm font-semibold text-white shadow-[0_4px_24px_rgba(26,90,255,0.5)]
                       transition-opacity hover:opacity-90">
            Book a demo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/signup"
            className="inline-flex items-center gap-2 rounded-xl border border-border-ui
                       bg-surface px-8 py-4 text-sm font-semibold text-ink
                       transition-colors hover:border-brand/30">
            Create account
          </Link>
          <Link href="/login"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-4
                       text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
            Log in
          </Link>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-10 text-[10px] uppercase tracking-[0.16em] text-ink-faint"
        >
          IATA-Aligned · GDP-Ready · CEIV-Compatible · SOC 2 In Progress
        </motion.p>
      </motion.div>
    </section>
  );
}

// ─── For airlines + For GSAs ──────────────────────────────────────────────────

function AudienceSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} className="border-y border-border-ui bg-surface2 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={stagger} initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-14 text-center"
        >
          <motion.div variants={fadeUp}><SectionLabel>Who it&apos;s for</SectionLabel></motion.div>
          <motion.div variants={fadeUp}><SectionHead>Built for both sides of the partnership</SectionHead></motion.div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Airlines */}
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduced ? 0.1 : 0.6, ease: EASE }}
            className="rounded-2xl border border-border-ui bg-surface p-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20
                             bg-brand-light px-3 py-1 text-[11px] font-semibold text-brand">
              <Plane className="h-3.5 w-3.5" /> For Airlines
            </span>
            <h3 className="mt-5 text-[18px] font-bold text-ink">
              Systematic GSA procurement
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              Replace ad-hoc GSA selection with a structured tender process. Define lanes,
              requirements, and timelines — then let qualified partners compete on merit.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                'Publish structured RFPs with lane, tonnage & product specs',
                'AI-assisted GSA scoring across network, financial & compliance dimensions',
                'Side-by-side application comparison with commission breakdown',
                'Real-time performance tracking per GSA and per route',
                'Capacity alert broadcast to GSA partners with one click',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-ink-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* GSAs */}
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduced ? 0.1 : 0.6, ease: EASE, delay: 0.12 }}
            className="rounded-2xl border border-border-ui bg-surface p-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20
                             bg-violet-400/10 px-3 py-1 text-[11px] font-semibold text-violet-400">
              <Building2 className="h-3.5 w-3.5" /> For GSAs
            </span>
            <h3 className="mt-5 text-[18px] font-bold text-ink">
              Discover & win airline mandates
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              Stop chasing opportunity by email. Access a curated marketplace of open airline
              tenders, build a credible profile, and submit structured proposals that win.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                'Browse open airline tenders in your covered markets',
                'Build a scored GSA profile visible to airline procurement teams',
                'Submit structured proposals with network and commercial plans',
                'Track active contract KPIs and benchmark against targets',
                'Receive capacity hunt alerts from connected airlines',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-ink-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border-ui bg-surface py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between
                      gap-4 px-6 text-[11px] text-ink-muted sm:flex-row">
        <span className="font-extrabold uppercase tracking-[0.26em] text-brand">AirGSA</span>
        <span>© 2026 AirGSA. Aviation cargo partnership infrastructure.</span>
        <div className="flex gap-5">
          {[['Pricing', '/pricing'], ['Intelligence', '/news'], ['Login', '/login']].map(
            ([label, href]) => (
              <Link key={label} href={href}
                className="transition-colors hover:text-ink">{label}</Link>
            ),
          )}
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="min-h-screen">
      <Nav />
      <HeroSection       reduced={reduced} />
      <HowItWorksSection reduced={reduced} />
      <TenderSection     reduced={reduced} />
      <ApplicationsSection reduced={reduced} />
      <FeaturesSection   reduced={reduced} />
      <PerformanceSection reduced={reduced} />
      <AudienceSection   reduced={reduced} />
      <CTASection />
      <Footer />
    </div>
  );
}
