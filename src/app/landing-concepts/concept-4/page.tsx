'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';

const JourneyGsap = dynamic(
  () => import('@/components/landing-concepts/journey-gsap').then((m) => m.JourneyGsap),
  { ssr: false, loading: () => (
    <div
      style={{ height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1E4F' }}
    >
      <div style={{ color: '#3A5090', fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
        Loading journey…
      </div>
    </div>
  )},
);

// ─── Palette ──────────────────────────────────────────────────────────────────
const J = {
  bg:        '#080E24',
  bg2:       '#0B1530',
  bg3:       '#0F1E40',
  border:    '#162048',
  border2:   '#1E2E5A',
  brand:     '#1A5AFF',
  cyan:      '#00AADD',
  ink:       '#D8E4FF',
  inkMuted:  '#6A85B8',
  inkFaint:  '#2E4068',
  success:   '#10B981',
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
        background: 'rgba(8,14,36,0.88)',
        borderBottom: `1px solid ${J.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      className="sticky top-0 z-50"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.32em]" style={{ color: J.brand }}>
          AirGSA
        </span>
        <div className="hidden gap-8 text-[12px] md:flex" style={{ color: J.inkMuted }}>
          {['The Journey', 'Platform', 'Intelligence', 'Pricing'].map((l) => (
            <span key={l} className="cursor-pointer transition-colors hover:text-[#D8E4FF]">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" style={{ color: J.inkMuted }} className="text-[12px] hover:text-[#D8E4FF] transition-colors">Sign in</Link>
          <Link
            href="/signup"
            className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
            style={{ background: J.brand, boxShadow: '0 0 18px rgba(26,90,255,0.45)' }}
          >
            Request access
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Above-fold intro ─────────────────────────────────────────────────────────
function Intro() {
  return (
    <section
      style={{ background: J.bg, minHeight: '40svh', borderBottom: `1px solid ${J.border}` }}
      className="flex items-center relative overflow-hidden"
    >
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(${J.border2} 1px, transparent 1px),
            linear-gradient(90deg, ${J.border2} 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
        }}
      />
      {/* Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(26,90,255,0.07) 0%, transparent 70%)',
        }}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-3xl px-6 py-16 text-center"
      >
        <motion.div variants={fadeUp} className="mb-6 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="h-px w-10" style={{ background: J.brand }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: J.brand }}>
              The tender journey
            </span>
            <div className="h-px w-10" style={{ background: J.brand }} />
          </div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-[clamp(2.4rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em]"
          style={{ color: J.ink }}
        >
          From tender to{' '}
          <span
            style={{
              background: `linear-gradient(135deg, ${J.brand} 0%, ${J.cyan} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            take-off
          </span>
          {' '}in six steps
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-5 text-[15px] leading-[1.8] mx-auto max-w-xl"
          style={{ color: J.inkMuted }}
        >
          Follow the complete lifecycle of a Saudia Cargo GSA tender — from the moment
          the airline publishes the mandate to the first commercial cargo movement.
        </motion.p>

        {/* Stage pills */}
        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-2">
          {[
            { num: '01', label: 'Tender' },
            { num: '02', label: 'Apply' },
            { num: '03', label: 'Score' },
            { num: '04', label: 'Award' },
            { num: '05', label: 'Activate' },
            { num: '06', label: 'Track' },
          ].map(({ num, label }, i) => (
            <div
              key={num}
              className="flex items-center gap-2 rounded-full border px-3 py-1.5"
              style={{ borderColor: J.border2, background: J.bg2 }}
            >
              <span className="font-mono text-[9px] font-bold" style={{ color: J.brand }}>{num}</span>
              <span className="text-[10px] font-semibold" style={{ color: J.inkMuted }}>{label}</span>
              {i < 5 && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={J.inkFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </div>
          ))}
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-8 text-[12px]"
          style={{ color: J.inkFaint }}
        >
          Scroll to walk through the journey →
        </motion.p>
      </motion.div>
    </section>
  );
}

// ─── Journey scroll section ───────────────────────────────────────────────────
function JourneySection({ reduced }: { reduced: boolean }) {
  if (reduced) {
    // Reduced motion: show static card list instead
    return (
      <section style={{ background: J.bg2, borderTop: `1px solid ${J.border}` }} className="py-16">
        <div className="mx-auto max-w-3xl px-6 space-y-6">
          {[
            { num: '01', label: 'Tender Published', body: 'Saudia Cargo publishes a structured GSA tender for FRA → JED. 180t/month, IATA-certified GSA, commission-based. Deadline June 5.' },
            { num: '02', label: 'GSAs Apply', body: '4 qualified GSA firms submit structured proposals — network maps, commission structures, and key account pipelines attached.' },
            { num: '03', label: 'AI Scoring', body: 'Every application scored across network fit, financials, compliance, and pipeline quality. AeroLink GSA ranks #1 with 91/100.' },
            { num: '04', label: 'Award Decision', body: 'AeroLink GSA awarded the mandate. Contract terms finalized within the platform. Full audit trail maintained.' },
            { num: '05', label: 'Route Activated', body: 'Route goes live June 1. AeroLink GSA begins commercial operations on FRA → JED. First cargo: 24.4t on June 1.' },
            { num: '06', label: 'Performance Live', body: 'Revenue $820K, Load Factor 84%, Yield $2.51/kg — all tracked automatically. No manual reporting from AeroLink GSA.' },
          ].map(({ num, label, body }) => (
            <div key={num} className="rounded-2xl border p-6" style={{ borderColor: J.border, background: J.bg3 }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-[11px] font-extrabold" style={{ color: J.brand }}>{num}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: J.inkFaint }}>{label}</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: J.inkMuted }}>{body}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: J.bg }}>
      <JourneyGsap />
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
      style={{ background: J.bg2, borderTop: `1px solid ${J.border}` }}
      className="py-24 relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,90,255,0.07) 0%, transparent 70%)',
        }}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <motion.div variants={fadeUp} className="mb-6 flex justify-center">
          <div className="h-px w-12" style={{ background: J.brand }} />
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.06] tracking-tight"
          style={{ color: J.ink }}
        >
          Ready to run your first tender?
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-5 text-[15px] leading-relaxed mx-auto max-w-md"
          style={{ color: J.inkMuted }}
        >
          AirGSA is invite-only during the current rollout. Request access — your
          team will be onboarded within 48 hours.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[13px]
                       font-semibold text-white"
            style={{ background: J.brand, boxShadow: '0 4px 28px rgba(26,90,255,0.5)' }}
          >
            Book a demo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <Link
            href="/landing-concepts"
            className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-[13px]
                       font-semibold transition-colors"
            style={{ borderColor: J.border2, color: J.inkMuted }}
          >
            ← All concepts
          </Link>
        </motion.div>

        {/* KPI summary */}
        <motion.div
          variants={fadeUp}
          className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto"
        >
          {[
            { value: '< 48h', label: 'From tender to first application' },
            { value: '91/100', label: 'Top GSA AI score' },
            { value: '$820K', label: 'Month-1 revenue' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-[1.4rem] font-bold tracking-tight" style={{ color: J.ink }}>{value}</p>
              <p className="mt-0.5 text-[10px]" style={{ color: J.inkFaint }}>{label}</p>
            </div>
          ))}
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-10 text-[10px] uppercase tracking-[0.18em]"
          style={{ color: J.inkFaint }}
        >
          Concept 4 · Preview only · Not a production route
        </motion.p>
      </motion.div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Concept4() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div style={{ background: J.bg, fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
      <Nav />
      <Intro />
      <JourneySection reduced={reduced} />
      <CTA />
    </div>
  );
}
