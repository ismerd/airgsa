'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const ScrollCanvas = dynamic(
  () => import('@/components/landing-concepts/scroll-canvas').then((m) => m.ScrollCanvas),
  { ssr: false, loading: () => <Loader /> },
);

function Loader() {
  return (
    <div style={{ height: '100svh', background: '#050D1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px solid rgba(96,165,250,0.2)', borderTopColor: '#60A5FA',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          Loading
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      padding: '18px 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(to bottom, rgba(5,13,30,0.88) 0%, transparent 100%)',
      fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#60A5FA' }}>
        AirGSA
      </span>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Link href="/login" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Sign in</Link>
        <Link href="/signup" style={{
          fontSize: 12, fontWeight: 700, color: '#fff',
          background: '#1A5AFF', borderRadius: 8, padding: '9px 20px',
          textDecoration: 'none', boxShadow: '0 0 20px rgba(26,90,255,0.4)',
        }}>
          Request Access
        </Link>
      </div>
    </nav>
  );
}

export default function Concept10() {
  return (
    <>
      <Nav />
      <ScrollCanvas />
      <div style={{
        background: '#030609', borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '20px 32px', textAlign: 'center',
        fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
      }}>
        <Link href="/landing-concepts" style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textDecoration: 'none', letterSpacing: '0.1em' }}>
          ← All concepts
        </Link>
      </div>
    </>
  );
}
