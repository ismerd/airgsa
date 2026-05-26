'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from 'framer-motion';

// ─── Design tokens (concept-1: white, premium, Apple/Linear/Stripe) ──────────
const C = {
  bg:         '#FFFFFF',
  bg2:        '#F9FAFB',
  bg3:        '#F3F4F6',
  surface:    '#FFFFFF',
  border:     '#E5E7EB',
  brand:      '#1A5AFF',
  brandLight: '#EBF1FF',
  ink:        '#0A0A0A',
  inkMuted:   '#6B7280',
  inkFaint:   '#9CA3AF',
  success:    '#059669',
  successBg:  '#ECFDF5',
};

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, { duration: 1.6, ease: 'easeOut' });
    return controls.stop;
  }, [inView, to, count]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      style={{ background: 'rgba(255,255,255,0.85)', borderBottom: `1px solid ${C.border}` }}
      className="sticky top-0 z-50 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span
          className="text-[11px] font-extrabold uppercase tracking-[0.32em]"
          style={{ color: C.brand }}
        >
          AirGSA
        </span>
        <div className="hidden gap-8 text-[13px] md:flex" style={{ color: C.inkMuted }}>
          {['Platform', 'For Airlines', 'For GSAs', 'Pricing'].map((l) => (
            <span key={l} className="cursor-pointer hover:text-[#0A0A0A] transition-colors">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" style={{ color: C.inkMuted }} className="text-[13px] hover:text-[#0A0A0A] transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: C.brand, boxShadow: '0 2px 14px rgba(26,90,255,0.38)' }}
          >
            Book a demo
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ reduced }: { reduced: boolean }) {
  const words = ['The', 'operating', 'system', 'for', 'airline', 'cargo', 'partnerships.'];

  return (
    <section
      style={{ background: C.bg }}
      className="overflow-hidden"
    >
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 lg:pt-28 lg:pb-16">
        <div className="flex flex-col gap-14 lg:flex-row lg:items-center">

          {/* LEFT: headline */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="lg:w-[46%] shrink-0"
          >
            {/* Badge */}
            <motion.div variants={fadeUp}>
              <span
                className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1
                           text-[10px] font-semibold uppercase tracking-widest"
                style={{ borderColor: C.border, color: C.brand, background: C.brandLight }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: C.brand }}
                />
                Early access · 12 airlines
              </span>
            </motion.div>

            {/* Headline: word-by-word reveal */}
            <h1
              className="text-[clamp(2.6rem,5vw,4.2rem)] font-bold leading-[1.05] tracking-[-0.03em]"
              style={{ color: C.ink }}
              aria-label="The operating system for airline cargo partnerships."
            >
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  style={{ marginRight: word === 'partnerships.' ? 0 : '0.28em' }}
                  initial={{ opacity: 0, y: reduced ? 0 : 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: reduced ? 0.1 : 0.6,
                    ease: EASE,
                    delay: reduced ? 0 : 0.05 + i * 0.08,
                  }}
                >
                  {word === 'cargo' ? (
                    <span style={{ color: C.brand }}>{word}</span>
                  ) : (
                    word
                  )}
                </motion.span>
              ))}
            </h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-md text-[16px] leading-[1.75]"
              style={{ color: C.inkMuted }}
            >
              AirGSA replaces ad-hoc GSA selection with structured digital tenders,
              AI-powered scoring, and live commercial tracking — from first RFP to
              monthly performance review.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5
                           text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: C.brand, boxShadow: '0 4px 24px rgba(26,90,255,0.42)' }}
              >
                Book a demo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border px-6 py-3.5
                           text-[13px] font-semibold transition-colors hover:border-[#1A5AFF33]"
                style={{ borderColor: C.border, color: C.ink }}
              >
                See how it works
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap gap-4 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: C.inkFaint }}
            >
              {['IATA-aligned', 'GDP-ready', 'SOC 2 in progress'].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT: overlapping product cards */}
          <div className="relative lg:w-[54%] min-h-[420px]">
            {/* Card 1 — back (tender board) */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: reduced ? 0 : -2.5 }}
              transition={{ duration: 0.75, ease: EASE, delay: 0.55 }}
              className="absolute inset-x-0 top-0 rounded-2xl border overflow-hidden shadow-lg"
              style={{ borderColor: C.border, background: C.bg2, transformOrigin: 'center top' }}
            >
              <div className="px-5 py-3.5 border-b text-[9px] font-semibold uppercase tracking-wider flex items-center justify-between"
                style={{ borderColor: C.border, color: C.inkFaint, background: C.bg3 }}>
                <span>Active Tenders · Saudia Cargo</span>
                <span style={{ color: C.brand }}>3 open</span>
              </div>
              <div className="divide-y" style={{ borderColor: C.border }}>
                {[
                  { route: 'FRA → JED', tonnage: '180t/mo', apps: 6, status: 'Open', deadline: 'Jun 5' },
                  { route: 'JED → LHR', tonnage: '120t/mo', apps: 9, status: 'In Review', deadline: 'May 28' },
                  { route: 'RUH → FRA', tonnage: '90t/mo',  apps: 4, status: 'Open', deadline: 'Jun 12' },
                ].map((row) => (
                  <div key={row.route} className="flex items-center gap-4 px-5 py-3">
                    <span className="font-mono text-[11px] font-bold min-w-[90px]" style={{ color: C.ink }}>{row.route}</span>
                    <span className="flex-1 text-[11px]" style={{ color: C.inkMuted }}>{row.tonnage}</span>
                    <span className="text-[10px]" style={{ color: C.inkMuted }}>{row.apps} apps</span>
                    <span className="text-[9px]" style={{ color: C.inkFaint }}>↑ {row.deadline}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                      style={{
                        background: row.status === 'Open' ? C.brandLight : '#FEF3C7',
                        color: row.status === 'Open' ? C.brand : '#B45309',
                      }}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Card 2 — front (application scoring) */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: reduced ? 80 : 100 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
              className="absolute left-[8%] right-0 rounded-2xl border shadow-2xl overflow-hidden"
              style={{
                borderColor: C.border,
                background: C.surface,
                boxShadow: '0 24px 60px rgba(10,10,10,0.12)',
              }}
            >
              <div className="px-5 py-3.5 border-b flex items-center justify-between"
                style={{ borderColor: C.border, background: C.bg2 }}>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: C.brand }}>
                    FRA → JED · AI Scoring
                  </p>
                  <p className="text-[13px] font-bold mt-0.5" style={{ color: C.ink }}>
                    6 Applications received
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{ background: C.brandLight, color: C.brand }}
                >
                  AI active
                </span>
              </div>
              <div className="p-4 space-y-2.5">
                {[
                  { name: 'AeroLink GSA', markets: 'DE · SA · GB', score: 91, tag: 'Shortlisted', tagColor: C.success, tagBg: C.successBg },
                  { name: 'CargoBridge Partners', markets: 'DE · SA · AE', score: 83, tag: 'In Review', tagColor: C.brand, tagBg: C.brandLight },
                  { name: 'SkyTrade Cargo', markets: 'SA · AE', score: 71, tag: 'In Review', tagColor: C.brand, tagBg: C.brandLight },
                ].map((app, i) => (
                  <motion.div
                    key={app.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduced ? 0 : 0.9 + i * 0.12, duration: 0.45, ease: EASE }}
                    className="flex items-center gap-3 rounded-xl border p-3"
                    style={{ borderColor: C.border }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                                 text-[10px] font-extrabold"
                      style={{ background: C.brandLight, color: C.brand }}
                    >
                      {app.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate" style={{ color: C.ink }}>{app.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: C.border }}>
                          <div className="h-full rounded-full" style={{ width: `${app.score}%`, background: C.brand }} />
                        </div>
                        <span className="text-[10px] font-bold tabular-nums" style={{ color: C.brand }}>{app.score}</span>
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                      style={{ background: app.tagBg, color: app.tagColor }}
                    >
                      {app.tag}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Metrics strip */}
      <div
        className="border-t border-b"
        style={{ borderColor: C.border, background: C.bg2 }}
      >
        <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { label: 'Airlines in network', value: 12, suffix: '' },
            { label: 'Qualified GSA partners', value: 40, suffix: '+' },
            { label: 'Active routes managed', value: 180, suffix: '+' },
            { label: 'Avg. response time', value: 48, suffix: 'h' },
          ].map(({ label, value, suffix }) => (
            <div key={label} className="text-center">
              <p
                className="text-[2rem] font-bold tracking-tight"
                style={{ color: C.ink }}
              >
                <Counter to={value} suffix={suffix} />
              </p>
              <p className="mt-1 text-[11px]" style={{ color: C.inkMuted }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Feature sections (alternating) ──────────────────────────────────────────
function FeatureRow({
  label,
  title,
  body,
  bullets,
  mockup,
  flip,
  reduced,
}: {
  label: string;
  title: string;
  body: string;
  bullets: string[];
  mockup: React.ReactNode;
  flip?: boolean;
  reduced: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} style={{ background: flip ? C.bg2 : C.bg }} className="py-24">
      <div
        className={`mx-auto max-w-6xl px-6 grid gap-16 items-center lg:grid-cols-2 ${
          flip ? 'lg:direction-rtl' : ''
        }`}
      >
        <motion.div
          className={flip ? 'lg:order-2' : ''}
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: C.brand }}
          >
            {label}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.12] tracking-tight"
            style={{ color: C.ink }}
          >
            {title}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-[15px] leading-relaxed"
            style={{ color: C.inkMuted }}
          >
            {body}
          </motion.p>
          <motion.ul variants={stagger} className="mt-8 space-y-3">
            {bullets.map((b) => (
              <motion.li
                key={b}
                variants={fadeUp}
                className="flex items-start gap-3 text-[13px]"
                style={{ color: C.inkMuted }}
              >
                <svg
                  className="mt-0.5 shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.brand}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {b}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          className={flip ? 'lg:order-1' : ''}
          initial={{ opacity: 0, x: reduced ? 0 : (flip ? -28 : 28) }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.75, ease: EASE, delay: 0.2 }}
          style={{
            borderRadius: 20,
            border: `1px solid ${C.border}`,
            background: C.bg2,
            boxShadow: '0 20px 60px rgba(10,10,10,0.07)',
            overflow: 'hidden',
          }}
        >
          {mockup}
        </motion.div>
      </div>
    </section>
  );
}

function TenderMockup() {
  return (
    <div className="p-5">
      <div className="mb-3 flex items-center justify-between border-b pb-3" style={{ borderColor: C.border }}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: C.brand }}>
            Saudia Cargo · Active Tender
          </p>
          <p className="text-[14px] font-bold mt-0.5" style={{ color: C.ink }}>Middle East GSA Coverage</p>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: C.brandLight, color: C.brand }}>
          Open
        </span>
      </div>
      <div className="space-y-2 mb-3">
        <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: C.inkFaint }}>Route Lanes</p>
        {[['FRA', 'JED'], ['IST', 'DXB'], ['JED', 'LHR']].map(([a, b]) => (
          <div key={a+b} className="flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: C.border }}>
            <span className="font-mono text-[11px] font-bold" style={{ color: C.brand }}>{a}</span>
            <div className="flex flex-1 items-center gap-1">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${C.brand}44, #00AADD44)` }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.brand }} />
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, #00AADD44, transparent)` }} />
            </div>
            <span className="font-mono text-[11px] font-bold" style={{ color: C.ink }}>{b}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['Tonnage', '420t/mo'], ['Deadline', 'Jun 5'], ['Applied', '6 GSAs']].map(([k, v]) => (
          <div key={k} className="rounded-lg border px-3 py-2.5" style={{ borderColor: C.border }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: C.inkFaint }}>{k}</p>
            <p className="text-[13px] font-bold mt-1" style={{ color: C.ink }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceMockup() {
  return (
    <div className="p-5">
      <div className="mb-4 border-b pb-4 flex items-center justify-between" style={{ borderColor: C.border }}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: C.inkFaint }}>Saudia Cargo — Performance</p>
          <p className="text-[14px] font-bold mt-0.5" style={{ color: C.ink }}>GSA Network · May 2026</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Monthly Revenue', value: '$2.1M', delta: '+14%', pos: true },
          { label: 'Load Factor', value: '81%', delta: '↑ 4.1pp', pos: true },
          { label: 'Avg Yield', value: '$2.44/kg', delta: 'On target', pos: null },
          { label: 'Active GSAs', value: '4', delta: '3 markets', pos: null },
        ].map(({ label, value, delta, pos }) => (
          <div key={label} className="rounded-xl border px-4 py-3" style={{ borderColor: C.border }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: C.inkFaint }}>{label}</p>
            <p className="text-[20px] font-bold mt-2 tracking-tight" style={{ color: C.ink }}>{value}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: pos === true ? C.success : pos === false ? '#DC2626' : C.inkFaint }}>{delta}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-3" style={{ borderColor: C.border }}>
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest" style={{ color: C.inkFaint }}>Yield $/kg — last 6 months</p>
        <div className="flex items-end gap-1.5" style={{ height: 44 }}>
          {[1.98, 2.12, 2.05, 2.22, 2.35, 2.44].map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${((v - 1.85) / 0.75) * 100}%`, background: C.brand, opacity: 0.7 + i * 0.05 }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between">
          {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((m) => (
            <span key={m} className="text-[8px]" style={{ color: C.inkFaint }}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Features grid ────────────────────────────────────────────────────────────
const FEATURES = [
  { title: 'Structured RFPs', body: 'Lane specs, tonnage targets, and compliance criteria — not a PDF in an inbox.' },
  { title: 'AI Scoring', body: 'Applications scored across network, financial strength, and compliance — instantly.' },
  { title: 'Side-by-side comparison', body: 'Compare any two GSA candidates across all dimensions simultaneously.' },
  { title: 'Contract workflow', body: 'From shortlist to signed contract without leaving the platform.' },
  { title: 'Live flight tracking', body: 'Real-time freighter positions and capacity signals across your network.' },
  { title: 'Capacity alerts', body: 'Broadcast urgent capacity positions to all GSA partners in seconds.' },
  { title: 'Market intelligence', body: 'Curated cargo market signals, confidence-scored and source-attributed.' },
  { title: 'Performance monitoring', body: 'Monthly KPIs per GSA and route. Set targets, track actuals automatically.' },
  { title: 'Compliance tracking', body: 'GDP, IATA, CEIV certificates tracked per partner. Know who qualifies.' },
];

function FeaturesGrid({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} style={{ background: C.bg }} className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-14 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: C.brand }}
          >
            Platform capabilities
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(1.8rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-tight"
            style={{ color: C.ink }}
          >
            Every tool the journey needs
          </motion.h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-l border-t" style={{ borderColor: C.border }}>
          {FEATURES.map(({ title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: reduced ? 0.1 : 0.5, delay: reduced ? 0 : i * 0.05 }}
              className="border-r border-b p-6 transition-colors hover:bg-[#F9FAFB]"
              style={{ borderColor: C.border }}
            >
              <div
                className="mb-4 h-1.5 w-6 rounded-full"
                style={{ background: C.brand }}
              />
              <h3 className="text-[14px] font-bold mb-2" style={{ color: C.ink }}>{title}</h3>
              <p className="text-[12px] leading-relaxed" style={{ color: C.inkMuted }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });

  return (
    <section ref={ref} style={{ background: '#0B1E4F' }} className="py-28 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(26,90,255,0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(26,90,255,0.12) 0%, transparent 70%)',
        }}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <motion.p
          variants={fadeUp}
          className="mb-5 text-[10px] font-semibold uppercase tracking-[0.26em]"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Ready to launch
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="text-[clamp(2.2rem,4.5vw,3.6rem)] font-bold leading-[1.05] tracking-tight text-white"
        >
          Launch your GSA network
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-5 text-[16px] leading-relaxed mx-auto max-w-lg"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          AirGSA is invite-only during the current rollout. Request access and
          our team will review within 48 hours.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-[14px]
                       font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: C.brand, boxShadow: '0 4px 28px rgba(26,90,255,0.55)' }}
          >
            Book a demo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl border px-8 py-4 text-[14px]
                       font-semibold transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)' }}
          >
            Create account
          </Link>
        </motion.div>
        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-wrap justify-center gap-6 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          {['IATA-Aligned', 'GDP-Ready', 'CEIV-Compatible', 'SOC 2 In Progress'].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }} className="py-10">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.28em]" style={{ color: C.brand }}>AirGSA</span>
        <span className="text-[11px]" style={{ color: C.inkFaint }}>© 2026 AirGSA. Concept 1 — Preview only.</span>
        <div className="flex gap-5">
          <Link href="/landing-concepts" className="text-[11px] transition-colors hover:text-[#0A0A0A]" style={{ color: C.inkFaint }}>← All concepts</Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Concept1() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div style={{ fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
      <Nav />
      <Hero reduced={reduced} />
      <FeatureRow
        label="01 — Tender Management"
        title="Structured RFPs, not PDF attachments"
        body="Define lane specifications, tonnage targets, product requirements, and compliance criteria.
              GSAs receive a structured brief — not a vague email. Every tender is trackable, scorable, and auditable."
        bullets={[
          'Route lanes with origin/destination pairs',
          'Minimum tonnage and yield targets per lane',
          'Compliance requirements: IATA, GDP, CEIV',
          'Automatic broadcast to qualified GSAs',
        ]}
        mockup={<TenderMockup />}
        reduced={reduced}
      />
      <FeatureRow
        label="02 — Live Performance"
        title="Commercial performance, tracked every month"
        body="Once a GSA is activated, their monthly KPIs flow directly into your performance dashboard.
              Yield, load factor, and revenue — tracked against targets automatically."
        bullets={[
          'Revenue and yield per GSA and per route',
          'Load factor vs. target with trend lines',
          'Monthly performance review triggers',
          'Contract renewal tracking and timeline',
        ]}
        mockup={<PerformanceMockup />}
        flip
        reduced={reduced}
      />
      <FeaturesGrid reduced={reduced} />
      <CTA />
      <Footer />
    </div>
  );
}
