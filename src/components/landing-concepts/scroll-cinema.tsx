'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// ── Scenes + images ────────────────────────────────────────────────────────────
// Each scene maps to one folder of AI-generated images.
// GSAP cross-fades through them as you scroll.
const SCENES = [
  {
    label: '01 — Partnerschaft',
    accent: '#60A5FA',
    images: ['/landing/1/img-1.jpg', '/landing/1/img-2.jpg', '/landing/1/img-3.jpg'],
    overlay: 'rgba(5,14,38,0.50)',
    headline: 'It starts with\na handshake.',
    sub: 'Airlines publish a tender. GSAs apply. AI finds the perfect match.',
  },
  {
    label: '02 — Operations',
    accent: '#34D399',
    images: ['/landing/2/img-1.jpg', '/landing/2/img-2.jpg', '/landing/2/img-3.jpg', '/landing/2/img-4.jpg'],
    overlay: 'rgba(5,14,38,0.60)',
    headline: 'Then the\nwork begins.',
    sub: 'Your routes, in expert hands. Every kilo tracked. Every booking attributed.',
  },
  {
    label: '03 — Takeoff',
    accent: '#F97316',
    images: ['/landing/3/img-1.jpg', '/landing/3/img-2.jpg', '/landing/3/img-3.jpg', '/landing/3/img-4.jpg'],
    overlay: 'rgba(5,14,38,0.44)',
    headline: 'And together,\nyou take off.',
    sub: 'Cargo moving. Revenue growing. The network you deserve.',
  },
  {
    label: '04 — Zukunft',
    accent: '#60A5FA',
    images: ['/landing/4/img-1.jpg', '/landing/4/img-2.jpg'],
    overlay: 'rgba(5,14,38,0.78)',
    headline: 'Ready to begin\nyour story?',
    sub: 'Join 80+ airlines and 400+ GSA partners on AirGSA.',
    cta: true,
  },
] as const;

// Flat list of all images with scene metadata
const ALL_IMGS = SCENES.flatMap((s, si) =>
  s.images.map((src, ii) => ({ src, si, ii, overlay: s.overlay })),
);
const TOTAL = ALL_IMGS.length; // 13 images total

// ── TO UPGRADE TO REAL VIDEO SCRUBBING (Apple-style) ───────────────────────────
// 1. Download a free aviation video from https://www.pexels.com/search/videos/cargo+aircraft/
// 2. Save it as: /public/landing/video.mp4
// 3. Uncomment the <video> block in the JSX below
// 4. Uncomment the video scrub ScrollTrigger below
// 5. Remove or hide the image layer divs
//
// const videoRef = useRef<HTMLVideoElement>(null);
//
// ScrollTrigger.create({
//   trigger: outerRef.current,
//   start: 'top top',
//   end: 'bottom bottom',
//   scrub: true,
//   onUpdate(self) {
//     const v = videoRef.current;
//     if (v && v.readyState >= 2) {
//       v.currentTime = self.progress * v.duration;
//     }
//   },
// });
// ──────────────────────────────────────────────────────────────────────────────

