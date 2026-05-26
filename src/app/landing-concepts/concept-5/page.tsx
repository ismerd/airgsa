'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Loaded dynamically — GSAP + ScrollTrigger needs browser APIs
const CinematicStory = dynamic(
  () => import('@/components/landing-concepts/cinematic-story').then((m) => m.CinematicStory),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: '100svh',
          background: '#050912',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          Loading…
        </p>
      </div>
    ),
  },
);

// ─── Image paths ──────────────────────────────────────────────────────────────
// Once you've generated the images with Midjourney / DALL-E, put them in:
//   /public/landing/meeting.jpg
//   /public/landing/cargo.jpg
//   /public/landing/takeoff.jpg
// Then uncomment the paths below and the placeholder overlays will disappear.

const IMAGES = {
  meeting: '/landing/meeting.jpg',
  cargo:   '/landing/cargo.jpg',
  takeoff: '/landing/takeoff.jpg',
};

// ─── Minimal floating nav ─────────────────────────────────────────────────────
function Nav() {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(5,9,18,0.9) 0%, transparent 100%)',
        pointerEvents: 'auto',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#1A5AFF',
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
        }}
      >
        AirGSA
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link
          href="/login"
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            textDecoration: 'none',
            fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
            transition: 'color 0.2s',
          }}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'white',
            background: '#1A5AFF',
            borderRadius: 8,
            padding: '8px 16px',
            textDecoration: 'none',
            boxShadow: '0 0 16px rgba(26,90,255,0.4)',
            fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
          }}
        >
          Request access
        </Link>
      </div>
    </nav>
  );
}

export default function Concept5() {
  return (
    <>
      <Nav />
      <CinematicStory images={IMAGES} />
      {/* Dev link back */}
      <div
        style={{
          background: '#030609',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '20px 32px',
          textAlign: 'center',
          fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
        }}
      >
        <Link
          href="/landing-concepts"
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: '0.1em' }}
        >
          ← All concepts
        </Link>
      </div>
    </>
  );
}
