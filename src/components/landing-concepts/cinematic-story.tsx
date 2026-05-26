'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// ─── Aviation palette — sky blue, bright, premium ─────────────────────────────
// NOT dark/black — deep sky navy transitioning to sunrise
const P = {
  hero:     '#001A6E',       // deep aviation navy (clearly blue, not black)
  hero2:    '#003399',       // mid navy
  scene2bg: '#002266',       // meeting scene base
  scene3bg: '#001A3E',       // cargo scene base
  ctabg:    '#000D2A',       // takeoff CTA base
  brand:    '#3B82F6',       // bright sky blue
  sky:      '#60A5FA',       // lighter sky
  skyLight: '#BAD9FF',       // horizon
  white:    '#FFFFFF',
  cloud:    'rgba(255,255,255,0.08)',
  orange:   '#F97316',       // sunrise/CTA accent
  amber:    '#FB923C',
  success:  '#34D399',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function wordSpans(text: string) {
  return text.split(' ').map((w, i) => (
    <span
      key={i}
      className="word"
      style={{ display: 'inline-block', marginRight: '0.26em', willChange: 'transform, opacity' }}
    >
      {w}
    </span>
  ));
}

// ─── Scroll progress bar (fixed, top) ────────────────────────────────────────
function ProgressBar() {
  return (
    <div
      id="progress-track"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 300,
        background: 'rgba(255,255,255,0.08)',
        pointerEvents: 'none',
      }}
    >
      <div
        id="progress-fill"
        style={{
          height: '100%',
          width: '100%',
          background: `linear-gradient(to right, ${P.brand}, ${P.orange})`,
          transformOrigin: 'left center',
          transform: 'scaleX(0)',
        }}
      />
    </div>
  );
}

// ─── Floating ambient particles (hero) ───────────────────────────────────────
const PARTICLES = [
  { cx: 12, cy: 22, r: 1.6 }, { cx: 28, cy: 55, r: 1.2 }, { cx: 45, cy: 14, r: 2 },
  { cx: 62, cy: 40, r: 1.4 }, { cx: 78, cy: 70, r: 1.8 }, { cx: 88, cy: 30, r: 1 },
  { cx: 18, cy: 75, r: 1.5 }, { cx: 55, cy: 82, r: 1.1 }, { cx: 92, cy: 58, r: 1.7 },
  { cx: 35, cy: 33, r: 1.3 }, { cx: 70, cy: 18, r: 2.2 }, { cx: 5,  cy: 48, r: 1 },
];

function Particles() {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      {PARTICLES.map((p, i) => (
        <circle
          key={i}
          className="particle"
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill={P.skyLight}
          opacity={0.3}
        />
      ))}
    </svg>
  );
}

// ─── Connection animation — Airline + GSA nodes merging ──────────────────────
function ConnectionViz() {
  return (
    <div
      id="connection-viz"
      style={{
        position: 'relative',
        height: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        marginBottom: 36,
        opacity: 0,
      }}
    >
      {/* Airline node */}
      <div
        id="node-airline"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 40,
          border: `1px solid rgba(96,165,250,0.35)`,
          background: 'rgba(59,130,246,0.12)',
          padding: '8px 16px',
          transform: 'translateX(-60px)',
          opacity: 0,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `linear-gradient(135deg, ${P.brand}, ${P.sky})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: P.skyLight, letterSpacing: '0.08em' }}>Airline</span>
      </div>

      {/* Connecting line / pulse */}
      <div
        id="connect-line"
        style={{
          flex: '0 0 80px',
          height: 1,
          background: `linear-gradient(to right, ${P.brand}, ${P.orange})`,
          opacity: 0,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div
          id="connect-dot"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: P.orange,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 8px ${P.orange}`,
          }}
        />
      </div>

      {/* GSA node */}
      <div
        id="node-gsa"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 40,
          border: `1px solid rgba(249,115,22,0.35)`,
          background: 'rgba(249,115,22,0.1)',
          padding: '8px 16px',
          transform: 'translateX(60px)',
          opacity: 0,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `linear-gradient(135deg, ${P.orange}, ${P.amber})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#FED7AA', letterSpacing: '0.08em' }}>GSA</span>
      </div>
    </div>
  );
}

// ─── Image scene background ───────────────────────────────────────────────────
function SceneBg({
  id,
  gradient,
  src,
  overlay,
  promptLabel,
  prompt,
}: {
  id: string;
  gradient: string;
  src?: string;
  overlay: string;
  promptLabel: string;
  prompt: string;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        id={id}
        style={{ position: 'absolute', inset: '-8% 0', willChange: 'transform' }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            aria-hidden
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: gradient }} />
        )}
      </div>
      {/* Directional overlay — blue-tinted, lighter than before */}
      <div style={{ position: 'absolute', inset: 0, background: overlay }} />
      {/* Dev label */}
      {!src && (
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 20,
          background: 'rgba(0,10,40,0.82)', border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 10, padding: '10px 14px', maxWidth: 300,
          backdropFilter: 'blur(8px)',
        }}>
          <p style={{ color: '#FCD34D', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 5 }}>
            📸 Image placeholder
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{promptLabel}</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{prompt}</p>
          <p style={{ color: '#FCD34D', fontSize: 9, marginTop: 6, opacity: 0.6, fontStyle: 'italic' }}>
            → /public/landing/{id.replace('-bg', '')}.jpg
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Scene number indicator (side) ───────────────────────────────────────────
function SceneNumber({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(59,130,246,0.15)',
        border: `1px solid rgba(59,130,246,0.3)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: P.sky, fontFamily: 'monospace' }}>{num}</span>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: P.sky, letterSpacing: '0.28em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Workflow (scene 2) ───────────────────────────────────────────────────────
