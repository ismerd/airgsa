'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

const IMG = {
  hero:   '/landing/3/img-3.jpg',
  meet1:  '/landing/1/img-1.jpg',
  meet2:  '/landing/1/img-3.jpg',
  cargo1: '/landing/2/img-1.jpg',
  cargo2: '/landing/2/img-4.jpg',
  sky2:   '/landing/3/img-4.jpg',
};

const C = {
  white:  '#FFFFFF',
  bg:     '#F4F7FF',
  blue:   '#1A5AFF',
  blueD:  '#0F3DBF',
  blueL:  '#E8F0FF',
  sky:    '#60A5FA',
  ink:    '#0A1228',
  muted:  '#6B7DA0',
};

type Direction = 'up' | 'left' | 'right';

function Reveal({ children, delay = 0, dir = 'up' as Direction }: { children: React.ReactNode; delay?: number; dir?: Direction }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: dir === 'up' ? 32 : 0, x: dir === 'left' ? -40 : dir === 'right' ? 40 : 0 }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '18px 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.96)',
      borderBottom: '1px solid rgba(26,90,255,0.08)',
      backdropFilter: 'blur(16px)',
      fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.blue }}>
        AirGSA
      </span>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        {['Product', 'Airlines', 'GSAs', 'Pricing'].map(item => (
          <Link key={item} href="#" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>{item}</Link>
        ))}
        <Link href="/signup" style={{
          fontSize: 13, fontWeight: 700, color: C.white,
          background: C.blue, borderRadius: 8, padding: '9px 20px',
          textDecoration: 'none', marginLeft: 8,
          boxShadow: '0 2px 16px rgba(26,90,255,0.25)',
        }}>
          Get Started
        </Link>
      </div>
    </nav>
  );
}

