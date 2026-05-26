'use client';

import { useRef } from 'react';
import Link from 'next/link';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
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

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  navy:  '#071830',
  navyD: '#050F1E',
  blue:  '#1A5AFF',
  sky:   '#60A5FA',
  cyan:  '#22D3EE',
  white: '#FFFFFF',
  offW:  '#F2F6FF',
  muted: '#8099C0',
  gold:  '#F59E0B',
};

// ── Images ────────────────────────────────────────────────────────────────────
const IMG = {
  hero:  '/landing/3/img-1.jpg',
  meet:  '/landing/1/img-2.jpg',
  cargo: '/landing/2/img-3.jpg',
  net:   '/landing/4/img-1.jpg',
  sky2:  '/landing/3/img-3.jpg',
};

const EASE = [0.22, 1, 0.36, 1] as const;

// ── ParallaxBg ────────────────────────────────────────────────────────────────
function ParallaxBg({
  src,
  speed = 0.35,
  overlay = 'rgba(7,24,48,0.55)',
  children,
  minHeight = '100svh',
}: {
  src: string;
  speed?: number;
  overlay?: string;
  children: React.ReactNode;
  minHeight?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const range = speed * 100;
  const y = useTransform(scrollYProgress, [0, 1], [`-${range}%`, `${range}%`]);
  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'hidden', minHeight }}>
      <motion.div style={{ position: 'absolute', inset: `-${range}% 0`, y, zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: overlay }} />
      </motion.div>
      <div style={{ position: 'relative', zIndex: 1, minHeight }}>{children}</div>
    </div>
  );
}

// ── ParallaxText ──────────────────────────────────────────────────────────────
function ParallaxText({ children, speed = 0.08, style = {} }: { children: React.ReactNode; speed?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `-${speed * 100}%`]);
  return <motion.div ref={ref} style={{ y, ...style }}>{children}</motion.div>;
}