function Workflow() {
  const steps = [
    { label: 'Airline publishes structured tender', done: true },
    { label: 'GSAs discover & submit proposals', done: true },
    { label: 'AI scores every application instantly', done: true },
    { label: 'Award decision & contract activation', active: true },
  ];
  return (
    <div className="workflow-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {steps.map(({ label, done, active }, i) => (
        <div
          key={label}
          className={`wf-item wf-${i}`}
          style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0, transform: 'translateX(-24px)' }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: active ? P.orange : done ? 'rgba(96,165,250,0.25)' : 'transparent',
            border: `1.5px solid ${active ? P.orange : done ? P.sky : 'rgba(255,255,255,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {(done || active) && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
          {/* Connector */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <span style={{
              fontSize: 12.5,
              fontWeight: active ? 700 : 500,
              color: active ? 'white' : 'rgba(255,255,255,0.52)',
              lineHeight: 1.4,
            }}>
              {label}
            </span>
            {active && (
              <span style={{
                flexShrink: 0,
                fontSize: 9, fontWeight: 700, color: P.orange,
                background: 'rgba(249,115,22,0.15)',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: 20, padding: '2px 8px',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Live
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Animated KPI cards (scene 3) ─────────────────────────────────────────────
function KpiCards() {
  const kpis = [
    { value: '91/100', label: 'Top GSA AI score', color: P.success },
    { value: '180t', label: '/month contracted', color: P.sky },
    { value: '< 48h', label: 'Tender to application', color: P.orange },
    { value: '$2.44', label: 'Avg. yield per kg', color: P.skyLight },
  ];
  return (
    <div className="kpi-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, opacity: 0, transform: 'translateY(24px)' }}>
      {kpis.map(({ value, label, color }) => (
        <div key={label} style={{
          background: 'rgba(0,10,40,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14,
          padding: '14px 16px',
          backdropFilter: 'blur(12px)',
        }}>
          <p style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.03em', marginBottom: 4 }}>{value}</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Route pill (scene 3) ─────────────────────────────────────────────────────
function RoutePills() {
  const routes = [
    { from: 'FRA', to: 'JED', gsa: 'AeroLink', status: 'Active' },
    { from: 'JED', to: 'LHR', gsa: 'PrimeAir', status: 'Active' },
    { from: 'IST', to: 'DXB', gsa: 'SkyTrade', status: 'Review' },
  ];
  return (
    <div className="route-pills" style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0 }}>
      {routes.map(({ from, to, gsa, status }, i) => (
        <div
          key={from + to}
          className={`route-pill route-pill-${i}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(0,10,40,0.55)',
            border: '1px solid rgba(59,130,246,0.18)',
            borderRadius: 10, padding: '9px 14px',
            backdropFilter: 'blur(10px)',
            opacity: 0, transform: 'translateX(20px)',
          }}
        >
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: P.sky, minWidth: 26 }}>{from}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: 'white', minWidth: 26 }}>{to}</span>
          <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{gsa} GSA</span>
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: status === 'Active' ? P.success : P.orange,
            background: status === 'Active' ? 'rgba(52,211,153,0.1)' : 'rgba(249,115,22,0.1)',
            border: `1px solid ${status === 'Active' ? 'rgba(52,211,153,0.25)' : 'rgba(249,115,22,0.25)'}`,
            borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CinematicStory({ images = {} }: { images?: { meeting?: string; cargo?: string; takeoff?: string } }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // ── Scroll progress bar ──────────────────────────────────
    gsap.to('#progress-fill', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      },
    });

    // ── Ambient particle drift ───────────────────────────────
    gsap.to('.particle', {
      y: 'random(-35, 35)',
      x: 'random(-20, 20)',
      opacity: 'random(0.1, 0.55)',
      duration: 'random(4, 9)',
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: { amount: 5, from: 'random' },
    });

    // ── Hero entrance ────────────────────────────────────────
    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    heroTl
      .to('#connection-viz', { opacity: 1, duration: 0.01, delay: 0.2 })
      .from('#node-airline', { x: -80, opacity: 0, duration: 1 }, 0.25)
      .from('#node-gsa', { x: 80, opacity: 0, duration: 1 }, 0.25)
      .from('#connect-line', { scaleX: 0, opacity: 0, transformOrigin: 'left center', duration: 0.6 }, 0.9)
      .to('#connect-dot', { x: 80, ease: 'power2.inOut', duration: 0.5 }, 1.1)
      .from('#hero-tag', { y: 16, opacity: 0, duration: 0.7 }, 1.35)
      .from('#hero-h1 .word', { y: 56, opacity: 0, stagger: 0.07, duration: 0.8 }, 1.55)
      .from('#hero-sub', { y: 22, opacity: 0, duration: 0.7 }, 2.1)
      .from('#hero-cta', { y: 18, opacity: 0, duration: 0.6 }, 2.35)
      .from('#hero-scroll', { opacity: 0, duration: 0.8 }, 2.7);

    // ── Scene 2: Meeting ─────────────────────────────────────
    if (document.getElementById('scene-2-spacer')) {
      const s2 = gsap.timeline({
        scrollTrigger: { trigger: '#scene-2-spacer', start: 'top top', end: 'bottom bottom', scrub: 1.2 },
      });
      s2
        .from('#bg-meeting', { yPercent: -8, scale: 1.12, ease: 'none' }, 0)
        .from('#s2-num', { y: 28, opacity: 0 }, 0.05)
        .from('#s2-h2 .word', { y: 50, opacity: 0, stagger: 0.035 }, 0.15)
        .from('#s2-body', { y: 24, opacity: 0 }, 0.38)
        .to('.workflow-wrap', { opacity: 1, duration: 0.01 }, 0.5)
        .to('.wf-0', { opacity: 1, x: 0, duration: 0.05 }, 0.52)
        .to('.wf-1', { opacity: 1, x: 0, duration: 0.05 }, 0.62)
        .to('.wf-2', { opacity: 1, x: 0, duration: 0.05 }, 0.72)
        .to('.wf-3', { opacity: 1, x: 0, duration: 0.05 }, 0.82);
    }

    // ── Scene 3: Cargo ───────────────────────────────────────
    if (document.getElementById('scene-3-spacer')) {
      const s3 = gsap.timeline({
        scrollTrigger: { trigger: '#scene-3-spacer', start: 'top top', end: 'bottom bottom', scrub: 1.2 },
      });
      s3
        .from('#bg-cargo', { yPercent: -8, scale: 1.12, ease: 'none' }, 0)
        .from('#s3-num', { y: 28, opacity: 0 }, 0.06)
        .from('#s3-h2 .word', { y: 50, opacity: 0, stagger: 0.035 }, 0.16)
        .from('#s3-body', { y: 24, opacity: 0 }, 0.37)
        .to('.kpi-wrap', { opacity: 1, y: 0, duration: 0.05 }, 0.5)
        .from('.kpi-wrap > div', { y: 18, opacity: 0, stagger: 0.07 }, 0.52)
        .to('.route-pills', { opacity: 1, duration: 0.01 }, 0.72)
        .to('.route-pill-0', { opacity: 1, x: 0, duration: 0.05 }, 0.74)
        .to('.route-pill-1', { opacity: 1, x: 0, duration: 0.05 }, 0.82)
        .to('.route-pill-2', { opacity: 1, x: 0, duration: 0.05 }, 0.90);
    }

    // ── Scene 4: Takeoff CTA ─────────────────────────────────
    if (document.getElementById('scene-4-spacer')) {
      const s4 = gsap.timeline({
        scrollTrigger: { trigger: '#scene-4-spacer', start: 'top top', end: 'bottom bottom', scrub: 1.0 },
      });
      s4
        .from('#bg-takeoff', { yPercent: -10, scale: 1.15, ease: 'none' }, 0)
        .from('#s4-tag', { y: 20, opacity: 0 }, 0.12)
        .from('#s4-h2', { y: 60, opacity: 0, scale: 0.97 }, 0.22)
        .from('#s4-sub', { y: 30, opacity: 0 }, 0.42)
        .from('#s4-cta', { y: 28, opacity: 0 }, 0.58)
        .from('#s4-trust', { opacity: 0 }, 0.74);
    }
  }, { scope: rootRef });

  const font = 'var(--font-outfit, system-ui, sans-serif)';

  return (
    <div ref={rootRef} style={{ background: P.hero, fontFamily: font, overflowX: 'hidden' }}>
      <ProgressBar />

      {/* ═══════════════════════════════════════════════════════════
          HERO — aviation blue, connection animation, airy
      ═══════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        height: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${P.hero} 0%, ${P.hero2} 55%, #004299 100%)`,
      }}>
        {/* Sky gradient layers */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 55% at 50% 100%, rgba(59,130,246,0.22) 0%, transparent 65%)',
        }}/>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(96,165,250,0.12) 0%, transparent 60%)',
        }}/>
        {/* Horizon glow line */}
        <div aria-hidden style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(to right, transparent 0%, ${P.sky} 30%, ${P.brand} 50%, ${P.sky} 70%, transparent 100%)`,
          opacity: 0.4,
        }}/>
        {/* Grid */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}/>
        <Particles />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 840, padding: '0 32px', textAlign: 'center' }}>
          {/* Airline ↔ GSA connection viz */}
          <ConnectionViz />

          {/* Tag */}
          <div id="hero-tag" style={{
            marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 10,
            borderRadius: 40, border: '1px solid rgba(96,165,250,0.25)',
            background: 'rgba(59,130,246,0.1)',
            padding: '7px 18px', opacity: 0,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.success, boxShadow: `0 0 6px ${P.success}` }}/>
            <span style={{ fontSize: 10, fontWeight: 700, color: P.skyLight, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Aviation cargo partnerships
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2.8rem, 6.5vw, 5.2rem)',
            fontWeight: 800, lineHeight: 1.04,
            letterSpacing: '-0.04em', color: P.white, marginBottom: 24,
          }}>
            <span id="hero-h1" style={{ display: 'block' }}>
              {wordSpans('Where airlines and GSAs take off together')}
            </span>
          </h1>

          {/* Sub */}
          <p id="hero-sub" style={{
            fontSize: 16, lineHeight: 1.8,
            color: 'rgba(186,217,255,0.65)',
            maxWidth: 520, margin: '0 auto 36px', opacity: 0,
          }}>
            AirGSA digitalizes the full cargo GSA lifecycle — from structured digital tenders
            and AI-powered scoring to live route tracking and monthly performance reviews.
          </p>

          {/* CTAs */}
          <div id="hero-cta" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 48, opacity: 0 }}>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: P.brand, color: 'white', borderRadius: 14,
              padding: '13px 28px', fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
              boxShadow: `0 4px 28px rgba(59,130,246,0.5)`,
            }}>
              Request early access
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(186,217,255,0.8)', borderRadius: 14,
              padding: '13px 28px', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', backdropFilter: 'blur(8px)',
            }}>
              Sign in
            </Link>
          </div>

          {/* Scroll hint */}
          <div id="hero-scroll" style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0,
          }}>
            <span style={{ fontSize: 9, color: 'rgba(186,217,255,0.3)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
              Scroll to explore
            </span>
            <div style={{
              width: 22, height: 36,
              border: '1.5px solid rgba(186,217,255,0.2)', borderRadius: 11,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 4,
            }}>
              <div style={{
                width: 3, height: 8, borderRadius: 2,
                background: 'rgba(186,217,255,0.5)',
                animation: 'scrollDot 1.8s ease-in-out infinite',
              }}/>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div aria-hidden style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
          background: `linear-gradient(to bottom, transparent, ${P.hero})`,
          pointerEvents: 'none',
        }}/>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SCENE 2: THE MEETING  (220vh)
      ═══════════════════════════════════════════════════════════ */}
      <div id="scene-2-spacer" style={{ height: '220vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100svh', overflow: 'hidden' }}>
          <SceneBg
            id="bg-meeting"
            gradient={`linear-gradient(135deg, #001A5E 0%, #003399 45%, #1A2A8A 100%)`}
            src={images.meeting}
            overlay="linear-gradient(to right, rgba(0,20,80,0.75) 0%, rgba(0,20,80,0.4) 55%, rgba(0,20,80,0.1) 100%)"
            promptLabel="Business meeting — Airline executive meets GSA director"
            prompt={`Two aviation business professionals, one in airline operations attire,
one in a dark business suit, meeting across a modern conference table.
Large windows showing an airport tarmac and aircraft.
Bright natural daylight, clean corporate interior.
Professional editorial photography, sharp focus. --ar 16:9`}
          />
          {/* Right-side sky glow */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'radial-gradient(ellipse 40% 60% at 100% 50%, rgba(59,130,246,0.12) 0%, transparent 65%)',
          }}/>

          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center',
            maxWidth: 1200, margin: '0 auto', padding: '0 52px', width: '100%',
          }}>
            <div style={{ maxWidth: 530 }}>
              <div id="s2-num" style={{ opacity: 0 }}>
                <SceneNumber num="01" label="The Connection" />
              </div>
              <h2 style={{
                fontSize: 'clamp(2.1rem, 4vw, 3.5rem)', fontWeight: 800,
                lineHeight: 1.05, letterSpacing: '-0.03em', color: P.white, marginBottom: 20,
              }}>
                <span id="s2-h2" style={{ display: 'block' }}>
                  {wordSpans('Airlines and GSAs — finally in the same room')}
                </span>
              </h2>
              <p id="s2-body" style={{
                fontSize: 15, lineHeight: 1.82,
                color: 'rgba(186,217,255,0.6)',
                marginBottom: 32, maxWidth: 460, opacity: 0,
              }}>
                Saudia Cargo publishes a structured digital tender. AeroLink GSA
                discovers it on AirGSA, submits a scored proposal. The platform
                handles every step — no email chains, no PDF attachments.
              </p>
              <Workflow />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SCENE 3: THE CARGO  (220vh)
      ═══════════════════════════════════════════════════════════ */}
      <div id="scene-3-spacer" style={{ height: '220vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100svh', overflow: 'hidden' }}>
          <SceneBg
            id="bg-cargo"
            gradient={`linear-gradient(135deg, #001030 0%, #002050 45%, #001828 100%)`}
            src={images.cargo}
            overlay="linear-gradient(to left, rgba(0,15,50,0.72) 0%, rgba(0,15,50,0.38) 55%, rgba(0,15,50,0.08) 100%)"
            promptLabel="Cargo loading — pallets into freighter aircraft"
            prompt={`Cargo ground crew loading white ULD containers onto a freighter aircraft.
Golden hour sunset lighting on the tarmac.
Wide angle shot from the ground looking up at the aircraft belly.
Professional aviation logistics photography, sharp and cinematic. --ar 16:9`}
          />
          <div aria-hidden style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'radial-gradient(ellipse 40% 60% at 0% 50%, rgba(249,115,22,0.08) 0%, transparent 65%)',
          }}/>

          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            maxWidth: 1200, margin: '0 auto', padding: '0 52px', width: '100%',
          }}>
            <div style={{ maxWidth: 500 }}>
              <div id="s3-num" style={{ opacity: 0 }}>
                <SceneNumber num="02" label="The Work" />
              </div>
              <h2 style={{
                fontSize: 'clamp(2.1rem, 4vw, 3.5rem)', fontWeight: 800,
                lineHeight: 1.05, letterSpacing: '-0.03em', color: P.white, marginBottom: 20,
              }}>
                <span id="s3-h2" style={{ display: 'block' }}>
                  {wordSpans('From agreement to cargo in the air')}
                </span>
              </h2>
              <p id="s3-body" style={{
                fontSize: 15, lineHeight: 1.82,
                color: 'rgba(186,217,255,0.6)',
                marginBottom: 28, maxWidth: 440, opacity: 0,
              }}>
                AeroLink GSA begins selling Saudia Cargo&apos;s capacity on FRA → JED
                to freight forwarders worldwide. Every kilogram tracked. Every
                month automatically reviewed against KPI targets.
              </p>
              <div style={{ marginBottom: 20 }}>
                <KpiCards />
              </div>
              <RoutePills />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SCENE 4: TAKEOFF — CTA  (200vh)
      ═══════════════════════════════════════════════════════════ */}
      <div id="scene-4-spacer" style={{ height: '200vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100svh', overflow: 'hidden' }}>
          <SceneBg
            id="bg-takeoff"
            gradient={`linear-gradient(135deg, #1A0500 0%, #3A1200 25%, #001A5E 65%, #000D30 100%)`}
            src={images.takeoff}
            overlay="linear-gradient(to bottom, rgba(0,5,20,0.35) 0%, rgba(0,5,20,0.55) 60%, rgba(0,5,20,0.75) 100%)"
            promptLabel="Takeoff — cargo freighter at sunrise or dusk"
            prompt={`Cargo freighter aircraft silhouette taking off from a runway.
Dramatic orange and blue gradient sky at sunrise or sunset.
Low-angle shot from the tarmac, aircraft climbing with landing gear retracting.
Epic cinematic aviation photography, motion blur on engines. --ar 16:9`}
          />
          {/* Center spotlight */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'radial-gradient(ellipse 55% 60% at 50% 50%, rgba(0,0,0,0.4) 0%, transparent 75%)',
          }}/>
          {/* Bottom sunrise glow */}
          <div aria-hidden style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', zIndex: 2,
            background: `linear-gradient(to top, rgba(249,115,22,0.12) 0%, transparent 100%)`,
          }}/>

          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '0 32px',
          }}>
            <div id="s4-tag" style={{
              marginBottom: 24, opacity: 0,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              borderRadius: 40, border: '1px solid rgba(249,115,22,0.3)',
              background: 'rgba(249,115,22,0.1)', padding: '7px 18px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.orange, boxShadow: `0 0 6px ${P.orange}` }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FED7AA', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                Ready for take-off
              </span>
            </div>

            <h2 id="s4-h2" style={{
              fontSize: 'clamp(2.6rem, 5.5vw, 4.8rem)', fontWeight: 800,
              lineHeight: 1.04, letterSpacing: '-0.04em',
              color: P.white, maxWidth: 700, marginBottom: 20, opacity: 0,
            }}>
              Ready to take off with your new GSA network?
            </h2>

            <p id="s4-sub" style={{
              fontSize: 16, lineHeight: 1.78,
              color: 'rgba(255,255,255,0.48)',
              maxWidth: 460, marginBottom: 38, opacity: 0,
            }}>
              AirGSA is invite-only during the current rollout. Request access —
              your team will be onboarded within 48 hours.
            </p>

            <div id="s4-cta" style={{
              display: 'flex', flexWrap: 'wrap', gap: 12,
              justifyContent: 'center', marginBottom: 40, opacity: 0,
            }}>
              <Link href="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: P.orange, color: 'white', borderRadius: 14,
                padding: '14px 32px', fontSize: 14, fontWeight: 700,
                textDecoration: 'none',
                boxShadow: `0 4px 32px rgba(249,115,22,0.5)`,
                letterSpacing: '-0.01em',
              }}>
                Request early access
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.65)', borderRadius: 14,
                padding: '14px 28px', fontSize: 14, fontWeight: 600,
                textDecoration: 'none', backdropFilter: 'blur(8px)',
              }}>
                Sign in to platform
              </Link>
            </div>

            <div id="s4-trust" style={{
              display: 'flex', flexWrap: 'wrap', gap: 20,
              justifyContent: 'center', fontSize: 9, fontWeight: 700,
              color: 'rgba(255,255,255,0.2)', letterSpacing: '0.22em',
              textTransform: 'uppercase', opacity: 0,
            }}>
              {['IATA-Aligned', 'GDP-Ready', 'CEIV-Compatible', 'SOC 2 In Progress'].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scrollDot {
          0%   { transform: translateY(0); opacity: 1; }
          60%  { transform: translateY(14px); opacity: 0; }
          61%  { transform: translateY(0); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