export function ScrollCinema() {
  const outerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'none' } });

      // ── Image cross-fades ────────────────────────────────────────────────────
      // Each image occupies 1 "tick" of the timeline.
      // Image i: fades in at tick i, fades out at tick i+0.65.
      // Ken Burns scale runs via CSS so there is no GSAP/CSS transform conflict.
      ALL_IMGS.forEach(({ si, ii }, i) => {
        const sel = `[data-img="${si}-${ii}"]`;
        if (i === 0) {
          // First image starts visible; just fade it out.
          tl.to(sel, { opacity: 0, duration: 0.38 }, 0.62);
        } else if (i === TOTAL - 1) {
          // Last image fades in and stays.
          tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: 0.38 }, i);
        } else {
          tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: 0.38 }, i);
          tl.to(sel, { opacity: 0, duration: 0.35 }, i + 0.65);
        }
      });

      // ── Scene text animations ────────────────────────────────────────────────
      let offset = 0;
      SCENES.forEach((scene, si) => {
        const sceneLen = scene.images.length;
        const sceneEnd = offset + sceneLen;

        // Fade text in 0.4 ticks after scene starts
        tl.fromTo(
          `[data-text="${si}"]`,
          { opacity: 0, y: 70 },
          { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
          offset + 0.4,
        );

        // Fade text out before scene ends (except last scene)
        if (si < SCENES.length - 1) {
          tl.to(`[data-text="${si}"]`, { opacity: 0, y: -52, duration: 0.42 }, sceneEnd - 0.55);
        }

        // CTA buttons appear after last scene text fades in
        if ('cta' in scene && scene.cta) {
          tl.fromTo(
            '[data-cta]',
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 0.44, ease: 'power2.out' },
            offset + 1.3,
          );
        }

        offset = sceneEnd;
      });

      // ── Progress bar ─────────────────────────────────────────────────────────
      tl.fromTo('[data-bar]', { scaleX: 0 }, { scaleX: 1, duration: TOTAL }, 0);

      // ── Main ScrollTrigger ───────────────────────────────────────────────────
      ScrollTrigger.create({
        trigger: outerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.4,
        animation: tl,
        onUpdate(self) {
          // Highlight the active chapter dot
          let imgOff = 0;
          SCENES.forEach((s, si) => {
            const start = imgOff / TOTAL;
            const end = (imgOff + s.images.length) / TOTAL;
            const dot = document.querySelector(`[data-dot="${si}"]`) as HTMLElement | null;
            if (dot) {
              const active = self.progress >= start && self.progress < end;
              dot.style.background = active ? '#fff' : 'rgba(255,255,255,0.22)';
              dot.style.transform = active ? 'scale(1.7)' : 'scale(1)';
            }
            imgOff += s.images.length;
          });
        },
      });
    },
    { scope: outerRef },
  );

  return (
    // Outer div: scroll distance.
    // Image mode: 900vh (13 images × ~70vh each)
    // Video mode: 300vh is ideal — 8 sec video, user scrolls ~3 screens
    <div ref={outerRef} style={{ height: '900vh', position: 'relative' }}>

      {/* ── Sticky cinema stage ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky', top: 0, height: '100svh',
          overflow: 'hidden', background: '#050D1E',
        }}
      >
        {/* ── VIDEO PLACEHOLDER ─────────────────────────────────────────────── */}
        {/* Uncomment below and add /public/landing/video.mp4 for real video scrub:
        <video
          ref={videoRef}
          src="/landing/video.mp4"
          muted
          playsInline
          preload="auto"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        */}

        {/* ── Image layers — stacked, GSAP controls opacity ─────────────────── */}
        {ALL_IMGS.map(({ src, si, ii, overlay }, i) => (
          <div
            key={`${si}-${ii}`}
            data-img={`${si}-${ii}`}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === 0 ? 1 : 0,
              willChange: 'opacity, transform',
            }}
          >
            {/* Dark overlay per scene */}
            <div style={{ position: 'absolute', inset: 0, background: overlay }} />
          </div>
        ))}

        {/* ── Progress bar ──────────────────────────────────────────────────── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)', zIndex: 60 }}>
          <div
            data-bar="1"
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #1A5AFF 0%, #60A5FA 100%)',
              transformOrigin: 'left center',
              willChange: 'transform',
            }}
          />
        </div>

        {/* ── Chapter dots (right side) ─────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute', right: 32, top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: 16, zIndex: 60,
          }}
        >
          {SCENES.map((s, si) => (
            <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
              <span style={{
                fontSize: 9, color: 'rgba(255,255,255,0.26)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: 'system-ui', whiteSpace: 'nowrap',
              }}>
                {s.label.split('—')[1]?.trim()}
              </span>
              <div
                data-dot={si}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: si === 0 ? '#fff' : 'rgba(255,255,255,0.22)',
                  transform: si === 0 ? 'scale(1.7)' : 'scale(1)',
                  transition: 'all 0.35s ease',
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Scene text overlays ───────────────────────────────────────────── */}
        {SCENES.map((scene, si) => (
          <div
            key={si}
            data-text={si}
            style={{
              position: 'absolute', inset: 0, zIndex: 20,
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', justifyContent: 'center',
              padding: 'clamp(48px, 6vw, 96px)',
              opacity: 0, pointerEvents: 'none',
              fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
            }}
          >
            {/* Chapter label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 32, height: 2, background: scene.accent, borderRadius: 1 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.30em', color: scene.accent, textTransform: 'uppercase' }}>
                {scene.label}
              </span>
            </div>

            {/* Main headline */}
            <h2
              style={{
                fontSize: 'clamp(52px, 8.5vw, 110px)',
                fontWeight: 900, color: '#fff',
                lineHeight: 0.93, letterSpacing: '-0.04em',
                whiteSpace: 'pre-line', maxWidth: 820,
                marginBottom: 28,
              }}
            >
              {scene.headline}
            </h2>

            {/* Subtitle */}
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.50)', maxWidth: 460, lineHeight: 1.68 }}>
              {scene.sub}
            </p>

            {/* CTA — only last scene */}
            {'cta' in scene && scene.cta && (
              <div
                data-cta="1"
                style={{ opacity: 0, marginTop: 48, display: 'flex', gap: 14, pointerEvents: 'auto' }}
              >
                <Link
                  href="/signup"
                  style={{
                    fontSize: 15, fontWeight: 700, color: '#fff',
                    background: '#1A5AFF', borderRadius: 12,
                    padding: '15px 36px', textDecoration: 'none',
                    boxShadow: '0 4px 32px rgba(26,90,255,0.5)',
                  }}
                >
                  Request Early Access →
                </Link>
                <Link
                  href="/login"
                  style={{
                    fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 12, padding: '15px 28px', textDecoration: 'none',
                  }}
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        ))}

        {/* ── Scroll hint ───────────────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute', bottom: 36, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'system-ui' }}>
            Scroll
          </span>
          <div style={{ width: 22, height: 38, borderRadius: 11, border: '1.5px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 5 }}>
            <div style={{ width: 4, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.32)', animation: 'scrollDot 1.8s ease-in-out infinite' }} />
          </div>
        </div>

      </div>

      {/* ── Global keyframes ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes scrollDot {
          0%, 100% { transform: translateY(0); opacity: 1; }
          75%       { transform: translateY(14px); opacity: 0; }
        }
        /* Ken Burns: CSS handles the scale so GSAP can own opacity without conflict */
        [data-img] {
          animation: kenBurns 14s ease-in-out alternate infinite;
        }
        @keyframes kenBurns {
          from { transform: scale(1.0); }
          to   { transform: scale(1.07); }
        }
      `}</style>
    </div>
  );
}
