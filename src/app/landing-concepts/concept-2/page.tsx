'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';

const GlobeScene = dynamic(
  () => import('@/components/landing-concepts/globe-scene').then((m) => m.GlobeScene),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%' }} /> },
);

// ─── Dark color palette ───────────────────────────────────────────────────────
const D = {
  bg:        '#060C1A',
  bg2:       '#0C1428',
  bg3:       '#111D35',
  border:    '#162040',
  border2:   '#1C2D52',
  brand:     '#1A5AFF',
  cyan:      '#00D4FF',
  ink:       '#E0E8FF',
  inkMuted:  '#5A7090',
  inkFaint:  '#2E4068',
  success:   '#10B981',
  successBg: 'rgba(16,185,129,0.12)',
  warning:   '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
};

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
};

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      style={{
        background: 'rgba(6,12,26,0.85)',
        borderBottom: `1px solid ${D.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <span
          className="text-[11px] font-extrabold uppercase tracking-[0.32em]"
          style={{ color: D.brand }}
        >
          AirGSA
        </span>
        <div className="hidden gap-8 text-[12px] md:flex" style={{ color: D.inkMuted }}>
          {['Network', 'Platform', 'Intelligence', 'Pricing'].map((l) => (
            <span key={l} className="cursor-pointer transition-colors hover:text-[#E0E8FF]">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" style={{ color: D.inkMuted }} className="text-[12px] transition-colors hover:text-[#E0E8FF]">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
            style={{
              background: D.brand,
              boxShadow: '0 0 20px rgba(26,90,255,0.45)',
            }}
          >
            Request access
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Hero with Globe ──────────────────────────────────────────────────────────
function Hero({ reduced }: { reduced: boolean }) {
  return (
    <section
      style={{ background: D.bg, minHeight: '100svh' }}
      className="relative overflow-hidden pt-16"
    >
      {/* Ambient radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 60% 50%, rgba(26,90,255,0.08) 0%, transparent 65%)',
        }}
      />
      {/* Grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(${D.border2} 1px, transparent 1px),
            linear-gradient(90deg, ${D.border2} 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 h-[calc(100svh-64px)] flex items-center">
        <div className="grid w-full gap-12 lg:grid-cols-[1fr_1.1fr] items-center">

          {/* LEFT: text */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {/* Overline */}
            <motion.div variants={fadeUp} className="mb-6 flex items-center gap-3">
              <div className="h-px w-8" style={{ background: D.brand }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.26em]"
                style={{ color: D.brand }}
              >
                Global cargo network
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[clamp(2.4rem,5vw,4rem)] font-bold leading-[1.04] tracking-[-0.03em]"
              style={{ color: D.ink }}
            >
              The infrastructure for{' '}
              <span
                style={{
                  background: `linear-gradient(135deg, ${D.brand}, ${D.cyan})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                cargo network
              </span>{' '}
              expansion
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-lg text-[15px] leading-[1.8]"
              style={{ color: D.inkMuted }}
            >
              AirGSA connects airlines and air cargo GSAs through digital tenders,
              AI-powered partner evaluation, and live network intelligence —
              across every market, every route.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5
                           text-[13px] font-semibold text-white"
                style={{
                  background: D.brand,
                  boxShadow: '0 4px 28px rgba(26,90,255,0.5)',
                }}
              >
                Enter the network
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border px-6 py-3.5
                           text-[13px] font-semibold transition-colors"
                style={{ borderColor: D.border2, color: D.inkMuted }}
              >
                Sign in
              </Link>
            </motion.div>

            {/* Route codes strip */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-2">
              {[
                ['FRA', 'JED'],
                ['FRA', 'SIN'],
                ['IST', 'DXB'],
                ['JED', 'LHR'],
                ['RUH', 'FRA'],
              ].map(([a, b]) => (
                <div
                  key={a+b}
                  className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5"
                  style={{ borderColor: D.border, background: D.bg2 }}
                >
                  <span className="font-mono text-[10px] font-bold" style={{ color: D.cyan }}>{a}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={D.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <span className="font-mono text-[10px] font-bold" style={{ color: D.ink }}>{b}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT: Three.js Globe */}
          <motion.div
            initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, ease: EASE, delay: 0.3 }}
            className="relative"
            style={{ height: 520 }}
          >
            <GlobeScene />

            {/* Floating stat cards */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, ease: EASE, delay: 1.1 }}
              className="absolute left-0 top-[15%] rounded-xl border px-4 py-3"
              style={{
                borderColor: D.border,
                background: 'rgba(12,20,40,0.88)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: D.inkMuted }}>Applications received</p>
              <p className="text-[22px] font-bold mt-1" style={{ color: D.ink }}>6</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: D.success }}>FRA → JED · Open</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, ease: EASE, delay: 1.25 }}
              className="absolute right-0 top-[25%] rounded-xl border px-4 py-3"
              style={{
                borderColor: D.border,
                background: 'rgba(12,20,40,0.88)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: D.inkMuted }}>Markets covered</p>
              <p className="text-[22px] font-bold mt-1" style={{ color: D.ink }}>5</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: D.cyan }}>DE · SA · SG · AE · GB</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: EASE, delay: 1.4 }}
              className="absolute bottom-[10%] left-1/2 -translate-x-1/2 rounded-xl border px-4 py-3"
              style={{
                borderColor: D.border,
                background: 'rgba(12,20,40,0.88)',
                backdropFilter: 'blur(12px)',
                minWidth: 180,
              }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: D.inkMuted }}>Active GSA — Saudia Cargo</p>
              <p className="text-[13px] font-bold mt-1" style={{ color: D.ink }}>AeroLink GSA · Score 91</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: D.border2 }}>
                  <div className="h-full rounded-full" style={{ width: '91%', background: `linear-gradient(to right, ${D.brand}, ${D.cyan})` }} />
                </div>
                <span className="text-[10px] font-bold" style={{ color: D.cyan }}>91</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
        style={{ background: `linear-gradient(to bottom, transparent, ${D.bg})` }}
      />
    </section>
  );
}

