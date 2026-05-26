'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// ─── Stage data ───────────────────────────────────────────────────────────────
const STAGES = [
  {
    num: '01',
    label: 'Tender Published',
    title: 'Airline defines the mandate',
    body: 'Saudia Cargo publishes a structured GSA tender for the FRA → JED route: 180 tonnes/month, IATA-certified GSA required, commission-based model, deadline June 5.',
    color: '#1A5AFF',
    bg: 'rgba(26,90,255,0.1)',
    ui: 'tender',
  },
  {
    num: '02',
    label: 'GSAs Apply',
    title: 'Qualified GSAs submit proposals',
    body: 'Four GSA firms discover the open tender on AirGSA and submit structured proposals — network coverage maps, commission structures, and key account pipeline attached.',
    color: '#00AADD',
    bg: 'rgba(0,170,221,0.1)',
    ui: 'applications',
  },
  {
    num: '03',
    label: 'AI Scoring',
    title: 'Every application scored instantly',
    body: "AirGSA's AI scores each proposal across network fit, financial strength, compliance credentials, and pipeline quality. Results in minutes — not weeks of manual review.",
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.1)',
    ui: 'scoring',
  },
  {
    num: '04',
    label: 'Award Decision',
    title: 'Shortlist, negotiate, award',
    body: 'AeroLink GSA — score 91 — is awarded the FRA → JED mandate. Contract terms finalized within the platform. Full audit trail maintained.',
    color: '#0B7A52',
    bg: 'rgba(11,122,82,0.1)',
    ui: 'award',
  },
  {
    num: '05',
    label: 'Route Activated',
    title: 'Go-live on June 1',
    body: 'The route goes live. AeroLink GSA has access to Saudia Cargo\'s cargo systems and begins commercial operations on FRA → JED. Real-time tracking begins.',
    color: '#1A5AFF',
    bg: 'rgba(26,90,255,0.1)',
    ui: 'activation',
  },
  {
    num: '06',
    label: 'Performance Live',
    title: 'Monthly KPIs tracked automatically',
    body: 'Revenue, yield, and load factor flow into Saudia Cargo\'s performance desk every month. Targets set. Actuals tracked. No manual reporting from AeroLink GSA required.',
    color: '#00AADD',
    bg: 'rgba(0,170,221,0.1)',
    ui: 'performance',
  },
] as const;

type StageKey = (typeof STAGES)[number]['ui'];

// ─── UI mockups per stage ─────────────────────────────────────────────────────
const D = {
  bg:       '#0B1E4F',
  bg2:      '#0F2468',
  bg3:      '#142880',
  border:   '#1C3070',
  border2:  '#244090',
  brand:    '#1A5AFF',
  cyan:     '#00AADD',
  ink:      '#E0E8FF',
  inkMuted: '#7A9AD0',
  inkFaint: '#3A5090',
  success:  '#10B981',
  successBg:'rgba(16,185,129,0.15)',
  violet:   '#7C3AED',
  violetBg: 'rgba(124,58,237,0.12)',
};

