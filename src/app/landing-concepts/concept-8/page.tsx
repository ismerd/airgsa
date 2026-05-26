'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

const IMG = {
  meet1:  '/landing/1/img-1.jpg',
  meet2:  '/landing/1/img-2.jpg',
  cargo1: '/landing/2/img-2.jpg',
  cargo2: '/landing/2/img-3.jpg',
  sky1:   '/landing/3/img-2.jpg',
  sky2:   '/landing/3/img-4.jpg',
  net1:   '/landing/4/img-1.jpg',
  net2:   '/landing/4/img-2.jpg',
};

const C = {
  bg:     '#050D1E',
  card:   '#0A1628',
  cardH:  '#0F1E38',
  blue:   '#3B82F6',
  blueD:  '#1A5AFF',
  sky:    '#60A5FA',
  cyan:   '#22D3EE',
  white:  '#FFFFFF',
  muted:  'rgba(255,255,255,0.45)',
  border: 'rgba(59,130,246,0.14)',
};

function Tile({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.97, y: 16 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '16px 40px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(5,13,30,0.92)',
      borderBottom: `1px solid ${C.border}`,
      backdropFilter: 'blur(20px)',
      fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase', color: C.blue }}>
        AirGSA
      </span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href="/login" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>Sign in</Link>
        <Link href="/signup" style={{
          fontSize: 12, fontWeight: 700, color: 'white',
          background: C.blueD, borderRadius: 8, padding: '8px 18px',
          textDecoration: 'none', boxShadow: '0 0 20px rgba(26,90,255,0.35)',
        }}>
          Get Access
        </Link>
      </div>
    </nav>
  );
}

