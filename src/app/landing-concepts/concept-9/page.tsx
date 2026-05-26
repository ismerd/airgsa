'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import Link from 'next/link';

// ── Images per scene ───────────────────────────────────────────────────────────
const IMG = {
  hero:   '/landing/3/img-1.jpg',  // takeoff — hero
  meet:   '/landing/1/img-2.jpg',  // meeting
  cargo:  '/landing/2/img-3.jpg',  // cargo
  net:    '/landing/4/img-1.jpg',  // network / scene 4
  sky2:   '/landing/3/img-3.jpg',  // sky — CTA
  meet2:  '/landing/1/img-1.jpg',
};

const C = {
  navy:   '#071830',
  blue:   '#1A5AFF',
  sky:    '#60A5FA',
  cyan:   '#22D3EE',
  white:  '#FFFFFF',
  offW:   '#F2F6FF',
  muted:  '#8099C0',
  gold:   '#F59E0B',
};

// ── Core parallax section ──────────────────────────────────────────────────────
// The background moves at `speed` fraction of the scroll speed.
// Extra inset gives the image room to travel without showing blank edges.
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
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const range = speed * 100;
  const y = useTransform(scrollYProgress, [0, 1], [`-${range}%`, `${range}%`]);

  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'hidden', minHeight }}>
      {/* Parallax image layer */}
      <motion.div style={{ position: 'absolute', inset: `-${range}% 0`, y, zIndex: 0 }}>
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: overlay }} />
      </motion.div>
      {/* Foreground */}
      <div style={{ position: 'relative', zIndex: 1, minHeight }}>{children}</div>
    </div>
  );
}

