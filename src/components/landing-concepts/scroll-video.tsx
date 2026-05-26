'use client';

/**
 * Scroll-Cinema — smooth video scrub
 *
 * Two independent systems:
 *  1. RAF loop  → video.currentTime + progress bar + chapter dots
 *                 Uses lerp so the video glides instead of jumping.
 *  2. GSAP/ST   → text chapter transitions only (scrub: 0.9)
 *
 * Why separate?
 *  GSAP's onUpdate fires at its own tick, which doesn't match
 *  the browser's compositing pipeline. Video seeking must happen
 *  inside a real requestAnimationFrame to stay in sync with the GPU.
 */

import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// ── Chapter data ───────────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    at: 0.00,
    num: '01',
    label: 'Partnerschaft',
    accent: '#60A5FA',
    lines: ['It starts with', 'a handshake.'],
    sub: 'Airlines publish a tender. AI finds the perfect GSA match.',
  },
  {
    at: 0.26,
    num: '02',
    label: 'Operations',
    accent: '#34D399',
    lines: ['Then the', 'work begins.'],
    sub: 'Your routes, in expert hands. Every kilo tracked.',
  },
  {
    at: 0.54,
    num: '03',
    label: 'Takeoff',
    accent: '#F97316',
    lines: ['And together,', 'you take off.'],
    sub: 'Cargo moving. Revenue growing. The network you deserve.',
  },
  {
    at: 0.80,
    num: '04',
    label: 'Zukunft',
    accent: '#60A5FA',
    lines: ['Ready to begin', 'your story?'],
    sub: 'Join 80+ airlines and 400+ GSA partners on AirGSA.',
    cta: true,
    stats: [
      { v: '80+',   l: 'Airlines'       },
      { v: '4.2×',  l: 'Revenue uplift' },
      { v: '340K+', l: 'Tonnes p.a.'    },
      { v: '94%',   l: 'Match rate'     },
    ],
  },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getScrollProgress(el: HTMLElement): number {
  const rect  = el.getBoundingClientRect();
  const total = el.offsetHeight - window.innerHeight;
  return Math.max(0, Math.min(1, -rect.top / total));
}