export default function Concept7() {
  return (
    <div style={{ background: C.white, fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
      <Nav />

      {/* Hero — split left text / right image */}
      <div style={{ minHeight: '100svh', display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 72, overflow: 'hidden' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(48px, 6vw, 96px)' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.blueL, borderRadius: 100, padding: '6px 14px', width: 'fit-content', marginBottom: 32 }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              AI-Powered GSA Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: 'clamp(36px, 4.5vw, 60px)', fontWeight: 900,
              color: C.ink, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 24,
            }}
          >
            The smarter way<br />to build a<br />
            <span style={{ color: C.blue }}>cargo network.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.75 }}
            style={{ fontSize: 17, color: C.muted, lineHeight: 1.7, maxWidth: 420, marginBottom: 40 }}
          >
            AirGSA replaces fragmented email tenders with an intelligent platform where airlines find the best GSA — and GSAs win more mandates.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            style={{ display: 'flex', gap: 12 }}
          >
            <Link href="/signup" style={{
              fontSize: 15, fontWeight: 700, color: C.white,
              background: C.blue, borderRadius: 10, padding: '14px 28px',
              textDecoration: 'none', boxShadow: '0 4px 24px rgba(26,90,255,0.30)',
            }}>
              Start for free →
            </Link>
            <Link href="#demo" style={{
              fontSize: 15, fontWeight: 600, color: C.ink,
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10, padding: '14px 24px', textDecoration: 'none',
            }}>
              Watch demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.3 }}
            style={{ marginTop: 52, display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ display: 'flex' }}>
              {['SA', 'LH', 'EK', 'QR', 'TK'].map((code, i) => (
                <div key={code} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `hsl(${210 + i * 15}, 70%, ${30 + i * 5}%)`,
                  border: '2px solid white', marginLeft: i > 0 ? -10 : 0, zIndex: 5 - i,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 800, color: 'white',
                }}>
                  {code}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: C.muted }}>
              Trusted by <strong style={{ color: C.ink }}>80+ airlines</strong> globally
            </span>
          </motion.div>
        </div>

        {/* Right image */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${IMG.hero})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(255,255,255,0.12) 0%, transparent 30%)' }} />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.2 }}
            style={{
              position: 'absolute', bottom: 60, left: -28,
              background: 'white', borderRadius: 16, padding: '20px 24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)', minWidth: 200,
            }}
          >
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Route FRA → JED</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: '-0.02em' }}>+47%</div>
            <div style={{ fontSize: 12, color: C.sky, marginTop: 2 }}>Revenue uplift this quarter</div>
          </motion.div>
        </motion.div>
      </div>

      {/* Stats strip */}
      <div style={{ background: C.blue, padding: '48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {[
            { v: '80+', l: 'Airline clients' },
            { v: '400+', l: 'GSA partners' },
            { v: '120+', l: 'Active routes' },
            { v: '94%', l: 'Tender match rate' },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 0.08}>
              <div style={{ fontSize: 38, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.v}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.l}</div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* 3-step how it works */}
      <div style={{ padding: '96px 48px', background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', color: C.blue, textTransform: 'uppercase' }}>How it works</span>
              <h2 style={{ marginTop: 12, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: C.ink, letterSpacing: '-0.025em' }}>
                From tender to takeoff.<br />In three steps.
              </h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {[
              { n: '01', title: 'Publish your tender', body: 'Airlines create a route tender in minutes. Set cargo requirements, territories, and performance targets.', img: IMG.meet1 },
              { n: '02', title: 'AI matches GSAs', body: 'Our AI scores every applicant on revenue history, market coverage, and financial capacity. Ranked candidates — not a pile of PDFs.', img: IMG.cargo1 },
              { n: '03', title: 'Award & activate', body: 'Digital contract signing, territory handover, and live dashboard activation — your new GSA is operational in days.', img: IMG.sky2 },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <div style={{ background: C.white, borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(26,90,255,0.06)' }}>
                  <div style={{ position: 'relative', height: 220 }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${step.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,18,40,0.35)' }} />
                    <div style={{
                      position: 'absolute', top: 20, left: 20,
                      width: 40, height: 40, borderRadius: '50%',
                      background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: 'white',
                    }}>
                      {step.n}
                    </div>
                  </div>
                  <div style={{ padding: '28px 28px 32px' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{step.title}</h3>
                    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Full-bleed image section */}
      <div style={{ position: 'relative', minHeight: 480, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.cargo2})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,18,40,0.90) 0%, rgba(10,18,40,0.55) 60%, rgba(10,18,40,0.20) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '80px clamp(32px, 6vw, 80px)', maxWidth: 600 }}>
          <Reveal dir="left">
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', color: C.sky, textTransform: 'uppercase' }}>Live Platform Data</span>
            <h2 style={{ marginTop: 16, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: 'white', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              Real-time cargo<br />performance. Always on.
            </h2>
            <p style={{ marginTop: 20, fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 420 }}>
              Track bookings, revenue attribution, and market share across all active GSA partners — updated every 15 minutes, integrated with your cargo system.
            </p>
            <Link href="/signup" style={{
              display: 'inline-block', marginTop: 32, fontSize: 14, fontWeight: 700,
              color: 'white', background: C.blue, borderRadius: 10, padding: '14px 28px',
              textDecoration: 'none', boxShadow: '0 4px 24px rgba(26,90,255,0.4)',
            }}>
              See live demo →
            </Link>
          </Reveal>
        </div>
      </div>

      {/* Meet image section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 440 }}>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.meet2})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,90,255,0.15)' }} />
        </div>
        <div style={{ background: C.blueL, padding: 'clamp(48px, 6vw, 80px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Reveal dir="right">
            <div style={{ width: 36, height: 3, background: C.blue, borderRadius: 2, marginBottom: 24 }} />
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, color: C.ink, letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 16 }}>
              For Airlines.<br />For GSAs.<br />For growth.
            </h2>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, maxWidth: 380, marginBottom: 32 }}>
              Whether you&apos;re an airline seeking the best cargo representation or a GSA building your airline portfolio — AirGSA is the platform that makes it happen.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/signup" style={{ fontSize: 13, fontWeight: 700, color: 'white', background: C.blue, borderRadius: 8, padding: '10px 20px', textDecoration: 'none' }}>
                For Airlines
              </Link>
              <Link href="/signup" style={{ fontSize: 13, fontWeight: 700, color: C.blue, background: 'white', border: `1.5px solid ${C.blue}`, borderRadius: 8, padding: '10px 20px', textDecoration: 'none' }}>
                For GSAs
              </Link>
            </div>
          </Reveal>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '96px 48px', background: C.white, textAlign: 'center' }}>
        <Reveal>
          <div style={{ maxWidth: 580, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 900, color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
              Take your network<br />to new heights.
            </h2>
            <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.7, marginBottom: 40 }}>
              Join the growing list of forward-thinking airlines and GSAs building the future of cargo on AirGSA.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/signup" style={{
                fontSize: 15, fontWeight: 700, color: 'white',
                background: C.blue, borderRadius: 10, padding: '15px 36px',
                textDecoration: 'none', boxShadow: '0 4px 24px rgba(26,90,255,0.30)',
              }}>
                Request access →
              </Link>
              <Link href="/login" style={{
                fontSize: 15, fontWeight: 600, color: C.muted,
                border: '1.5px solid rgba(0,0,0,0.1)',
                borderRadius: 10, padding: '15px 28px', textDecoration: 'none',
              }}>
                Sign in
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      <div style={{ background: C.bg, borderTop: '1px solid rgba(0,0,0,0.06)', padding: '20px 32px', textAlign: 'center' }}>
        <Link href="/landing-concepts" style={{ fontSize: 11, color: C.muted, textDecoration: 'none', letterSpacing: '0.1em' }}>
          ← All concepts
        </Link>
      </div>
    </div>
  );
}