// ── Fade-up on scroll ──────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 44 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Parallax text (moves slightly faster than page = pops forward) ─────────────
function ParallaxText({
  children,
  speed = 0.08,
  style = {},
}: {
  children: React.ReactNode;
  speed?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `-${speed * 100}%`]);
  return (
    <motion.div ref={ref} style={{ y, ...style }}>
      {children}
    </motion.div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '18px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(7,24,48,0.9) 0%, transparent 100%)',
        fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.34em', textTransform: 'uppercase', color: C.sky }}>
        AirGSA
      </span>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Link href="/login" style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Sign in</Link>
        <Link
          href="/signup"
          style={{
            fontSize: 12, fontWeight: 700, color: 'white',
            background: C.blue, borderRadius: 8, padding: '9px 20px',
            textDecoration: 'none', boxShadow: '0 0 20px rgba(26,90,255,0.4)',
          }}
        >
          Request Access
        </Link>
      </div>
    </nav>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Concept9() {
  return (
    <div style={{ fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
      <Nav />

      {/* ── SCENE 1: HERO ─────────────────────────────────────────────────────── */}
      <ParallaxBg src={IMG.hero} speed={0.4} overlay="rgba(7,24,48,0.52)" minHeight="100svh">
        <div
          style={{
            minHeight: '100svh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '0 24px',
          }}
        >
          <ParallaxText speed={0.06}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28 }}
            >
              <div style={{ width: 40, height: 1, background: 'rgba(96,165,250,0.6)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.34em', color: C.sky, textTransform: 'uppercase' }}>
                Global GSA Platform
              </span>
              <div style={{ width: 40, height: 1, background: 'rgba(96,165,250,0.6)' }} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: 'clamp(52px, 9vw, 112px)', fontWeight: 900, color: C.white,
                lineHeight: 0.94, letterSpacing: '-0.04em', maxWidth: 900, margin: '0 auto 28px',
              }}
            >
              The future of<br />
              <span style={{ color: C.sky }}>cargo</span> is here.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 1.0 }}
              style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto 48px', lineHeight: 1.65 }}
            >
              Airlines and GSAs connect, tender, and grow together — powered by AI, built for aviation.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.25 }}
              style={{ display: 'flex', gap: 14, justifyContent: 'center' }}
            >
              <Link href="/signup" style={{
                fontSize: 14, fontWeight: 700, color: 'white',
                background: C.blue, borderRadius: 10, padding: '14px 32px',
                textDecoration: 'none', boxShadow: '0 4px 28px rgba(26,90,255,0.45)',
              }}>
                Request Access →
              </Link>
              <Link href="#story" style={{
                fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 10, padding: '14px 26px', textDecoration: 'none',
              }}>
                Scroll to explore
              </Link>
            </motion.div>
          </ParallaxText>
        </div>

        {/* Animated scroll hint */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}
        >
          <div style={{ width: 24, height: 40, borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 6 }}>
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 4, height: 8, borderRadius: 2, background: C.sky }}
            />
          </div>
        </motion.div>
      </ParallaxBg>

      {/* ── BREAK 1: white feature strip ──────────────────────────────────────── */}
      <div id="story" style={{ background: C.white, padding: '100px 48px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.blue, textTransform: 'uppercase' }}>
                Why AirGSA
              </span>
              <h2 style={{ marginTop: 14, fontSize: 'clamp(28px, 4vw, 50px)', fontWeight: 800, color: C.navy, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                One platform.<br />The entire cargo lifecycle.
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
            {[
              { n: '01', icon: '◈', title: 'Intelligent tendering', body: 'Airlines post route tenders. AI instantly scores every GSA applicant by revenue history, market coverage, and financial strength.', color: C.blue },
              { n: '02', icon: '⬡', title: 'Seamless award', body: 'Digital contract signing, territory activation, and SLA commitment — what used to take months now takes days.', color: C.sky },
              { n: '03', icon: '▲', title: 'Live performance', body: 'Real-time cargo intake dashboards, booking trend analytics, and market share benchmarking across every active route.', color: C.cyan },
            ].map((f, i) => (
              <FadeUp key={f.n} delay={i * 0.1}>
                <div style={{ borderTop: `3px solid ${f.color}`, paddingTop: 28 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase', marginBottom: 20 }}>
                    {f.n}
                  </div>
                  <div style={{ fontSize: 22, color: f.color, marginBottom: 16 }}>{f.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.75 }}>{f.body}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>

      {/* ── SCENE 2: MEETING ──────────────────────────────────────────────────── */}
      <ParallaxBg src={IMG.meet} speed={0.3} overlay="rgba(7,24,48,0.62)" minHeight="90vh">
        <div style={{ minHeight: '90vh', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
          {/* Left: floating stat card with its own parallax */}
          <div style={{ padding: 'clamp(48px, 6vw, 88px)' }}>
            <ParallaxText speed={0.05}>
              <FadeUp>
                <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '36px 36px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.28em', color: C.sky, textTransform: 'uppercase', marginBottom: 20 }}>
                    Live — Route FRA → JED
                  </div>
                  {[
                    { label: 'Current GSA', value: 'AeroLink MENA', tag: '✓ Active' },
                    { label: 'Monthly Cargo', value: '2,840 kg avg.' },
                    { label: 'Revenue Uplift', value: '+47% YoY', highlight: true },
                    { label: 'SLA Score', value: '98.2 / 100' },
                  ].map(row => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{row.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: row.highlight ? C.cyan : 'rgba(255,255,255,0.85)' }}>{row.value}</span>
                        {row.tag && <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.12)', borderRadius: 6, padding: '2px 8px' }}>{row.tag}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </ParallaxText>
          </div>

          {/* Right: headline */}
          <div style={{ padding: 'clamp(48px, 6vw, 88px)' }}>
            <ParallaxText speed={0.08}>
              <FadeUp delay={0.1}>
                <div style={{ width: 40, height: 2, background: C.sky, marginBottom: 28 }} />
                <h2 style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 800, color: C.white, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
                  Where great<br />partnerships begin.
                </h2>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 380 }}>
                  Airlines publish tenders, GSAs apply with one click. AI ranks every candidate by real performance data — not pitch decks. The best match wins.
                </p>
              </FadeUp>
            </ParallaxText>
          </div>
        </div>
      </ParallaxBg>

      {/* ── BREAK 2: dark stats strip ──────────────────────────────────────────── */}
      <div style={{ background: C.navy, padding: '80px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {[
            { v: '80+', l: 'Airline clients', c: C.sky },
            { v: '400+', l: 'GSA partners', c: C.cyan },
            { v: '340K+', l: 'Tonnes managed', c: C.sky },
            { v: '4.2×', l: 'Revenue uplift', c: C.gold },
          ].map((s, i) => (
            <FadeUp key={s.l} delay={i * 0.08}>
              <div style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 900, color: s.c, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.l}</div>
            </FadeUp>
          ))}
        </div>
      </div>

      {/* ── SCENE 3: CARGO ────────────────────────────────────────────────────── */}
      <ParallaxBg src={IMG.cargo} speed={0.35} overlay="rgba(7,24,48,0.65)" minHeight="90vh">
        <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', padding: '80px clamp(32px, 6vw, 96px)' }}>
          <ParallaxText speed={0.06}>
            <FadeUp>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.sky, textTransform: 'uppercase' }}>Operations</span>
              <h2 style={{ marginTop: 16, fontSize: 'clamp(32px, 5vw, 68px)', fontWeight: 900, color: C.white, lineHeight: 0.97, letterSpacing: '-0.04em', maxWidth: 640, marginBottom: 28 }}>
                Your GSA sells.<br />You stay in control.
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 480, marginBottom: 48 }}>
                Real-time cargo sales tracking, performance dashboards, and SLA monitoring — all in one platform. Your network works for you, with full visibility at every step.
              </p>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {[
                  { icon: '⊞', label: 'Live intake tracking' },
                  { icon: '◉', label: 'Weekly reports' },
                  { icon: '✦', label: 'SLA monitoring' },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: C.sky }}>
                      {f.icon}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
          </ParallaxText>
        </div>
      </ParallaxBg>

      {/* ── BREAK 3: white testimonial / trust ────────────────────────────────── */}
      <div style={{ background: C.offW, padding: '96px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <FadeUp>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 64, color: C.blue, lineHeight: 1, marginBottom: 12, opacity: 0.3, fontFamily: 'Georgia, serif' }}>{'"'}</div>
                <p style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 600, color: C.navy, lineHeight: 1.55, letterSpacing: '-0.015em', marginBottom: 28 }}>
                  AirGSA cut our tender process from 3 months to 11 days. The AI scoring gave us confidence we were choosing the right partner — not just the loudest one.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1A5AFF 0%, #003399 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white' }}>
                    SA
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Ahmed Al-Rashidi</div>
                    <div style={{ fontSize: 12, color: C.muted }}>VP Cargo, Saudia Cargo</div>
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Airlines on AirGSA
                </div>
                {['Saudia Cargo', 'Flydubai', 'Air Arabia', 'Jazeera Airways', 'Flynas', 'Air Algérie Cargo'].map((a, i) => (
                  <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `hsl(${210 + i * 18}, 70%, ${28 + i * 4}%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.04em', flexShrink: 0,
                    }}>
                      {a.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, color: C.navy, fontWeight: 500 }}>{a}</span>
                    <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#34D399' }} />
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </div>

      {/* ── SCENE 4: NETWORK ──────────────────────────────────────────────────── */}
      <ParallaxBg src={IMG.net} speed={0.3} overlay="rgba(7,24,48,0.70)" minHeight="80vh">
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 32px' }}>
          <ParallaxText speed={0.07}>
            <FadeUp>
              <div style={{ maxWidth: 700 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: C.cyan, textTransform: 'uppercase' }}>Global Network</span>
                <h2 style={{ marginTop: 16, fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 900, color: C.white, lineHeight: 1.05, letterSpacing: '-0.035em', marginBottom: 24 }}>
                  60+ countries.<br />One platform.
                </h2>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 48px' }}>
                  AirGSA connects cargo networks across Europe, the Middle East, Asia, and Africa — with new routes and partners added every week.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['FRA → JED', 'DXB → SIN', 'IST → RUH', 'LHR → DXB', 'CAI → FRA'].map(route => (
                    <div key={route} style={{
                      fontSize: 12, fontWeight: 700, color: C.sky,
                      background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)',
                      borderRadius: 100, padding: '7px 16px',
                    }}>
                      {route}
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </ParallaxText>
        </div>
      </ParallaxBg>

      {/* ── SCENE 5: CTA ──────────────────────────────────────────────────────── */}
      <ParallaxBg src={IMG.sky2} speed={0.4} overlay="rgba(7,24,48,0.72)" minHeight="80vh">
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 32px' }}>
          <ParallaxText speed={0.06}>
            <FadeUp>
              <div style={{ maxWidth: 600 }}>
                <h2 style={{ fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 900, color: C.white, lineHeight: 0.97, letterSpacing: '-0.04em', marginBottom: 24 }}>
                  Ready to<br />
                  <span style={{ color: C.sky }}>take off?</span>
                </h2>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 44 }}>
                  Join 80+ airlines and 400+ GSA partners already using AirGSA to grow their cargo network.
                </p>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
                  <Link href="/signup" style={{
                    fontSize: 15, fontWeight: 700, color: 'white',
                    background: C.blue, borderRadius: 12, padding: '16px 40px',
                    textDecoration: 'none', boxShadow: '0 4px 32px rgba(26,90,255,0.45)',
                    letterSpacing: '0.02em',
                  }}>
                    Request Early Access →
                  </Link>
                  <Link href="/login" style={{
                    fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 12, padding: '16px 28px', textDecoration: 'none',
                  }}>
                    Sign in
                  </Link>
                </div>
              </div>
            </FadeUp>
          </ParallaxText>
        </div>
      </ParallaxBg>

      {/* ── Dev footer ────────────────────────────────────────────────────────── */}
      <div style={{ background: C.navy, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 32px', textAlign: 'center' }}>
        <Link href="/landing-concepts" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: '0.1em' }}>
          ← All concepts
        </Link>
      </div>
    </div>
  );
}
