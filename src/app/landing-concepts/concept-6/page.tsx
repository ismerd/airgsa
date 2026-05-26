'use client';

import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';

const IMG = {
  hero:   '/landing/3/img-1.jpg',
  meet:   '/landing/1/img-2.jpg',
  cargo:  '/landing/2/img-3.jpg',
  sky:    '/landing/3/img-3.jpg',
  cta:    '/landing/4/img-1.jpg',
};

const C = {
  navy:  '#08152E',
  navy2: '#0C1E3E',
  navyD: '#050D1C',
  gold:  '#C9A84C',
  goldL: '#E8C96E',
  white: '#FFFFFF',
  muted: 'rgba(242,238,234,0.55)',
};

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '20px 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(to bottom, rgba(8,21,46,0.95) 0%, transparent 100%)',
      fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.35em', textTransform: 'uppercase', color: C.gold }}>
        AirGSA
      </span>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link href="/login" style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Sign in</Link>
        <Link href="/signup" style={{
          fontSize: 12, fontWeight: 700, color: C.navy,
          background: C.gold, borderRadius: 6, padding: '9px 20px', textDecoration: 'none', letterSpacing: '0.05em',
        }}>
          Request Access
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '100svh', overflow: 'hidden' }}>
      <motion.div style={{ position: 'absolute', inset: '-15% 0', y }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${IMG.hero})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(8,21,46,0.82) 0%, rgba(8,21,46,0.55) 50%, rgba(8,21,46,0.80) 100%)' }} />
      </motion.div>

      <motion.div style={{
        position: 'absolute', inset: 0, opacity,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 24px',
        fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}
        >
          <div style={{ width: 32, height: 1, background: C.gold }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', color: C.gold, textTransform: 'uppercase' }}>
            Global GSA Platform
          </span>
          <div style={{ width: 32, height: 1, background: C.gold }} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: 'clamp(42px, 7vw, 88px)', fontWeight: 900, color: C.white,
            lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 24, maxWidth: 800,
          }}
        >
          Your Cargo Network.<br />
          <span style={{ color: C.goldL }}>Elevated.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', maxWidth: 520, lineHeight: 1.65, marginBottom: 44 }}
        >
          AirGSA connects airlines with world-class GSA partners — powered by AI-driven tendering, real-time route intelligence, and transparent performance analytics.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          style={{ display: 'flex', gap: 16 }}
        >
          <Link href="/signup" style={{
            fontSize: 14, fontWeight: 700, color: C.navy,
            background: C.gold, borderRadius: 8, padding: '14px 32px', textDecoration: 'none', letterSpacing: '0.04em',
          }}>
            Request Access
          </Link>
          <Link href="#how" style={{
            fontSize: 14, fontWeight: 600, color: C.white,
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 8, padding: '14px 28px', textDecoration: 'none', letterSpacing: '0.04em',
          }}>
            See How It Works
          </Link>
        </motion.div>
      </motion.div>

      <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'system-ui' }}>Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(201,168,76,0.6), transparent)' }}
        />
      </div>
    </div>
  );
}

function StatNum({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
        style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 900, color: C.goldL, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'system-ui' }}
      >
        {value}
      </motion.div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'system-ui' }}>
        {label}
      </div>
    </div>
  );
}

function ImageSection({ img, title, body, flip = false }: { img: string; title: string; body: string; flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const imgDiv = (
    <motion.div
      initial={{ opacity: 0, x: flip ? 40 : -40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'relative', minHeight: 520 }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,21,46,0.22)' }} />
    </motion.div>
  );
  const textDiv = (
    <motion.div
      initial={{ opacity: 0, x: flip ? -40 : 40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      style={{
        background: C.navy2, padding: 'clamp(48px, 6vw, 88px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
      }}
    >
      <div style={{ width: 40, height: 2, background: C.gold, marginBottom: 28 }} />
      <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: C.white, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 20 }}>
        {title}
      </h2>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 420, marginBottom: 36 }}>
        {body}
      </p>
      <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: C.goldL, textDecoration: 'none', letterSpacing: '0.05em' }}>
        Learn more →
      </Link>
    </motion.div>
  );
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 520, overflow: 'hidden' }}>
      {flip ? <>{textDiv}{imgDiv}</> : <>{imgDiv}{textDiv}</>}
    </div>
  );
}