// ── FadeUp ────────────────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, reduced = false }: { children: React.ReactNode; delay?: number; reduced?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 44 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '18px 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(to bottom, rgba(7,24,48,0.92) 0%, transparent 100%)',
      fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
    }}>
      <Link href="/" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.34em', textTransform: 'uppercase', color: C.sky, textDecoration: 'none' }}>
        AirGSA
      </Link>
      <div style={{ display: 'none', alignItems: 'center', gap: 28 }} className="md:flex">
        {([['#how-it-works', 'How it works'], ['#features', 'Features'], ['/news', 'Intelligence']] as [string, string][]).map(([href, label]) => (
          <Link key={label} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>{label}</Link>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ThemeToggle />
        <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Log in</Link>
        <Link href="/signup" style={{ fontSize: 13, fontWeight: 700, color: 'white', background: C.blue, borderRadius: 8, padding: '9px 20px', textDecoration: 'none', boxShadow: '0 0 20px rgba(26,90,255,0.4)' }}>
          Request access
        </Link>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection({ reduced }: { reduced: boolean }) {
  return (
    <ParallaxBg src={IMG.hero} speed={0.4} overlay="rgba(7,24,48,0.52)" minHeight="100svh">
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', padding: '80px clamp(24px, 5vw, 80px)', gap: 64, flexWrap: 'wrap' }}>
        {/* Left: copy */}
        <div style={{ flex: '1 1 400px', maxWidth: 560 }}>
          <ParallaxText speed={0.05}>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}
            >
              <div style={{ width: 40, height: 1, background: 'rgba(96,165,250,0.6)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.34em', color: C.sky, textTransform: 'uppercase' }}>
                Aviation cargo partner network
              </span>
              <div style={{ width: 40, height: 1, background: 'rgba(96,165,250,0.6)' }} />
            </motion.div>

            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 'clamp(44px, 7vw, 96px)', fontWeight: 900, color: C.white, lineHeight: 0.96, letterSpacing: '-0.04em', marginBottom: 24 }}
            >
              The operating system for{' '}
              <span style={{ color: C.sky }}>airline cargo</span>{' '}
              partnerships
            </motion.h1>

            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.9 }}
              style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', maxWidth: 480, marginBottom: 40, lineHeight: 1.65 }}
            >
              AirGSA connects airlines, GSAs and cargo markets through digital tenders, partner evaluation, route assignment and live market intelligence.
            </motion.p>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.1 }}
              style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}
            >
              <Link href="/signup" style={{ fontSize: 15, fontWeight: 700, color: 'white', background: C.blue, borderRadius: 10, padding: '14px 32px', textDecoration: 'none', boxShadow: '0 4px 28px rgba(26,90,255,0.45)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Book a demo <ArrowRight size={16} />
              </Link>
              <Link href="/login" style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 10, padding: '14px 26px', textDecoration: 'none' }}>
                Sign in to dashboard
              </Link>
            </motion.div>

            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 1.4 }}
              style={{ marginTop: 24, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em', textTransform: 'uppercase' }}
            >
              IATA-aligned · GDP-ready · SOC 2 in progress
            </motion.p>
          </ParallaxText>
        </div>

        {/* Right: glassmorphism product cards */}
        <div style={{ flex: '1 1 340px', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <motion.div
            initial={reduced ? false : { opacity: 0, x: 32, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
            style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 16, padding: '20px' }}
          >
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color="#34D399" />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Tender Published</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 4 }}>Central Europe GSA Coverage</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>FRA · MUC · VIE → BCN · MXP · MAD</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['120t /mo', 'Deadline May 24'].map(t => (
                <span key={t} style={{ fontSize: 11, fontWeight: 700, color: C.sky, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, padding: '3px 10px' }}>{t}</span>
              ))}
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.0, ease: EASE }}
              style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 16, padding: '18px' }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Applications</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.sky, marginBottom: 12 }}>12 received</div>
              {[{ name: 'Kühne+Nagel Air', score: 87 }, { name: 'Panalpina (Flex)', score: 81 }].map(a => (
                <div key={a.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{a.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: C.sky }}>{a.score}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${a.score}%`, background: C.sky, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.15, ease: EASE }}
              style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 16, padding: '18px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Plane size={12} color={C.sky} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Route Assigned</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: C.white, marginBottom: 4 }}>FRA → BCN</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Partner: K+N Air & Sea</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Activation <span style={{ fontWeight: 700, color: C.white }}>June 1</span> · 120t /mo</p>
            </motion.div>
          </div>
        </div>
      </div>
    </ParallaxBg>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
const STEPS = [
  { num: '1', label: 'Publish',  title: 'Airline publishes a GSA tender',          body: 'Define lanes, tonnage requirements, product mix, and commercial targets. Structured, not a PDF in an inbox.' },
  { num: '2', label: 'Apply',    title: 'Qualified GSAs submit proposals',          body: 'Network coverage maps, commission structures, and key account pipelines — every proposal scored by AI instantly.' },
  { num: '3', label: 'Evaluate', title: 'Side-by-side comparison & scoring',        body: 'AI scores across network, financial strength, compliance, and market fit. Shortlist with confidence.' },
  { num: '4', label: 'Assign',   title: 'Routes assigned, contracts activated',     body: 'From shortlist to signed contract without leaving the platform. Monthly KPIs flow into your performance desk.' },
  { num: '5', label: 'Monitor',  title: 'Live market and flight intelligence',      body: 'Real-time freighter positions, yield tracking, capacity alerts, and cargo market signals — all in one workspace.' },
  { num: '6', label: 'Scale',    title: 'Expand your GSA network',                  body: 'Add markets, run new tenders, and track commercial performance as your network grows.' },
];

function HowItWorksSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const accentColors = [C.blue, C.blue, C.sky, C.sky, C.cyan, C.cyan];

  return (
    <section id="how-it-works" ref={ref} style={{ background: C.white, padding: '100px 48px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <FadeUp reduced={reduced}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.blue, textTransform: 'uppercase' }}>How it works</span>
            <h2 style={{ marginTop: 14, fontSize: 'clamp(26px, 4vw, 46px)', fontWeight: 800, color: C.navy, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              From tender to take-off in six steps
            </h2>
            <p style={{ marginTop: 16, fontSize: 15, color: C.muted, maxWidth: 520, margin: '16px auto 0', lineHeight: 1.7 }}>
              AirGSA replaces disconnected email threads with a structured digital workflow — from first RFP to live monthly performance tracking.
            </p>
          </div>
        </FadeUp>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, ease: EASE, delay: i * 0.1 }}
              style={{ borderTop: `3px solid ${accentColors[i]}`, paddingTop: 24 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ display: 'flex', width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: C.blue, fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>{step.num}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{step.label}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Tender section ────────────────────────────────────────────────────────────
function TenderSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-12%' });

  return (
    <ParallaxBg src={IMG.meet} speed={0.3} overlay="rgba(7,24,48,0.65)" minHeight="90vh">
      <div ref={ref} style={{ minHeight: '90vh', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', flexWrap: 'wrap' as const }}>
        <div style={{ padding: 'clamp(48px, 6vw, 88px)' }}>
          <ParallaxText speed={0.06}>
            <FadeUp reduced={reduced}>
              <div style={{ width: 40, height: 2, background: C.sky, marginBottom: 24 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.sky, textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>01 - Tender Management</span>
              <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 46px)', fontWeight: 800, color: C.white, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
                Structured RFPs, not PDF attachments
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: 32, maxWidth: 400 }}>
                Define lane specifications, tonnage targets, product requirements, and compliance criteria. GSAs receive a structured brief, not a vague email. Every tender is trackable, scorable, and auditable.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Route lanes with origin/destination pairs', 'Minimum tonnage and yield targets per lane', 'Compliance requirements (IATA, GDP, CEIV)', 'Application deadline and review timeline', 'Automatic broadcast to qualified GSAs'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircle2 size={16} color={C.sky} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
          </ParallaxText>
        </div>

        <div style={{ padding: 'clamp(48px, 6vw, 88px)' }}>
          <ParallaxText speed={0.04}>
            <motion.div
              initial={reduced ? false : { opacity: 0, x: 32 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
              style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 20, padding: '28px' }}
            >
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: C.sky, textTransform: 'uppercase', marginBottom: 6 }}>Active Tender - AeroNova Cargo</p>
                  <h4 style={{ fontSize: 17, fontWeight: 800, color: C.white }}>Central Europe GSA Coverage</h4>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(26,90,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color={C.sky} />
                </div>
              </div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 10 }}>Route Lanes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {[{ from: 'FRA', to: 'BCN' }, { from: 'MUC', to: 'MXP' }, { from: 'VIE', to: 'MAD' }].map(lane => (
                  <div key={lane.from} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: C.sky }}>{lane.from}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(96,165,250,0.3)' }} />
                    <Plane size={11} color={C.cyan} />
                    <div style={{ flex: 1, height: 1, background: 'rgba(96,165,250,0.3)' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: C.white }}>{lane.to}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[['Tonnage', '120t /mo'], ['Deadline', 'May 24'], ['Applied', '7 GSAs']].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: C.white }}>{val}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </ParallaxText>
        </div>
      </div>
    </ParallaxBg>
  );
}

// ── Stats break ───────────────────────────────────────────────────────────────
function StatsBreak({ reduced }: { reduced: boolean }) {
  return (
    <div style={{ background: C.navy, padding: '80px 48px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, textAlign: 'center' }}>
        {[
          { v: '80+',   l: 'Airline clients', c: C.sky  },
          { v: '400+',  l: 'GSA partners',    c: C.cyan },
          { v: '340K+', l: 'Tonnes managed',  c: C.sky  },
          { v: '4.2×',  l: 'Revenue uplift',  c: C.gold },
        ].map((s, i) => (
          <FadeUp key={s.l} delay={i * 0.08} reduced={reduced}>
            <div style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 900, color: s.c, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.l}</div>
          </FadeUp>
        ))}
      </div>
    </div>
  );
}

// ── Applications section ──────────────────────────────────────────────────────
const APPS = [
  { name: 'Kühne+Nagel Air & Sea', code: 'KN', markets: 'FRA · MUC · VIE · BCN · MXP · MAD', score: 87, status: 'Shortlisted', statusColor: 'text-success bg-success-bg', highlight: true  },
  { name: 'Panalpina (Flexport)',   code: 'PA', markets: 'FRA · VIE · BCN · MXP',              score: 81, status: 'In review',   statusColor: 'text-brand bg-brand-light',   highlight: false },
  { name: 'DB Schenker',            code: 'DS', markets: 'FRA · MUC · BCN',                    score: 74, status: 'In review',   statusColor: 'text-brand bg-brand-light',   highlight: false },
] as const;

function ApplicationsSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} style={{ background: '#050F1E', padding: '100px 48px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'center' }}>
        {/* Left: glass product card */}
        <motion.div
          initial={reduced ? false : { opacity: 0, x: -32 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '24px' }}
        >
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 6 }}>Central Europe - Applications</p>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: C.white }}>12 received · 3 shortlisted</h4>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.sky, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 100, padding: '4px 12px' }}>AI scoring active</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {APPS.map((app, i) => (
              <motion.div
                key={app.name}
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.45, ease: EASE }}
                style={{
                  background: app.highlight ? 'rgba(26,90,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: app.highlight ? '1px solid rgba(26,90,255,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: C.sky }}>
                      {app.code}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{app.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{app.markets}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 100, padding: '3px 10px', color: app.highlight ? '#34D399' : C.sky, background: app.highlight ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)' }}>
                    {app.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>AI Score</span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${app.score}%`, background: C.sky, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.sky }}>{app.score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: narrative */}
        <FadeUp reduced={reduced} delay={0.1}>
          <div style={{ width: 40, height: 2, background: C.sky, marginBottom: 24 }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.sky, textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>02 - GSA Applications</span>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 46px)', fontWeight: 800, color: C.white, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
            AI-scored proposals. No spreadsheets.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: 32, maxWidth: 420 }}>
            Every GSA application is automatically scored across network coverage, financial strength, compliance credentials, and key account pipeline. Compare candidates side by side — in minutes, not weeks.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Network coverage scored against your lane requirements', 'Proposed commission structure and yield commitments', 'Compliance certificates auto-verified (IATA, GDP, CEIV)', 'Key account pipeline attached per application', 'Shortlist, request clarification, negotiate — in one place'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={16} color={C.sky} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>{item}</span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Features section ──────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Radar,       title: 'Live flight tracking',   body: 'Real-time freighter positions and route context. Monitor your network as it moves.' },
  { icon: Sparkles,    title: 'AI-assisted scoring',    body: 'Applications scored across coverage, financials, and compliance — instantly.' },
  { icon: BarChart3,   title: 'Commercial analytics',   body: 'Revenue, yield, and load factor per GSA, route, and market — every period.' },
  { icon: FileText,    title: 'Contract workflow',      body: 'From shortlist to signed contract without leaving the platform. Full audit trail.' },
  { icon: Globe2,      title: 'Market intelligence',    body: 'Cargo signals from airline and GSA activity, curated and confidence-scored.' },
  { icon: Building2,   title: 'GSA marketplace',        body: 'A qualified directory of 40+ GSA partners rated on network, compliance, and win rate.' },
  { icon: Zap,         title: 'Capacity alerts',        body: 'Broadcast urgent capacity positions to GSA partners in seconds.' },
  { icon: ShieldCheck, title: 'Compliance tracking',    body: 'GDP, IATA, CEIV certifications tracked per partner. Know who qualifies before you shortlist.' },
  { icon: TrendingUp,  title: 'Performance monitoring', body: 'Set KPI targets per GSA and route. Track monthly performance automatically.' },
] as const;

function FeaturesSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <ParallaxBg src={IMG.cargo} speed={0.35} overlay="rgba(7,24,48,0.80)" minHeight="auto">
      <section id="features" ref={ref} style={{ padding: '100px 48px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeUp reduced={reduced}>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.sky, textTransform: 'uppercase' }}>Platform capabilities</span>
              <h2 style={{ marginTop: 14, fontSize: 'clamp(26px, 4vw, 46px)', fontWeight: 800, color: C.white, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Every tool the journey needs
              </h2>
              <p style={{ marginTop: 16, fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '16px auto 0', lineHeight: 1.7 }}>
                From the first tender to monthly GSA performance reviews — AirGSA handles the full lifecycle of airline cargo partnerships.
              </p>
            </div>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={reduced ? false : { opacity: 0, y: 22 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, ease: EASE, delay: i * 0.06 }}
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={18} color={C.sky} />
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 8 }}>{title}</h4>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </ParallaxBg>
  );
}

// ── Performance section ───────────────────────────────────────────────────────
function PerformanceSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  const KPIS = [
    { label: 'Monthly Revenue', value: '$1.26M',   delta: '+12% MoM',     positive: true  as boolean | null, icon: TrendingUp },
    { label: 'Load Factor',     value: '77%',      delta: '3.2 pp up',    positive: true  as boolean | null, icon: BarChart3  },
    { label: 'Avg Yield',       value: '$2.31/kg', delta: 'Above target', positive: true  as boolean | null, icon: Sparkles   },
    { label: 'Active GSAs',     value: '8',        delta: '3 markets',    positive: null  as boolean | null, icon: Globe2     },
  ];

  return (
    <section ref={ref} style={{ background: C.offW, padding: '100px 48px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'center' }}>
        <motion.div
          initial={reduced ? false : { opacity: 0, x: -24 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <FadeUp reduced={reduced}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.blue, textTransform: 'uppercase', display: 'block', marginBottom: 14 }}>03 - Live Operation</span>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 46px)', fontWeight: 800, color: C.navy, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
              Commercial performance, tracked every month
            </h2>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75, marginBottom: 32, maxWidth: 420 }}>
              Once a GSA is activated, their monthly KPIs flow directly into your performance dashboard. Yield, load factor, and revenue — tracked against targets, no manual reporting required.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Revenue and yield per GSA and per route', 'Load factor vs. target with trend lines', 'Automatic monthly performance review triggers', 'Capacity alert broadcast to all GSA partners', 'Contract renewal tracking and timeline'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={16} color={C.blue} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: C.muted }}>{item}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, x: 32 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          style={{ background: C.white, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: 4, boxShadow: '0 20px 60px rgba(7,24,48,0.1)' }}
        >
          <div style={{ background: '#F8FAFE', borderRadius: 16, padding: '22px' }}>
            <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: C.muted, textTransform: 'uppercase', marginBottom: 5 }}>AeroNova Cargo - Performance desk</p>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>GSA Network - April 2026</h4>
              </div>
              <Radar size={20} color={C.blue} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {KPIS.map(({ label, value, delta, positive, icon: Icon }) => (
                <div key={label} style={{ background: C.white, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase' }}>{label}</p>
                    <Icon size={14} color="rgba(0,0,0,0.2)" />
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: C.navy, letterSpacing: '-0.02em' }}>{value}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: positive === true ? '#16A34A' : positive === false ? '#DC2626' : C.muted, marginTop: 4 }}>{delta}</p>
                </div>
              ))}
            </div>
            <div style={{ background: C.white, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase', marginBottom: 12 }}>Monthly yield ($/kg) - last 6 months</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 52 }}>
                {[1.95, 2.08, 1.98, 2.15, 2.24, 2.31].map((val, i) => (
                  <motion.div
                    key={i}
                    style={{ flex: 1, background: C.blue, opacity: 0.75, borderRadius: '2px 2px 0 0', transformOrigin: 'bottom', height: `${((val - 1.8) / 0.65) * 100}%` }}
                    initial={{ scaleY: 0 }}
                    animate={inView ? { scaleY: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.06, ease: EASE }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'].map(m => (
                  <span key={m} style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)' }}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Audience section ──────────────────────────────────────────────────────────
function AudienceSection({ reduced }: { reduced: boolean }) {
  return (
    <ParallaxBg src={IMG.net} speed={0.3} overlay="rgba(7,24,48,0.72)" minHeight="auto">
      <section style={{ padding: '100px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeUp reduced={reduced}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.sky, textTransform: 'uppercase' }}>Who it&apos;s for</span>
              <h2 style={{ marginTop: 14, fontSize: 'clamp(26px, 4vw, 50px)', fontWeight: 800, color: C.white, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Built for both sides of the partnership
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            <FadeUp reduced={reduced}>
              <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 20, padding: '32px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: C.sky, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 100, padding: '5px 14px', marginBottom: 20 }}>
                  <Plane size={13} color={C.sky} /> For Airlines
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 12 }}>Systematic GSA procurement</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: 24 }}>
                  Replace ad-hoc GSA selection with a structured tender process. Define lanes, requirements, and timelines — then let qualified partners compete on merit.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Publish structured RFPs with lane, tonnage & product specs', 'AI-assisted GSA scoring across network, financial & compliance dimensions', 'Side-by-side application comparison with commission breakdown', 'Real-time performance tracking per GSA and per route', 'Capacity alert broadcast to GSA partners with one click'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <CheckCircle2 size={15} color={C.sky} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>

            <FadeUp reduced={reduced} delay={0.1}>
              <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 20, padding: '32px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#A78BFA', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 100, padding: '5px 14px', marginBottom: 20 }}>
                  <Building2 size={13} color="#A78BFA" /> For GSAs
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 12 }}>Discover & win airline mandates</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: 24 }}>
                  Stop chasing opportunity by email. Access a curated marketplace of open airline tenders, build a credible profile, and submit structured proposals that win.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Browse open airline tenders in your covered markets', 'Build a scored GSA profile visible to airline procurement teams', 'Submit structured proposals with network and commercial plans', 'Track active contract KPIs and benchmark against targets', 'Receive capacity hunt alerts from connected airlines'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <CheckCircle2 size={15} color="#A78BFA" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
    </ParallaxBg>
  );
}

