'use client';

/**
 * Scroll Cinema — Canvas Frame Extraction
 *
 * Why canvas instead of <video>:
 *   video.currentTime is async — the browser seeks to the nearest keyframe
 *   and decodes forward, causing visible jumps.
 *
 *   This component pre-decodes the entire video into N ImageBitmaps on load.
 *   Scrubbing then = ctx.drawImage(bitmaps[i]) — synchronous, GPU-accelerated,
 *   zero seeking overhead. Result: butter-smooth at any scroll speed.
 *
 * Trade-off: ~3–5 sec loading screen while frames are extracted.
 *   100 frames × 720×405 × 4 bytes ≈ 117 MB RAM — fine for desktop.
 */

import { useRef, useEffect, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// ── Config ─────────────────────────────────────────────────────────────────────
const FRAMES  = 100;   // pre-decoded frames (more = smoother, more RAM)
const FRAME_W = 720;   // extraction resolution width
const FRAME_H = 405;   // extraction resolution height (16:9)

// ── Chapters ───────────────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    at: 0.00, num: '01', label: 'Partnerschaft', accent: '#60A5FA',
    lines: ['It starts with', 'a handshake.'],
    sub:   'Airlines publish a tender. AI finds the perfect GSA match.',
  },
  {
    at: 0.26, num: '02', label: 'Operations', accent: '#34D399',
    lines: ['Then the', 'work begins.'],
    sub:   'Your routes, in expert hands. Every kilo tracked.',
  },
  {
    at: 0.54, num: '03', label: 'Takeoff', accent: '#F97316',
    lines: ['And together,', 'you take off.'],
    sub:   'Cargo moving. Revenue growing. The network you deserve.',
  },
  {
    at: 0.80, num: '04', label: 'Zukunft', accent: '#60A5FA',
    lines: ['Ready to begin', 'your story?'],
    sub:   'Join 80+ airlines and 400+ GSA partners on AirGSA.',
    cta:   true,
    stats: [
      { v: '80+',   l: 'Airlines'       },
      { v: '4.2×',  l: 'Revenue uplift' },
      { v: '340K+', l: 'Tonnes p.a.'    },
      { v: '94%',   l: 'Match rate'     },
    ],
  },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