export default function Concept6() {
  return (
    <div style={{ background: C.navy, fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
      <Nav />
      <Hero />

      {/* Stats bar */}
      <div style={{ background: C.navyD, borderTop: '1px solid rgba(201,168,76,0.15)', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '56px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
          <FadeUp delay={0}><StatNum value="80+" label="Airlines worldwide" /></FadeUp>
          <FadeUp delay={0.1}><StatNum value="340K+" label="Tonnes managed p.a." /></FadeUp>
          <FadeUp delay={0.2}><StatNum value="4.2×" label="Revenue uplift" /></FadeUp>
        </div>
      </div>

      {/* Image sections */}
      <div id="how">
        <ImageSection
          img={IMG.meet}
          title="Where cargo partnerships begin"
          body="Airlines publish tenders directly on AirGSA. GSA applicants receive instant AI scoring and transparent ranking — no email chains, no guesswork. The right partner, faster."
        />
        <ImageSection
          img={IMG.cargo}
          flip
          title="Your GSA sells. You stay in control."
          body="Real-time cargo sales tracking, performance dashboards, and SLA monitoring — all in one platform. Your network works for you, with full visibility."
        />
      </div>

      {/* Feature grid */}
      <div style={{ background: C.navyD, padding: '96px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', color: C.gold, textTransform: 'uppercase' }}>Platform Features</span>
              <h2 style={{ marginTop: 16, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: C.white, letterSpacing: '-0.02em' }}>
                Everything you need.<br />Nothing you don&apos;t.
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {[
              { icon: '◈', title: 'AI Tender Scoring', body: 'Automatic GSA ranking by revenue performance, network coverage and financial stability.' },
              { icon: '⊞', title: 'Live Route Dashboard', body: 'FRA → JED, DXB, SIN and 60+ routes tracked in real-time with revenue attribution.' },
              { icon: '▲', title: 'Award & Contracting', body: 'Digital contract signing, territory handover, and SLA commitment — in days, not months.' },
              { icon: '◉', title: 'Performance Analytics', body: 'Weekly cargo intake reports, booking trend analysis and market share benchmarking.' },
              { icon: '⬡', title: 'Multi-Airline Portfolio', body: 'GSAs manage all airline mandates from a single workspace — no tool-switching.' },
              { icon: '✦', title: 'Secure & Compliant', body: 'ISO 27001-ready data handling, audit trail for every contract and amendment.' },
            ].map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.07}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)',
                  padding: '32px 28px', fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
                }}>
                  <div style={{ fontSize: 20, color: C.gold, marginBottom: 16 }}>{f.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 10 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{f.body}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>

      {/* CTA full bleed */}
      <div style={{ position: 'relative', padding: '120px 48px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.cta})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,21,46,0.85)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 600, margin: '0 auto', fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
          <FadeUp>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, color: C.white, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 20 }}>
              Ready to take off?
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 40 }}>
              Join 80+ airlines and 400 GSA partners already using AirGSA to grow their cargo network.
            </p>
            <Link href="/signup" style={{
              display: 'inline-block', fontSize: 15, fontWeight: 700,
              color: C.navy, background: C.gold,
              borderRadius: 10, padding: '16px 40px', textDecoration: 'none',
              boxShadow: '0 4px 32px rgba(201,168,76,0.35)', letterSpacing: '0.04em',
            }}>
              Request Early Access →
            </Link>
          </FadeUp>
        </div>
      </div>

      <div style={{ background: '#030609', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 32px', textAlign: 'center' }}>
        <Link href="/landing-concepts" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: '0.1em' }}>
          ← All concepts
        </Link>
      </div>
    </div>
  );
}