// ── CTA section ───────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <ParallaxBg src={IMG.sky2} speed={0.4} overlay="rgba(7,24,48,0.72)" minHeight="80vh">
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 32px' }}>
        <ParallaxText speed={0.06}>
          <FadeUp>
            <div style={{ maxWidth: 640 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.sky, textTransform: 'uppercase', display: 'block', marginBottom: 20 }}>Take-off</span>
              <h2 style={{ fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 900, color: C.white, lineHeight: 0.97, letterSpacing: '-0.04em', marginBottom: 24 }}>
                Launch your{' '}
                <span style={{ color: C.sky }}>GSA network</span>
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto 44px' }}>
                AirGSA is invite-only during the current rollout. Request access and our team will review your application within 48 hours.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/signup" style={{ fontSize: 15, fontWeight: 700, color: 'white', background: C.blue, borderRadius: 12, padding: '16px 40px', textDecoration: 'none', boxShadow: '0 4px 32px rgba(26,90,255,0.45)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Book a demo <ArrowRight size={16} />
                </Link>
                <Link href="/signup" style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 12, padding: '16px 28px', textDecoration: 'none' }}>
                  Create account
                </Link>
                <Link href="/login" style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: '16px 20px', textDecoration: 'none' }}>
                  Log in
                </Link>
              </div>
              <p style={{ marginTop: 36, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                IATA-Aligned · GDP-Ready · CEIV-Compatible · SOC 2 In Progress
              </p>
            </div>
          </FadeUp>
        </ParallaxText>
      </div>
    </ParallaxBg>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.navyD, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 48px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.26em', textTransform: 'uppercase', color: C.sky }}>AirGSA</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>© 2026 AirGSA. Aviation cargo partnership infrastructure.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {([['Intelligence', '/news'], ['Login', '/login']] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div style={{ fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
      <Nav />
      <HeroSection       reduced={reduced} />
      <HowItWorksSection reduced={reduced} />
      <TenderSection     reduced={reduced} />
      <StatsBreak        reduced={reduced} />
      <ApplicationsSection reduced={reduced} />
      <FeaturesSection   reduced={reduced} />
      <PerformanceSection reduced={reduced} />
      <AudienceSection   reduced={reduced} />
      <CTASection />
      <Footer />
    </div>
  );
}