function getActiveChapter(p: number): number {
  let active = 0;
  CHAPTERS.forEach((ch, i) => { if (p >= ch.at) active = i; });
  return active;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function ScrollVideo() {
  const outerRef    = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const barRef      = useRef<HTMLDivElement>(null);
  const activeChRef = useRef<number>(-1);

  // ── System 1: pure RAF loop — video + bar + dots ──────────────────────────
  useEffect(() => {
    const outer = outerRef.current;
    const v     = videoRef.current;
    if (!outer || !v) return;

    // Hard-mute — belt AND suspenders
    v.muted  = true;
    v.volume = 0;
    v.pause();

    let raf: number;
    let smooth = 0;   // lerped progress value

    const tick = () => {
      const raw = getScrollProgress(outer);

      // Lerp: 0.12 ≈ cinematic lag (~8 frames to close 65% of gap at 60fps)
      // Raise to 0.18 for snappier feel, lower to 0.08 for dreamier.
      smooth = lerp(smooth, raw, 0.12);

      // ── Video seek ────────────────────────────────────────────────────────
      if (v.readyState >= 2 && v.duration) {
        v.currentTime = smooth * v.duration;
      }

      // ── Progress bar (no style recalc — just transform) ───────────────────
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${smooth})`;
      }

      // ── Chapter dots (based on RAW progress so they feel immediate) ───────
      const active = getActiveChapter(raw);
      if (active !== activeChRef.current) {
        activeChRef.current = active;
        CHAPTERS.forEach((ch, i) => {
          const dot = document.querySelector<HTMLElement>(`[data-dot="${i}"]`);
          if (!dot) return;
          const on = i === active;
          dot.style.background = on ? '#fff' : 'rgba(255,255,255,0.20)';
          dot.style.transform  = on ? 'scale(1.9)' : 'scale(1)';
          dot.style.boxShadow  = on ? `0 0 10px ${ch.accent}90` : 'none';
        });
      }

      raf = requestAnimationFrame(tick);
    };

    // Start after enough data is loaded
    const start = () => { raf = requestAnimationFrame(tick); };
    if (v.readyState >= 2) { start(); }
    else { v.addEventListener('loadeddata', start, { once: true }); }

    v.load();
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── System 2: GSAP — text chapter transitions ONLY ────────────────────────
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'none' } });

    // Anchor total duration to 1.0 so scroll progress maps cleanly
    tl.set({}, {}, 1);

    CHAPTERS.forEach((ch, i) => {
      const next    = CHAPTERS[i + 1] as typeof CHAPTERS[number] | undefined;
      const fadeIn  = ch.at;
      const fadeOut = next ? next.at - 0.03 : 0.97;

      // Glass badge slides in
      tl.fromTo(`[data-badge="${i}"]`,
        { opacity: 0, x: -28, filter: 'blur(6px)' },
        { opacity: 1, x: 0,   filter: 'blur(0px)', duration: 0.055, ease: 'power2.out' },
        fadeIn + 0.01,
      );

      // Headline lines — classic title-card reveal (yPercent from overflow:hidden)
      ch.lines.forEach((_, li) => {
        tl.fromTo(`[data-line="${i}-${li}"]`,
          { yPercent: 112 },
          { yPercent: 0, duration: 0.065, ease: 'power3.out' },
          fadeIn + 0.02 + li * 0.032,
        );
      });

      // Subtitle
      tl.fromTo(`[data-sub="${i}"]`,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0,  duration: 0.055, ease: 'power2.out' },
        fadeIn + 0.02 + ch.lines.length * 0.032 + 0.025,
      );

      // Fade chapter out before next
      if (next) {
        tl.to(`[data-ch="${i}"]`, { opacity: 0, duration: 0.04 }, fadeOut);
      }

      // Last chapter: staggered stats + CTA
      if ('cta' in ch && ch.cta) {
        tl.fromTo('[data-stat]',
          { opacity: 0, y: 30, filter: 'blur(4px)' },
          { opacity: 1, y: 0,  filter: 'blur(0px)', stagger: 0.013, duration: 0.055 },
          fadeIn + 0.10,
        );
        tl.fromTo('[data-cta]',
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0,  duration: 0.055 },
          fadeIn + 0.18,
        );
      }
    });

    // scrub: 0.9 → text transitions lag slightly behind scroll on purpose
    // Feels like the headline is "arriving" after the scene establishes itself.
    ScrollTrigger.create({
      trigger: outerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.9,
      animation: tl,
    });
  }, { scope: outerRef });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={outerRef} style={{ height: '300vh', position: 'relative' }}>
      <div style={{
        position: 'sticky', top: 0, height: '100svh',
        overflow: 'hidden', background: '#000',
      }}>

        {/* ── VIDEO ──────────────────────────────────────────────────────────── */}
        <video
          ref={videoRef}
          src="/landing/video.mp4"
          muted
          playsInline
          preload="auto"
          poster="/landing/3/img-1.jpg"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            willChange: 'contents',
          }}
        />

        {/* ── VIGNETTE ───────────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 140% 100% at 50% 0%,   transparent 40%, rgba(3,8,20,0.7) 100%),
            radial-gradient(ellipse 100% 120% at 0%   50%,  rgba(3,8,20,0.4) 0%, transparent 60%)
          `,
        }} />

        {/* ── BOTTOM SCRIM ───────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '60%', zIndex: 6, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(3,8,20,0.88) 0%, rgba(3,8,20,0.5) 35%, transparent 100%)',
        }} />

        {/* ── PROGRESS BAR ───────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, background: 'rgba(255,255,255,0.05)', zIndex: 80,
        }}>
          <div
            ref={barRef}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #1A5AFF 0%, #60A5FA 55%, #22D3EE 100%)',
              transformOrigin: 'left center',
              transform: 'scaleX(0)',
              willChange: 'transform',
            }}
          />
        </div>

        {/* ── CHAPTER DOTS ───────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', right: 28, top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 20, zIndex: 80,
        }}>
          {CHAPTERS.map((ch, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
              <span style={{
                fontSize: 9, color: 'rgba(255,255,255,0.22)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: 'system-ui', whiteSpace: 'nowrap',
              }}>
                {ch.label}
              </span>
              <div
                data-dot={i}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: i === 0 ? '#fff' : 'rgba(255,255,255,0.20)',
                  transform: i === 0 ? 'scale(1.9)' : 'scale(1)',
                  boxShadow: i === 0 ? `0 0 10px ${ch.accent}90` : 'none',
                  transition: 'background 0.28s ease, transform 0.28s ease, box-shadow 0.28s ease',
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>

        {/* ── CHAPTER TEXT BLOCKS ────────────────────────────────────────────── */}
        {CHAPTERS.map((ch, i) => (
          <div
            key={i}
            data-ch={i}
            style={{
              position: 'absolute', inset: 0, zIndex: 20,
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', justifyContent: 'flex-end',
              padding: 'clamp(40px, 5vw, 72px)',
              paddingBottom: 'clamp(72px, 10vh, 120px)',
              opacity: 0, pointerEvents: 'none',
              fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
            }}
          >
            {/* Large faded chapter number — cinematic depth layer */}
            <div style={{
              position: 'absolute', right: 72, bottom: 'clamp(40px, 6vh, 80px)',
              fontSize: 'clamp(180px, 26vw, 340px)',
              fontWeight: 900, color: 'rgba(255,255,255,0.033)',
              letterSpacing: '-0.07em', lineHeight: 1,
              fontFamily: 'system-ui', userSelect: 'none', pointerEvents: 'none',
            }}>
              {ch.num}
            </div>

            {/* Glass badge */}
            <div
              data-badge={i}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: `${ch.accent}14`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${ch.accent}30`,
                borderRadius: 100, padding: '7px 18px',
                marginBottom: 24, opacity: 0,
              }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: ch.accent,
                boxShadow: `0 0 8px ${ch.accent}`,
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.28em', color: ch.accent,
                textTransform: 'uppercase',
              }}>
                {ch.num} — {ch.label}
              </span>
            </div>

            {/* Headline — each line clips up from overflow:hidden */}
            <div style={{ marginBottom: 20 }}>
              {ch.lines.map((line, li) => (
                <div key={li} style={{ overflow: 'hidden', lineHeight: 1, paddingBottom: '0.06em' }}>
                  <div
                    data-line={`${i}-${li}`}
                    style={{
                      fontSize: 'clamp(52px, 8vw, 108px)',
                      fontWeight: 900,
                      color: '#fff',
                      letterSpacing: '-0.04em',
                      lineHeight: 0.95,
                      display: 'block',
                      textShadow: '0 4px 48px rgba(0,0,0,0.6)',
                      willChange: 'transform',
                    }}
                  >
                    {line}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtitle */}
            <p
              data-sub={i}
              style={{
                fontSize: 16, color: 'rgba(255,255,255,0.52)',
                maxWidth: 400, lineHeight: 1.7,
                marginBottom: 28, opacity: 0,
                textShadow: '0 2px 16px rgba(0,0,0,0.5)',
              }}
            >
              {ch.sub}
            </p>

            {/* Stats — last chapter */}
            {'stats' in ch && (
              <div style={{ display: 'flex', gap: 36, marginBottom: 32, flexWrap: 'wrap' }}>
                {ch.stats.map((s) => (
                  <div key={s.l} data-stat style={{ opacity: 0 }}>
                    <div style={{
                      fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900,
                      color: '#fff', letterSpacing: '-0.03em', lineHeight: 1,
                      textShadow: '0 2px 24px rgba(0,0,0,0.4)',
                    }}>
                      {s.v}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'rgba(255,255,255,0.36)',
                      letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 5,
                    }}>
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA — last chapter */}
            {'cta' in ch && ch.cta && (
              <div data-cta="1" style={{ opacity: 0, display: 'flex', gap: 12, pointerEvents: 'auto' }}>
                <Link
                  href="/signup"
                  style={{
                    fontSize: 14, fontWeight: 700, color: '#fff',
                    background: '#1A5AFF', borderRadius: 10,
                    padding: '13px 28px', textDecoration: 'none',
                    boxShadow: '0 4px 28px rgba(26,90,255,0.55)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Request Early Access →
                </Link>
                <Link
                  href="/login"
                  style={{
                    fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    borderRadius: 10, padding: '13px 22px', textDecoration: 'none',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        ))}

        {/* ── SCROLL HINT ────────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 28, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        }}>
          <span style={{
            fontSize: 9, color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.26em', textTransform: 'uppercase', fontFamily: 'system-ui',
          }}>
            Scroll
          </span>
          <div style={{
            width: 20, height: 34, borderRadius: 10,
            border: '1.5px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 5,
          }}>
            <div style={{
              width: 4, height: 7, borderRadius: 2,
              background: 'rgba(255,255,255,0.25)',
              animation: 'scrollDot 1.9s ease-in-out infinite',
            }} />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes scrollDot {
          0%, 100% { transform: translateY(0);    opacity: 1; }
          78%       { transform: translateY(12px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