// ── Loading screen ─────────────────────────────────────────────────────────────
function Loader({ pct, visible }: { pct: number; visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: '#030810',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 0,
        fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.7s ease',
      }}
    >
      {/* Logo */}
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.38em',
        textTransform: 'uppercase', color: '#60A5FA', marginBottom: 52,
      }}>
        AirGSA
      </div>

      {/* Film-strip frames — decorative */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 40, opacity: 0.35,
        overflow: 'hidden', width: 240,
      }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 16, height: 24, flexShrink: 0,
              background: i / 12 < pct / 100
                ? `hsl(${210 + i * 8}, 80%, 60%)`
                : 'rgba(255,255,255,0.08)',
              borderRadius: 2,
              transition: 'background 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* Progress track */}
      <div style={{ width: 240, height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16, borderRadius: 1 }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #1A5AFF, #60A5FA)',
          width: `${pct}%`,
          borderRadius: 1,
          transition: 'width 0.15s linear',
        }} />
      </div>

      {/* Counter */}
      <div style={{
        fontVariantNumeric: 'tabular-nums',
        fontSize: 11, color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.18em',
      }}>
        {String(pct).padStart(3, '0')} / 100
      </div>

      <div style={{
        marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.12)',
        letterSpacing: '0.22em', textTransform: 'uppercase',
      }}>
        Preparing cinema
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ScrollCanvas() {
  const outerRef    = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const bitmapsRef  = useRef<ImageBitmap[]>([]);
  const barRef      = useRef<HTMLDivElement>(null);
  const activeChRef = useRef<number>(-1);
  const sizeRef     = useRef({ w: 0, h: 0 });

  const [loadPct, setLoadPct] = useState(0);
  const [ready,   setReady  ] = useState(false);

  // Lock body scroll while loading
  useEffect(() => {
    document.body.style.overflow = ready ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [ready]);

  // ── Phase 1: extract all frames into ImageBitmaps ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const video = document.createElement('video');
        video.src         = '/landing/video.mp4';
        video.muted       = true;
        video.playsInline = true;
        video.preload     = 'auto';

        await new Promise<void>((res, rej) => {
          video.addEventListener('loadedmetadata', () => res(), { once: true });
          video.addEventListener('error', () => rej(new Error('Video load error')), { once: true });
          video.load();
        });

        const duration = video.duration;
        const tmp    = document.createElement('canvas');
        tmp.width    = FRAME_W;
        tmp.height   = FRAME_H;
        const tmpCtx = tmp.getContext('2d', { willReadFrequently: false })!;
        const bitmaps: ImageBitmap[] = [];

        for (let i = 0; i < FRAMES; i++) {
          if (cancelled) break;

          // Seek to this frame's timestamp
          video.currentTime = (i / (FRAMES - 1)) * duration;
          await new Promise<void>(res => {
            video.addEventListener('seeked', () => res(), { once: true });
          });

          // Draw → create ImageBitmap (stays on GPU, zero-copy drawImage later)
          tmpCtx.drawImage(video, 0, 0, FRAME_W, FRAME_H);
          const bm = await createImageBitmap(tmp);
          bitmaps.push(bm);

          setLoadPct(Math.round(((i + 1) / FRAMES) * 100));
        }

        if (cancelled) {
          bitmaps.forEach(b => b.close());
          return;
        }

        bitmapsRef.current = bitmaps;
        setReady(true);
      } catch (err) {
        console.error('[ScrollCanvas] extraction failed:', err);
        // Signal error via full pct so loader hides, canvas stays black
        setLoadPct(100);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      bitmapsRef.current.forEach(b => b.close());
      bitmapsRef.current = [];
    };
  }, []);

  // ── Phase 2: RAF display loop ──────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    const canvas  = canvasRef.current!;
    const ctx     = canvas.getContext('2d')!;
    const outer   = outerRef.current!;
    const bitmaps = bitmapsRef.current;

    // Size canvas to fill viewport, respect aspect ratio (cover)
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      sizeRef.current = { w: canvas.width, h: canvas.height };
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    let raf: number;
    let smooth  = 0;
    let lastIdx = -1;

    const tick = () => {
      const raw = getScrollProgress(outer);
      smooth = lerp(smooth, raw, 0.11);   // 0.11 = responsive yet silky

      const total = bitmaps.length;
      if (total > 0) {
        const idx = Math.min(total - 1, Math.round(smooth * (total - 1)));

        // Only redraw when frame actually changes (avoids unnecessary GPU work)
        if (idx !== lastIdx) {
          lastIdx = idx;
          const bm = bitmaps[idx];
          const { w, h } = sizeRef.current;

          // object-fit: cover — crop to fill canvas exactly
          const aspect = FRAME_W / FRAME_H;
          const ca     = w / h;
          let dw: number, dh: number, dx: number, dy: number;
          if (ca > aspect) {
            dw = w; dh = w / aspect; dx = 0; dy = (h - dh) / 2;
          } else {
            dh = h; dw = h * aspect; dy = 0; dx = (w - dw) / 2;
          }
          ctx.drawImage(bm, dx, dy, dw, dh);
        }
      }

      // Progress bar — direct style mutation (no React re-render)
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${smooth})`;
      }

      // Chapter dots
      const active = getActiveChapter(raw);
      if (active !== activeChRef.current) {
        activeChRef.current = active;
        CHAPTERS.forEach((ch, i) => {
          const dot = document.querySelector<HTMLElement>(`[data-dot="${i}"]`);
          if (!dot) return;
          const on             = i === active;
          dot.style.background = on ? '#fff' : 'rgba(255,255,255,0.18)';
          dot.style.transform  = on ? 'scale(1.9)' : 'scale(1)';
          dot.style.boxShadow  = on ? `0 0 10px ${ch.accent}80` : 'none';
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [ready]);

  // ── Phase 3: GSAP text transitions ────────────────────────────────────────
  useGSAP(() => {
    if (!ready) return;

    // Let layout settle after loading overlay fades
    const id = setTimeout(() => ScrollTrigger.refresh(), 80);

    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.set({}, {}, 1); // anchor total duration = 1.0

    CHAPTERS.forEach((ch, i) => {
      const next    = CHAPTERS[i + 1] as typeof CHAPTERS[number] | undefined;
      const fadeIn  = ch.at;
      const fadeOut = next ? next.at - 0.03 : 0.97;

      // Badge slides in from left with blur
      tl.fromTo(`[data-badge="${i}"]`,
        { opacity: 0, x: -28, filter: 'blur(6px)' },
        { opacity: 1, x: 0,   filter: 'blur(0px)', duration: 0.055, ease: 'power2.out' },
        fadeIn + 0.01,
      );

      // Lines — title-card slide-up from overflow:hidden mask
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

      if (next) {
        tl.to(`[data-ch="${i}"]`, { opacity: 0, duration: 0.04 }, fadeOut);
      }

      if ('cta' in ch && ch.cta) {
        tl.fromTo('[data-stat]',
          { opacity: 0, y: 28, filter: 'blur(4px)' },
          { opacity: 1, y: 0,  filter: 'blur(0px)', stagger: 0.013, duration: 0.05 },
          fadeIn + 0.10,
        );
        tl.fromTo('[data-cta]',
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.05 },
          fadeIn + 0.19,
        );
      }
    });

    ScrollTrigger.create({
      trigger: outerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.85,
      animation: tl,
    });

    return () => clearTimeout(id);
  }, { scope: outerRef, dependencies: [ready] });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Loader pct={loadPct} visible={!ready} />

      <div ref={outerRef} style={{ height: '300vh', position: 'relative' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100svh',
          overflow: 'hidden', background: '#000',
        }}>

          {/* ── CANVAS — zero-seek frame display ──────────────────────────── */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', inset: 0,
              display: 'block', width: '100%', height: '100%',
            }}
          />

          {/* ── VIGNETTE ──────────────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 150% 100% at 50% 0%,  transparent 35%, rgba(2,6,18,0.75) 100%),
              radial-gradient(ellipse  80% 120% at 0%  50%, rgba(2,6,18,0.35) 0%, transparent 55%)
            `,
          }} />

          {/* ── BOTTOM SCRIM ──────────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '62%', zIndex: 6, pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(2,6,18,0.92) 0%, rgba(2,6,18,0.55) 32%, transparent 100%)',
          }} />

          {/* ── PROGRESS BAR ──────────────────────────────────────────────── */}
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

          {/* ── CHAPTER DOTS ──────────────────────────────────────────────── */}
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
                    background: i === 0 ? '#fff' : 'rgba(255,255,255,0.18)',
                    transform: i === 0 ? 'scale(1.9)' : 'scale(1)',
                    boxShadow: i === 0 ? `0 0 10px ${ch.accent}80` : 'none',
                    transition: 'background 0.28s ease, transform 0.28s ease, box-shadow 0.28s ease',
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
          </div>

          {/* ── CHAPTER TEXT BLOCKS ───────────────────────────────────────── */}
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
              {/* Faded chapter number — depth layer */}
              <div style={{
                position: 'absolute', right: 72, bottom: 'clamp(40px, 6vh, 80px)',
                fontSize: 'clamp(160px, 24vw, 320px)',
                fontWeight: 900, color: 'rgba(255,255,255,0.028)',
                letterSpacing: '-0.07em', lineHeight: 1,
                userSelect: 'none', pointerEvents: 'none',
                fontFamily: 'system-ui',
              }}>
                {ch.num}
              </div>

              {/* Glass badge */}
              <div
                data-badge={i}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: `${ch.accent}12`,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${ch.accent}28`,
                  borderRadius: 100, padding: '7px 18px',
                  marginBottom: 24, opacity: 0,
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: ch.accent, boxShadow: `0 0 8px ${ch.accent}`,
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.28em', color: ch.accent,
                  textTransform: 'uppercase',
                }}>
                  {ch.num} — {ch.label}
                </span>
              </div>

              {/* Headline — each line slides up from clipped container */}
              <div style={{ marginBottom: 18 }}>
                {ch.lines.map((line, li) => (
                  <div key={li} style={{ overflow: 'hidden', lineHeight: 1, paddingBottom: '0.06em' }}>
                    <div
                      data-line={`${i}-${li}`}
                      style={{
                        fontSize: 'clamp(52px, 8vw, 108px)',
                        fontWeight: 900, color: '#fff',
                        letterSpacing: '-0.04em', lineHeight: 0.95,
                        display: 'block',
                        textShadow: '0 4px 48px rgba(0,0,0,0.55)',
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
                  fontSize: 16, color: 'rgba(255,255,255,0.50)',
                  maxWidth: 400, lineHeight: 1.72,
                  marginBottom: 28, opacity: 0,
                  textShadow: '0 2px 16px rgba(0,0,0,0.5)',
                }}
              >
                {ch.sub}
              </p>

              {/* Stats — last chapter only */}
              {'stats' in ch && (
                <div style={{ display: 'flex', gap: 36, marginBottom: 32, flexWrap: 'wrap' }}>
                  {ch.stats.map((s) => (
                    <div key={s.l} data-stat style={{ opacity: 0 }}>
                      <div style={{
                        fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900,
                        color: '#fff', letterSpacing: '-0.03em', lineHeight: 1,
                      }}>
                        {s.v}
                      </div>
                      <div style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.34)',
                        letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 5,
                      }}>
                        {s.l}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA — last chapter only */}
              {'cta' in ch && ch.cta && (
                <div data-cta="1" style={{ opacity: 0, display: 'flex', gap: 12, pointerEvents: 'auto' }}>
                  <Link
                    href="/signup"
                    style={{
                      fontSize: 14, fontWeight: 700, color: '#fff',
                      background: '#1A5AFF', borderRadius: 10,
                      padding: '13px 28px', textDecoration: 'none',
                      boxShadow: '0 4px 28px rgba(26,90,255,0.55)',
                    }}
                  >
                    Request Early Access →
                  </Link>
                  <Link
                    href="/login"
                    style={{
                      fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.58)',
                      border: '1px solid rgba(255,255,255,0.15)',
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

          {/* ── SCROLL HINT ───────────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', bottom: 28, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
          }}>
            <span style={{
              fontSize: 9, color: 'rgba(255,255,255,0.18)',
              letterSpacing: '0.26em', textTransform: 'uppercase', fontFamily: 'system-ui',
            }}>
              Scroll
            </span>
            <div style={{
              width: 20, height: 34, borderRadius: 10,
              border: '1.5px solid rgba(255,255,255,0.10)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 5,
            }}>
              <div style={{
                width: 4, height: 7, borderRadius: 2,
                background: 'rgba(255,255,255,0.22)',
                animation: 'scrollDot 1.9s ease-in-out infinite',
              }} />
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes scrollDot {
          0%, 100% { transform: translateY(0);    opacity: 1; }
          78%       { transform: translateY(12px); opacity: 0; }
        }
      `}</style>
    </>
  );
}