export default function Concept8() {
  return (
    <div style={{ background: C.bg, fontFamily: 'var(--font-outfit, system-ui, sans-serif)', minHeight: '100vh' }}>
      <Nav />

      {/* Hero */}
      <div style={{ paddingTop: 120, paddingBottom: 80, textAlign: 'center', padding: '120px 32px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 100, padding: '7px 16px', marginBottom: 32,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.sky, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Now in Early Access
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: 'clamp(44px, 7vw, 96px)', fontWeight: 900, color: C.white,
            lineHeight: 0.98, letterSpacing: '-0.04em', maxWidth: 820, margin: '0 auto 28px',
          }}
        >
          Cargo tendering,<br />
          <span style={{
            background: `linear-gradient(135deg, ${C.sky} 0%, ${C.cyan} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            reimagined.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{ fontSize: 18, color: C.muted, maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.65 }}
        >
          The platform where airlines and GSAs find each other, work together, and grow cargo revenue — powered by AI.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center' }}
        >
          <Link href="/signup" style={{
            fontSize: 15, fontWeight: 700, color: 'white',
            background: `linear-gradient(135deg, ${C.blueD} 0%, ${C.blue} 100%)`,
            borderRadius: 12, padding: '15px 36px', textDecoration: 'none',
            boxShadow: '0 4px 32px rgba(59,130,246,0.35)',
          }}>
            Request Access →
          </Link>
          <Link href="#platform" style={{
            fontSize: 15, fontWeight: 600, color: C.sky,
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 12, padding: '15px 28px', textDecoration: 'none',
          }}>
            Explore platform
          </Link>
        </motion.div>
      </div>

      {/* Bento Grid */}
      <div id="platform" style={{ padding: '0 24px 96px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Row 1: large image (2/3) + two stat cards (1/3) */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
          <Tile delay={0} style={{ height: 360 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.sky1})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,13,30,0.95) 0%, rgba(5,13,30,0.3) 60%, transparent 100%)' }} />
            <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: C.sky, textTransform: 'uppercase', marginBottom: 10 }}>Live Network</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'white', lineHeight: 1.25 }}>
                120+ active cargo routes across Europe, Middle East & Asia
              </div>
            </div>
          </Tile>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Tile delay={0.05} style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: C.muted, textTransform: 'uppercase' }}>Tender Match Rate</div>
              <div>
                <div style={{ fontSize: 56, fontWeight: 900, color: C.sky, letterSpacing: '-0.03em', lineHeight: 1 }}>94%</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>GSAs matched within 48h</div>
              </div>
            </Tile>
            <Tile delay={0.1} style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: C.muted, textTransform: 'uppercase' }}>Revenue Uplift</div>
              <div>
                <div style={{ fontSize: 56, fontWeight: 900, color: C.cyan, letterSpacing: '-0.03em', lineHeight: 1 }}>4.2×</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>vs. direct airline selling</div>
              </div>
            </Tile>
          </div>
        </div>

        {/* Row 2: 3 equal columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <Tile delay={0.05} style={{ height: 260 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.meet1})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,13,30,0.6)' }} />
            <div style={{ position: 'absolute', inset: 0, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 6 }}>Partner with the best</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>80+ airlines trust AirGSA to find their cargo partners</div>
            </div>
          </Tile>

          <Tile delay={0.1} style={{ height: 260, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(59,130,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 20,
              }}>◈</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 10 }}>AI Tender Scoring</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
                Every GSA application is automatically ranked by revenue performance, market coverage, and financial health.
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>Learn more →</div>
          </Tile>

          <Tile delay={0.15} style={{ height: 260, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(34,211,238,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 20,
              }}>⬡</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 10 }}>Live Performance</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
                Real-time dashboards show cargo intake, booking trends, and SLA compliance across every active route.
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.cyan }}>View demo →</div>
          </Tile>
        </div>

        {/* Row 3: 1/3 airline list + 2/3 cargo image */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
          <Tile delay={0.05} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4 }}>Airlines on AirGSA</div>
            {['Saudia Cargo', 'Flydubai', 'Air Arabia', 'Jazeera Airways', 'Flynas'].map((a, i) => (
              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `hsl(${200 + i * 20}, 65%, ${25 + i * 4}%)`,
                  border: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.05em',
                }}>
                  {a.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: C.muted }}>{a}</span>
              </div>
            ))}
          </Tile>

          <Tile delay={0.1} style={{ minHeight: 280 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.cargo1})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,13,30,0.92) 0%, rgba(5,13,30,0.4) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', color: C.sky, textTransform: 'uppercase', marginBottom: 16 }}>Cargo Operations</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.2, maxWidth: 360, marginBottom: 20 }}>
                Every tonne tracked.<br />Every route optimized.
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 380 }}>
                340K+ tonnes managed annually. Full cargo lifecycle from booking intake to load factor reporting.
              </div>
            </div>
          </Tile>
        </div>

        {/* Row 4: 2 image tiles side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Tile delay={0} style={{ height: 260 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.net1})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,13,30,0.9) 0%, transparent 60%)' }} />
            <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 4 }}>Global reach</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Connecting cargo networks across 60+ countries</div>
            </div>
          </Tile>
          <Tile delay={0.08} style={{ height: 260 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${IMG.cargo2})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,13,30,0.9) 0%, transparent 60%)' }} />
            <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 4 }}>Seamless operations</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>From tender award to first flight — fully digital</div>
            </div>
          </Tile>
        </div>

        {/* Row 5: CTA full width */}
        <Tile delay={0.05} style={{
          padding: '64px 48px', textAlign: 'center',
          background: `linear-gradient(135deg, rgba(26,90,255,0.15) 0%, rgba(34,211,238,0.08) 100%)`,
          border: '1px solid rgba(59,130,246,0.2)',
        }}>
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>
              Ready to take off?
            </div>
            <div style={{ fontSize: 16, color: C.muted, marginBottom: 36, lineHeight: 1.6 }}>
              Join 80+ airlines and 400+ GSA partners. Built for the future of air cargo.
            </div>
            <Link href="/signup" style={{
              display: 'inline-block', fontSize: 15, fontWeight: 700, color: 'white',
              background: `linear-gradient(135deg, ${C.blueD} 0%, ${C.blue} 100%)`,
              borderRadius: 12, padding: '15px 40px', textDecoration: 'none',
              boxShadow: '0 4px 40px rgba(26,90,255,0.35)',
            }}>
              Request Early Access →
            </Link>
          </div>
        </Tile>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px 32px', textAlign: 'center' }}>
        <Link href="/landing-concepts" style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', textDecoration: 'none', letterSpacing: '0.1em' }}>
          ← All concepts
        </Link>
      </div>
    </div>
  );
}