// ─── Network stats strip ──────────────────────────────────────────────────────
function StatsStrip({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section
      ref={ref}
      style={{ background: D.bg2, borderTop: `1px solid ${D.border}`, borderBottom: `1px solid ${D.border}` }}
      className="py-10"
    >
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 gap-8 sm:grid-cols-4">
        {[
          { label: 'Airlines', value: '12', sub: 'in network' },
          { label: 'GSA partners', value: '40+', sub: 'qualified' },
          { label: 'Routes managed', value: '180+', sub: 'active lanes' },
          { label: 'Response time', value: '<48h', sub: 'average' },
        ].map(({ label, value, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduced ? 0.1 : 0.5, ease: EASE, delay: reduced ? 0 : i * 0.08 }}
            className="text-center"
          >
            <p
              className="text-[2.2rem] font-bold tracking-tight"
              style={{ color: D.ink }}
            >
              {value}
            </p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: D.brand }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: D.inkFaint }}>{sub}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Network detail section ───────────────────────────────────────────────────
function NetworkDetail({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} style={{ background: D.bg }} className="py-24">
      <div className="mx-auto max-w-7xl px-6 grid gap-16 items-start lg:grid-cols-2">

        {/* Left: narrative */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
            <div className="h-px w-8" style={{ background: D.brand }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: D.brand }}>
              Active cargo network
            </span>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.1] tracking-tight"
            style={{ color: D.ink }}
          >
            Five active routes.
            <br />
            One platform.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-5 text-[15px] leading-relaxed max-w-md"
            style={{ color: D.inkMuted }}
          >
            Saudia Cargo&apos;s GSA network spans Germany, UAE, Singapore, the United
            Kingdom and Turkey — all sourced through a single structured tender process
            on AirGSA.
          </motion.p>

          <motion.div variants={stagger} className="mt-10 space-y-3">
            {[
              { from: 'FRA', to: 'JED', status: 'Awarded',  gsa: 'AeroLink GSA',          color: D.success, bg: D.successBg },
              { from: 'FRA', to: 'SIN', status: 'Active',   gsa: 'CargoBridge Partners',  color: D.cyan,    bg: 'rgba(0,212,255,0.1)' },
              { from: 'IST', to: 'DXB', status: 'In Review', gsa: 'SkyTrade Cargo',        color: D.warning, bg: D.warningBg },
              { from: 'JED', to: 'LHR', status: 'Active',   gsa: 'PrimeAir Cargo Sales',  color: D.cyan,    bg: 'rgba(0,212,255,0.1)' },
              { from: 'RUH', to: 'FRA', status: 'Awarded',  gsa: 'AeroLink GSA',          color: D.success, bg: D.successBg },
            ].map((r) => (
              <motion.div
                key={r.from + r.to}
                variants={fadeUp}
                className="flex items-center gap-4 rounded-xl border p-3.5"
                style={{ borderColor: D.border, background: D.bg2 }}
              >
                <div className="flex items-center gap-2 min-w-[110px]">
                  <span className="font-mono text-[12px] font-bold" style={{ color: D.cyan }}>{r.from}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <span className="font-mono text-[12px] font-bold" style={{ color: D.ink }}>{r.to}</span>
                </div>
                <span className="flex-1 text-[11px]" style={{ color: D.inkMuted }}>{r.gsa}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[9px] font-semibold shrink-0"
                  style={{ background: r.bg, color: r.color }}
                >
                  {r.status}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right: feature cards */}
        <motion.div
          initial={{ opacity: 0, x: reduced ? 0 : 28 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.75, ease: EASE, delay: 0.2 }}
          className="space-y-4"
        >
          {[
            {
              icon: '⬡',
              title: 'AI-powered scoring',
              body: 'Every GSA application is automatically scored across network coverage, financial strength, compliance credentials, and key account pipeline.',
            },
            {
              icon: '◈',
              title: 'Structured digital tenders',
              body: 'Define lane specifications, tonnage targets, product requirements. GSAs receive a structured brief — not a vague email.',
            },
            {
              icon: '◎',
              title: 'Live market intelligence',
              body: 'Real-time freighter positions, yield tracking, capacity alerts, and cargo market signals — curated and confidence-scored.',
            },
            {
              icon: '▣',
              title: 'Performance monitoring',
              body: 'Once a GSA is activated, their monthly KPIs flow directly into your performance dashboard. No manual reporting.',
            },
          ].map(({ icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: reduced ? 0.1 : 0.5, ease: EASE, delay: reduced ? 0 : 0.3 + i * 0.1 }}
              className="rounded-2xl border p-5 transition-colors hover:border-[#1A5AFF44]"
              style={{ borderColor: D.border, background: D.bg2 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                             text-[18px] border"
                  style={{ borderColor: D.border2, background: D.bg3, color: D.brand }}
                >
                  {icon}
                </div>
                <div>
                  <h3 className="text-[14px] font-bold" style={{ color: D.ink }}>{title}</h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: D.inkMuted }}>{body}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });

  return (
    <section
      ref={ref}
      style={{ background: D.bg2, borderTop: `1px solid ${D.border}` }}
      className="py-24 relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,90,255,0.08) 0%, transparent 70%)',
        }}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <motion.div variants={fadeUp} className="mb-6 flex justify-center">
          <div className="h-px w-12" style={{ background: D.brand }} />
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.06] tracking-tight"
          style={{ color: D.ink }}
        >
          Join the cargo network
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-5 text-[15px] leading-relaxed mx-auto max-w-md"
          style={{ color: D.inkMuted }}
        >
          AirGSA is invite-only during the current rollout. Request access and
          our team will review within 48 hours.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[13px]
                       font-semibold text-white"
            style={{ background: D.brand, boxShadow: '0 4px 28px rgba(26,90,255,0.5)' }}
          >
            Request access
          </Link>
          <Link
            href="/landing-concepts"
            className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-[13px]
                       font-semibold transition-colors"
            style={{ borderColor: D.border2, color: D.inkMuted }}
          >
            ← All concepts
          </Link>
        </motion.div>
        <motion.p
          variants={fadeUp}
          className="mt-8 text-[10px] uppercase tracking-[0.18em]"
          style={{ color: D.inkFaint }}
        >
          Concept 2 · Preview only · Not a production route
        </motion.p>
      </motion.div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Concept2() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div style={{ background: D.bg, fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
      <Nav />
      <Hero reduced={reduced} />
      <StatsStrip reduced={reduced} />
      <NetworkDetail reduced={reduced} />
      <CTA />
    </div>
  );
}