function UIMockup({ ui, stageColor }: { ui: StageKey; stageColor: string }) {
  switch (ui) {
    case 'tender':
      return (
        <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: D.border, background: D.bg2 }}>
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: D.border }}>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: D.inkFaint }}>Saudia Cargo · New Tender</p>
              <p className="text-[15px] font-bold mt-0.5" style={{ color: D.ink }}>Middle East GSA Coverage</p>
            </div>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: `${stageColor}20`, color: stageColor }}>Open</span>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: D.inkFaint }}>Route Lanes</p>
            {[['FRA', 'JED'], ['RUH', 'FRA']].map(([a, b]) => (
              <div key={a+b} className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: D.border }}>
                <span className="font-mono text-[12px] font-bold" style={{ color: D.cyan }}>{a}</span>
                <div className="flex flex-1 items-center gap-1">
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${D.brand}44, ${D.cyan}44)` }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: D.cyan }} />
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${D.cyan}44, transparent)` }} />
                </div>
                <span className="font-mono text-[12px] font-bold" style={{ color: D.ink }}>{b}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['Tonnage', '180t/mo'], ['Deadline', 'Jun 5'], ['Type', 'IATA GSA']].map(([k, v]) => (
              <div key={k} className="rounded-lg border px-3 py-2.5" style={{ borderColor: D.border }}>
                <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: D.inkFaint }}>{k}</p>
                <p className="text-[12px] font-bold mt-1" style={{ color: D.ink }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'applications':
      return (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: D.border, background: D.bg2 }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: D.border }}>
            <p className="text-[13px] font-bold" style={{ color: D.ink }}>4 applications received</p>
            <span className="text-[10px] font-semibold" style={{ color: D.cyan }}>Accepting until Jun 5</span>
          </div>
          <div className="p-4 space-y-2">
            {[
              { name: 'AeroLink GSA',          mkts: 'DE · SA · GB', submitted: '2h ago' },
              { name: 'CargoBridge Partners',  mkts: 'DE · SA · AE', submitted: '5h ago' },
              { name: 'SkyTrade Cargo',        mkts: 'SA · AE · TR', submitted: '1d ago' },
              { name: 'PrimeAir Cargo Sales',  mkts: 'SA · GB',      submitted: '2d ago' },
            ].map((a, i) => (
              <div key={a.name} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: D.border }}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0"
                  style={{ background: `${stageColor}20`, color: stageColor }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate" style={{ color: D.ink }}>{a.name}</p>
                  <p className="text-[10px]" style={{ color: D.inkMuted }}>{a.mkts}</p>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: D.inkFaint }}>{a.submitted}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'scoring':
      return (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: D.border, background: D.bg2 }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: D.border }}>
            <p className="text-[13px] font-bold" style={{ color: D.ink }}>AI Scoring Complete</p>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: D.violetBg, color: D.violet }}>
              Auto-scored
            </span>
          </div>
          <div className="p-4 space-y-2.5">
            {[
              { name: 'AeroLink GSA',          score: 91, net: 95, fin: 88, comp: 90 },
              { name: 'CargoBridge Partners',  score: 83, net: 82, fin: 85, comp: 81 },
              { name: 'SkyTrade Cargo',        score: 77, net: 74, fin: 80, comp: 77 },
              { name: 'PrimeAir Cargo Sales',  score: 68, net: 70, fin: 65, comp: 68 },
            ].map((a, i) => (
              <div key={a.name} className="rounded-xl border p-3.5" style={{ borderColor: D.border }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-bold" style={{ color: D.ink }}>{a.name}</p>
                  <span className="text-[15px] font-extrabold" style={{ color: i === 0 ? D.success : stageColor }}>{a.score}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[['Network', a.net], ['Financial', a.fin], ['Compliance', a.comp]].map(([l, v]) => (
                    <div key={l as string}>
                      <p className="text-[8px] uppercase tracking-wider mb-1" style={{ color: D.inkFaint }}>{l}</p>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: D.border }}>
                        <div className="h-full rounded-full" style={{ width: `${v}%`, background: i === 0 ? D.success : stageColor }} />
                      </div>
                      <p className="text-[9px] font-bold mt-1" style={{ color: D.inkMuted }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'award':
      return (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: D.border, background: D.bg2 }}>
          <div
            className="px-5 py-5 text-center border-b"
            style={{ borderColor: D.border, background: 'rgba(11,122,82,0.08)' }}
          >
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl mb-3"
              style={{ background: D.successBg, border: `2px solid ${D.success}` }}
            >
              ✓
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: D.success }}>Tender Awarded</p>
            <p className="text-[16px] font-bold mt-1" style={{ color: D.ink }}>AeroLink GSA</p>
            <p className="text-[12px] mt-0.5" style={{ color: D.inkMuted }}>Score 91 · FRA → JED</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="rounded-xl border p-4" style={{ borderColor: D.border }}>
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: D.inkFaint }}>Contract Terms</p>
              {[
                ['Route', 'FRA → JED'],
                ['Tonnage commitment', '180t/month'],
                ['Commission', '8.5% of AWB revenue'],
                ['Contract duration', '12 months'],
                ['Activation', 'June 1, 2026'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between py-1.5 border-b text-[11px]" style={{ borderColor: D.border }}>
                  <span style={{ color: D.inkMuted }}>{k}</span>
                  <span className="font-semibold" style={{ color: D.ink }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="w-full rounded-xl py-3 text-[13px] font-semibold text-white"
              style={{ background: D.success }}>
              Sign Contract
            </button>
          </div>
        </div>
      );

    case 'activation':
      return (
        <div className="rounded-2xl border p-5" style={{ borderColor: D.border, background: D.bg2 }}>
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold"
              style={{ borderColor: stageColor + '40', background: stageColor + '15', color: stageColor }}>
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: stageColor }} />
              Route Active · June 1, 2026
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Route', value: 'FRA → JED', icon: '→' },
              { label: 'GSA Partner', value: 'AeroLink GSA', icon: '◎' },
              { label: 'Flight', value: 'SV 7801 · B747F', icon: '▲' },
              { label: 'Freq.', value: 'Mon · Wed · Fri', icon: '◈' },
              { label: 'Tonnage', value: '180t/month', icon: '▣' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: D.border }}>
                <span className="text-base w-6 text-center" style={{ color: stageColor }}>{icon}</span>
                <span className="flex-1 text-[12px]" style={{ color: D.inkMuted }}>{label}</span>
                <span className="text-[12px] font-bold" style={{ color: D.ink }}>{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border p-3" style={{ borderColor: D.border, background: D.bg3 }}>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: D.inkFaint }}>First cargo movement</p>
            <p className="text-[13px] font-bold" style={{ color: D.success }}>June 1 · FRA 06:15 → JED 17:30 · 24.4t</p>
          </div>
        </div>
      );

    case 'performance':
      return (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: D.border, background: D.bg2 }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: D.border }}>
            <div>
              <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: D.inkFaint }}>AeroLink GSA · FRA → JED</p>
              <p className="text-[14px] font-bold mt-0.5" style={{ color: D.ink }}>Performance Desk · May 2026</p>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Revenue', value: '$820K', delta: '+11%', pos: true },
                { label: 'Load Factor', value: '84%', delta: '↑ 3.2pp', pos: true },
                { label: 'Yield', value: '$2.51/kg', delta: 'Above target', pos: true },
                { label: 'Tonnage', value: '178t', delta: '99% of target', pos: null },
              ].map(({ label, value, delta, pos }) => (
                <div key={label} className="rounded-xl border px-4 py-3" style={{ borderColor: D.border }}>
                  <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: D.inkFaint }}>{label}</p>
                  <p className="text-[20px] font-bold mt-2 tracking-tight" style={{ color: D.ink }}>{value}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: pos === true ? D.success : D.inkFaint }}>{delta}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: D.border }}>
              <p className="mb-2.5 text-[9px] uppercase tracking-widest font-semibold" style={{ color: D.inkFaint }}>Monthly yield $/kg</p>
              <div className="flex items-end gap-1.5" style={{ height: 42 }}>
                {[1.95, 2.10, 2.08, 2.28, 2.42, 2.51].map((v, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${((v - 1.8) / 0.85) * 100}%`, background: stageColor, opacity: 0.6 + i * 0.06 }} />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between">
                {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((m) => (
                  <span key={m} className="text-[8px]" style={{ color: D.inkFaint }}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
  }
}

// ─── Main journey component ───────────────────────────────────────────────────
export function JourneyGsap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || !trackRef.current) return;

      const panels = trackRef.current.querySelectorAll<HTMLElement>('.journey-panel');
      const totalPanels = panels.length;

      // Horizontal scroll: translate the track left as user scrolls down
      gsap.to(trackRef.current, {
        xPercent: -100 * (totalPanels - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 0.9,
          end: () => `+=${containerRef.current!.offsetWidth * (totalPanels - 1)}`,
          invalidateOnRefresh: true,
        },
      });

      // Animate each panel content on entry
      panels.forEach((panel, i) => {
        const content = panel.querySelector('.panel-content');
        const mockup  = panel.querySelector('.panel-mockup');
        const trigger = containerRef.current!;

        if (content) {
          gsap.from(content, {
            opacity: 0,
            x: 40,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger,
              start: () => `${(i / totalPanels) * 100}% top`,
              toggleActions: 'play none none none',
              scrub: false,
            },
          });
        }
        if (mockup) {
          gsap.from(mockup, {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger,
              start: () => `${(i / totalPanels) * 100 + 2}% top`,
              toggleActions: 'play none none none',
              scrub: false,
            },
          });
        }
      });
    },
    { scope: containerRef, dependencies: [] },
  );

  return (
    <div
      ref={containerRef}
      style={{ height: '100svh', overflow: 'hidden', position: 'relative' }}
    >
      {/* Progress dots */}
      <div
        className="absolute left-6 top-1/2 z-10 flex flex-col gap-3"
        style={{ transform: 'translateY(-50%)' }}
      >
        {STAGES.map((stage) => (
          <div
            key={stage.num}
            className="flex items-center gap-2"
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: D.border2 }}
            />
          </div>
        ))}
      </div>

      {/* Horizontal track */}
      <div
        ref={trackRef}
        className="flex h-full"
        style={{ width: `${STAGES.length * 100}%` }}
      >
        {STAGES.map((stage, i) => (
          <div
            key={stage.num}
            className="journey-panel relative flex h-full shrink-0 items-center"
            style={{ width: `${100 / STAGES.length}%` }}
          >
            {/* Panel bg */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 70% 60% at 60% 50%, ${stage.bg} 0%, transparent 70%)`,
              }}
            />

            <div className="relative z-10 mx-auto w-full max-w-5xl px-14 grid gap-12 items-center lg:grid-cols-2">
              {/* Text */}
              <div className="panel-content">
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-[0.3em]"
                    style={{ color: stage.color }}
                  >
                    {stage.num}
                  </span>
                  <div className="h-px flex-1 max-w-[40px]" style={{ background: stage.color + '60' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: D.inkFaint }}>
                    {stage.label}
                  </span>
                </div>
                <h2
                  className="text-[clamp(1.9rem,3.5vw,3rem)] font-bold leading-[1.08] tracking-tight"
                  style={{ color: D.ink }}
                >
                  {stage.title}
                </h2>
                <p
                  className="mt-5 text-[15px] leading-[1.8] max-w-md"
                  style={{ color: D.inkMuted }}
                >
                  {stage.body}
                </p>

                {/* Step navigation */}
                <div className="mt-8 flex items-center gap-2">
                  {STAGES.map((s, j) => (
                    <div
                      key={j}
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: j === i ? 24 : 8,
                        background: j === i ? stage.color : D.border2,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[10px]" style={{ color: D.inkFaint }}>
                  Step {i + 1} of {STAGES.length}
                </p>
              </div>

              {/* UI mockup */}
              <div className="panel-mockup">
                <UIMockup ui={stage.ui} stageColor={stage.color} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
