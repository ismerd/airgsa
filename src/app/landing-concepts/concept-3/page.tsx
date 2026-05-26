'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg:        '#FFFFFF',
  bg2:       '#F7F9FF',
  bg3:       '#EFF3FB',
  border:    '#DDE4F5',
  brand:     '#1A5AFF',
  brandL:    '#EBF1FF',
  ink:       '#0B1E4F',
  inkMuted:  '#7A8BB0',
  inkFaint:  '#B0BDD8',
  success:   '#0B7A52',
  successBg: '#E6F7F1',
  warning:   '#B45309',
  warningBg: '#FEF3C7',
  cyan:      '#00AADD',
};

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      style={{ background: 'rgba(255,255,255,0.9)', borderBottom: `1px solid ${T.border}` }}
      className="sticky top-0 z-50 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.3em]" style={{ color: T.brand }}>
          AirGSA
        </span>
        <div className="hidden gap-7 text-[13px] md:flex" style={{ color: T.inkMuted }}>
          {['Platform', 'For Airlines', 'For GSAs', 'Pricing', 'Intelligence'].map((l) => (
            <span key={l} className="cursor-pointer transition-colors hover:text-[#0B1E4F]">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" style={{ color: T.inkMuted }} className="text-[13px] hover:text-[#0B1E4F] transition-colors">Sign in</Link>
          <Link
            href="/signup"
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
            style={{ background: T.brand, boxShadow: '0 2px 14px rgba(26,90,255,0.36)' }}
          >
            Book a demo
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Dashboard mockup tabs ────────────────────────────────────────────────────
type TabKey = 'tenders' | 'applications' | 'performance' | 'routes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'tenders',       label: 'Tender Board' },
  { key: 'applications',  label: 'Applications' },
  { key: 'performance',   label: 'Performance' },
  { key: 'routes',        label: 'Route Map' },
];

function TendersView() {
  return (
    <div className="flex-1 overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: T.border }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.inkFaint }}>Saudia Cargo</p>
          <h2 className="text-[16px] font-bold mt-0.5" style={{ color: T.ink }}>Active Tenders</h2>
        </div>
        <button
          className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
          style={{ background: T.brand }}
        >
          + New Tender
        </button>
      </div>
      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg2 }}>
              {['Tender Name', 'Routes', 'Tonnage', 'Deadline', 'Applications', 'Status'].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold uppercase tracking-wider text-[9px]" style={{ color: T.inkFaint }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Middle East GSA Coverage', routes: 'FRA → JED, RUH → FRA', tonnage: '420t/mo', deadline: 'Jun 5', apps: 6, status: 'Open', sc: [T.brand, T.brandL] },
              { name: 'Southeast Asia Expansion', routes: 'FRA → SIN', tonnage: '180t/mo', deadline: 'Jun 12', apps: 4, status: 'Open', sc: [T.brand, T.brandL] },
              { name: 'Levant & Turkey Routes', routes: 'IST → DXB', tonnage: '90t/mo', deadline: 'May 28', apps: 9, status: 'In Review', sc: [T.warning, T.warningBg] },
              { name: 'UK Cargo Hub', routes: 'JED → LHR', tonnage: '150t/mo', deadline: 'Apr 30', apps: 7, status: 'Awarded', sc: [T.success, T.successBg] },
            ].map((row) => (
              <tr
                key={row.name}
                className="transition-colors hover:bg-[#F7F9FF] cursor-pointer"
                style={{ borderBottom: `1px solid ${T.border}` }}
              >
                <td className="px-5 py-3.5 font-semibold" style={{ color: T.ink }}>{row.name}</td>
                <td className="px-5 py-3.5 font-mono text-[11px]" style={{ color: T.brand }}>{row.routes}</td>
                <td className="px-5 py-3.5" style={{ color: T.inkMuted }}>{row.tonnage}</td>
                <td className="px-5 py-3.5" style={{ color: T.inkMuted }}>{row.deadline}</td>
                <td className="px-5 py-3.5">
                  <span className="font-bold" style={{ color: T.ink }}>{row.apps}</span>
                  <span style={{ color: T.inkFaint }}> received</span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: row.sc[1], color: row.sc[0] }}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicationsView() {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: T.border }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.inkFaint }}>FRA → JED · Middle East GSA Coverage</p>
          <h2 className="text-[16px] font-bold mt-0.5" style={{ color: T.ink }}>6 Applications</h2>
        </div>
        <span className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ background: T.brandL, color: T.brand }}>AI scoring active</span>
      </div>
      <div className="p-5 space-y-3">
        {[
          { name: 'AeroLink GSA', mkts: 'DE · SA · GB', score: 91, status: 'Shortlisted', sc: [T.success, T.successBg], highlight: true },
          { name: 'CargoBridge Partners', mkts: 'DE · SA · AE', score: 83, status: 'In Review', sc: [T.brand, T.brandL], highlight: false },
          { name: 'SkyTrade Cargo', mkts: 'SA · AE · TR', score: 77, status: 'In Review', sc: [T.brand, T.brandL], highlight: false },
          { name: 'PrimeAir Cargo Sales', mkts: 'SA · GB', score: 68, status: 'Pending', sc: [T.inkMuted, T.bg2], highlight: false },
        ].map((app) => (
          <div
            key={app.name}
            className="flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-shadow hover:shadow-sm"
            style={{
              borderColor: app.highlight ? `${T.brand}40` : T.border,
              background: app.highlight ? T.brandL + '30' : T.bg2,
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold border"
              style={{ background: T.brandL, color: T.brand, borderColor: T.border }}
            >
              {app.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold" style={{ color: T.ink }}>{app.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: T.inkMuted }}>{app.mkts}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px]" style={{ color: T.inkFaint }}>AI Score</span>
                  <span className="text-[10px] font-bold" style={{ color: T.brand }}>{app.score}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.border }}>
                  <div className="h-full rounded-full" style={{ width: `${app.score}%`, background: T.brand }} />
                </div>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-[9px] font-semibold shrink-0"
                style={{ background: app.sc[1], color: app.sc[0] }}
              >
                {app.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceView() {
  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.inkFaint }}>Saudia Cargo</p>
          <h2 className="text-[16px] font-bold mt-0.5" style={{ color: T.ink }}>GSA Network Performance · May 2026</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4">
        {[
          { label: 'Revenue', value: '$2.1M', delta: '+14%', pos: true },
          { label: 'Load Factor', value: '81%', delta: '↑ 4.1pp', pos: true },
          { label: 'Yield $/kg', value: '$2.44', delta: 'On target', pos: null },
          { label: 'Active GSAs', value: '4', delta: '5 markets', pos: null },
        ].map(({ label, value, delta, pos }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: T.border, background: T.bg }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: T.inkFaint }}>{label}</p>
            <p className="text-[22px] font-bold mt-2 tracking-tight" style={{ color: T.ink }}>{value}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: pos === true ? T.success : pos === false ? '#DC2626' : T.inkFaint }}>{delta}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-4" style={{ borderColor: T.border, background: T.bg }}>
        <p className="mb-4 text-[9px] font-semibold uppercase tracking-widest" style={{ color: T.inkFaint }}>
          GSA Performance Breakdown
        </p>
        <div className="space-y-3">
          {[
            { name: 'AeroLink GSA',         route: 'FRA → JED', rev: '$820K', yield: '$2.51', load: '84%', on: true },
            { name: 'CargoBridge Partners', route: 'FRA → SIN', rev: '$610K', yield: '$2.38', load: '78%', on: true },
            { name: 'PrimeAir Cargo Sales', route: 'JED → LHR', rev: '$430K', yield: '$2.44', load: '77%', on: true },
            { name: 'SkyTrade Cargo',       route: 'IST → DXB', rev: '$240K', yield: '$2.10', load: '68%', on: false },
          ].map((g) => (
            <div key={g.name} className="flex items-center gap-4 rounded-lg border p-3" style={{ borderColor: T.border }}>
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[9px] font-extrabold"
                style={{ background: T.brandL, color: T.brand }}
              >
                {g.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold" style={{ color: T.ink }}>{g.name}</p>
                <p className="font-mono text-[10px]" style={{ color: T.inkMuted }}>{g.route}</p>
              </div>
              <div className="hidden sm:flex gap-6 text-right">
                <div><p className="text-[9px]" style={{ color: T.inkFaint }}>Revenue</p><p className="text-[12px] font-bold" style={{ color: T.ink }}>{g.rev}</p></div>
                <div><p className="text-[9px]" style={{ color: T.inkFaint }}>Yield</p><p className="text-[12px] font-bold" style={{ color: T.ink }}>{g.yield}</p></div>
                <div><p className="text-[9px]" style={{ color: T.inkFaint }}>Load</p><p className="text-[12px] font-bold" style={{ color: T.ink }}>{g.load}</p></div>
              </div>
              <span
                className="shrink-0 h-2 w-2 rounded-full"
                style={{ background: g.on ? T.success : T.warning }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoutesView() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: T.border }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.inkFaint }}>Network</p>
          <h2 className="text-[16px] font-bold mt-0.5" style={{ color: T.ink }}>Active Routes · 5 lanes</h2>
        </div>
      </div>
      {/* Schematic route map */}
      <div className="flex-1 p-5 flex items-center justify-center">
        <div className="w-full max-w-lg">
          {/* Hub nodes */}
          <div className="relative" style={{ height: 300 }}>
            {/* SVG route visualization */}
            <svg viewBox="0 0 400 260" className="absolute inset-0 w-full h-full">
              {/* Route lines */}
              <line x1="80" y1="60" x2="200" y2="140" stroke={T.brand} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />
              <line x1="80" y1="60" x2="340" y2="200" stroke={T.brand} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />
              <line x1="160" y1="30" x2="270" y2="160" stroke={T.brand} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />
              <line x1="200" y1="140" x2="60" y2="80" stroke={T.brand} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />
              <line x1="240" y1="120" x2="80" y2="60" stroke={T.brand} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />
              {/* Airport nodes */}
              {[
                { x: 80, y: 60, code: 'FRA', label: 'Frankfurt' },
                { x: 200, y: 140, code: 'JED', label: 'Jeddah' },
                { x: 340, y: 200, code: 'SIN', label: 'Singapore' },
                { x: 270, y: 160, code: 'DXB', label: 'Dubai' },
                { x: 60, y: 80, code: 'LHR', label: 'London' },
                { x: 240, y: 120, code: 'RUH', label: 'Riyadh' },
                { x: 160, y: 30, code: 'IST', label: 'Istanbul' },
              ].map((ap) => (
                <g key={ap.code}>
                  <circle cx={ap.x} cy={ap.y} r={16} fill={T.brandL} stroke={T.brand} strokeWidth="1.5" />
                  <text x={ap.x} y={ap.y + 1} textAnchor="middle" dominantBaseline="middle" fill={T.brand} fontSize="8" fontWeight="700" fontFamily="monospace">
                    {ap.code}
                  </text>
                  <text x={ap.x} y={ap.y + 26} textAnchor="middle" fill={T.inkMuted} fontSize="7.5" fontFamily="sans-serif">
                    {ap.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          {/* Route list */}
          <div className="space-y-2">
            {[
              { route: 'FRA → JED', gsa: 'AeroLink GSA',          status: 'Active',  color: [T.success, T.successBg] as [string, string] },
              { route: 'FRA → SIN', gsa: 'CargoBridge Partners',  status: 'Active',  color: [T.success, T.successBg] as [string, string] },
              { route: 'IST → DXB', gsa: 'SkyTrade Cargo',        status: 'Review',  color: [T.warning, T.warningBg] as [string, string] },
            ].map((r) => (
              <div key={r.route} className="flex items-center gap-3 rounded-lg border px-4 py-2.5" style={{ borderColor: T.border }}>
                <span className="font-mono text-[11px] font-bold min-w-[90px]" style={{ color: T.brand }}>{r.route}</span>
                <span className="flex-1 text-[11px]" style={{ color: T.inkMuted }}>{r.gsa}</span>
                <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: r.color[1], color: r.color[0] }}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar icons (simplified) ───────────────────────────────────────────────
const SIDEBAR_ICONS = [
  { icon: '⊞', label: 'Dashboard' },
  { icon: '◈', label: 'Tenders', active: true },
  { icon: '⊕', label: 'Applications' },
  { icon: '◎', label: 'Routes' },
  { icon: '▣', label: 'Performance' },
  { icon: '⊙', label: 'Intelligence' },
];

// ─── Product Hero ─────────────────────────────────────────────────────────────
function ProductHero({ reduced }: { reduced: boolean }) {
  const [activeTab, setActiveTab] = useState<TabKey>('tenders');

  const tabContent: Record<TabKey, React.ReactNode> = {
    tenders:      <TendersView />,
    applications: <ApplicationsView />,
    performance:  <PerformanceView />,
    routes:       <RoutesView />,
  };

  return (
    <section style={{ background: T.bg2 }} className="py-16 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        {/* Headline above mockup */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center mb-10"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: T.brand }}
          >
            The platform
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="text-[clamp(2.2rem,4vw,3.4rem)] font-bold leading-[1.08] tracking-tight"
            style={{ color: T.ink }}
          >
            Stop managing cargo GSAs with spreadsheets
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-[16px] leading-relaxed mx-auto max-w-2xl"
            style={{ color: T.inkMuted }}
          >
            AirGSA gives airlines and GSAs a shared operating platform for the full tender lifecycle —
            from first RFP to live monthly performance tracking.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-xl px-6 py-3 text-[13px] font-semibold text-white"
              style={{ background: T.brand, boxShadow: '0 4px 20px rgba(26,90,255,0.4)' }}
            >
              Book a demo
            </Link>
            <Link
              href="/login"
              className="rounded-xl border px-6 py-3 text-[13px] font-semibold"
              style={{ borderColor: T.border, color: T.inkMuted }}
            >
              Sign in
            </Link>
          </motion.div>
        </motion.div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.35 }}
          className="flex justify-center mb-4"
        >
          <div
            className="inline-flex rounded-xl border p-1 gap-1"
            style={{ borderColor: T.border, background: T.bg }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="rounded-lg px-4 py-2 text-[12px] font-semibold transition-all"
                style={{
                  background: activeTab === tab.key ? T.brand : 'transparent',
                  color: activeTab === tab.key ? '#FFFFFF' : T.inkMuted,
                  boxShadow: activeTab === tab.key ? '0 2px 10px rgba(26,90,255,0.35)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Browser chrome + app mockup */}
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 28, scale: reduced ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.45 }}
          className="rounded-2xl border overflow-hidden"
          style={{
            borderColor: T.border,
            boxShadow: '0 32px 80px rgba(11,30,79,0.12)',
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b"
            style={{ borderColor: T.border, background: T.bg3 }}
          >
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div
              className="flex-1 max-w-sm mx-auto flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px]"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.inkMuted }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              app.airgsa.com/airline/tenders
            </div>
            <div className="w-16" />
          </div>

          {/* App layout */}
          <div className="flex" style={{ height: 500, background: T.bg }}>
            {/* Sidebar */}
            <div
              className="w-14 shrink-0 flex flex-col items-center pt-5 pb-5 gap-5 border-r"
              style={{ borderColor: T.border, background: T.bg2 }}
            >
              {/* Logo */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white"
                style={{ background: T.brand }}
              >
                AG
              </div>
              <div className="w-px h-4" style={{ background: T.border }} />
              {SIDEBAR_ICONS.map(({ icon, label, active }) => (
                <div
                  key={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[15px] cursor-pointer transition-colors"
                  title={label}
                  style={{
                    background: active ? T.brandL : 'transparent',
                    color: active ? T.brand : T.inkFaint,
                  }}
                >
                  {icon}
                </div>
              ))}
            </div>

            {/* Main content with tab transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {tabContent[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Below mockup: trust markers */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.9 }}
          className="mt-6 flex flex-wrap justify-center gap-6 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: T.inkFaint }}
        >
          {['IATA-Aligned', 'GDP-Ready', 'SOC 2 In Progress', 'CEIV-Compatible'].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── "What makes it different" sections ──────────────────────────────────────
function DiffSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} style={{ background: T.bg }} className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-16 text-center"
        >
          <motion.p variants={fadeUp} className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: T.brand }}>
            What makes it different
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-[clamp(1.8rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-tight" style={{ color: T.ink }}>
            Built for the full tender lifecycle
          </motion.h2>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {[
            {
              num: '01',
              title: 'Structured RFPs',
              body: 'Replace PDFs and email threads with a digital tender brief. Lane specs, tonnage, compliance, timeline — all structured. Every tender is trackable, scorable, auditable.',
              detail: ['Route lanes with IATA codes', 'Tonnage and yield targets', 'Compliance requirements', 'Automatic GSA broadcast'],
            },
            {
              num: '02',
              title: 'AI-scored applications',
              body: 'Every GSA application is automatically scored across network coverage, financial strength, compliance credentials, and key account pipeline. Shortlist in minutes.',
              detail: ['Network coverage scoring', 'Commission structure analysis', 'Certificate verification', 'Side-by-side comparison'],
            },
            {
              num: '03',
              title: 'Live KPI monitoring',
              body: 'Once a GSA is activated, their monthly KPIs flow directly into your performance desk. Set targets, track actuals — no manual reporting required.',
              detail: ['Revenue and yield per route', 'Load factor vs. target', 'Monthly review triggers', 'Capacity alert broadcast'],
            },
          ].map(({ num, title, body, detail }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: reduced ? 0.1 : 0.6, ease: EASE, delay: reduced ? 0 : i * 0.12 }}
              className="rounded-2xl border p-7"
              style={{ borderColor: T.border, background: T.bg2 }}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color: T.brand }}>{num}</span>
              <h3 className="mt-3 text-[18px] font-bold" style={{ color: T.ink }}>{title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed" style={{ color: T.inkMuted }}>{body}</p>
              <ul className="mt-6 space-y-2.5">
                {detail.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[12px]" style={{ color: T.inkMuted }}>
                    <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {d}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Audience split ───────────────────────────────────────────────────────────
function AudienceSection({ reduced }: { reduced: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <section ref={ref} style={{ background: T.bg2, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }} className="py-20">
      <div className="mx-auto max-w-7xl px-6 grid gap-6 lg:grid-cols-2">
        {[
          {
            label: 'For Airlines',
            color: T.brand,
            title: 'Systematic GSA procurement',
            body: 'Replace ad-hoc GSA selection with structured digital tenders. Define lanes, requirements, and timelines — then let qualified partners compete on merit.',
            items: [
              'Publish structured RFPs with lane and tonnage specs',
              'AI-assisted scoring across network, financial & compliance',
              'Side-by-side application comparison',
              'Real-time performance tracking per GSA and route',
            ],
          },
          {
            label: 'For GSAs',
            color: '#7C3AED',
            title: 'Discover & win airline mandates',
            body: 'Stop chasing opportunity by email. Access a curated marketplace of open airline tenders, build a credible profile, and submit proposals that win.',
            items: [
              'Browse open tenders in your covered markets',
              'Build a scored GSA profile visible to airlines',
              'Submit structured proposals with network plans',
              'Track active contract KPIs and benchmarks',
            ],
          },
        ].map(({ label, color, title, body, items }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduced ? 0.1 : 0.6, ease: EASE, delay: reduced ? 0 : i * 0.12 }}
            className="rounded-2xl border p-7"
            style={{ borderColor: T.border, background: T.bg }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold"
              style={{ borderColor: `${color}30`, color, background: `${color}10` }}
            >
              {label}
            </span>
            <h3 className="mt-5 text-[18px] font-bold" style={{ color: T.ink }}>{title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: T.inkMuted }}>{body}</p>
            <ul className="mt-6 space-y-2.5">
              {items.map((it) => (
                <li key={it} className="flex items-start gap-2.5 text-[13px]" style={{ color: T.inkMuted }}>
                  <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {it}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });

  return (
    <section ref={ref} style={{ background: T.bg }} className="py-24 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${T.brand} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.025,
        }}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <motion.p variants={fadeUp} className="mb-5 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: T.brand }}>
          Get started
        </motion.p>
        <motion.h2 variants={fadeUp} className="text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.08] tracking-tight" style={{ color: T.ink }}>
          Launch your GSA network today
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-5 text-[15px] leading-relaxed mx-auto max-w-md" style={{ color: T.inkMuted }}>
          AirGSA is invite-only during the current rollout. Request access within 48 hours.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="rounded-xl px-7 py-3.5 text-[13px] font-semibold text-white" style={{ background: T.brand, boxShadow: '0 4px 24px rgba(26,90,255,0.42)' }}>
            Book a demo
          </Link>
          <Link href="/landing-concepts" className="rounded-xl border px-7 py-3.5 text-[13px] font-semibold" style={{ borderColor: T.border, color: T.inkMuted }}>
            ← All concepts
          </Link>
        </motion.div>
        <motion.p variants={fadeUp} className="mt-8 text-[10px] uppercase tracking-wider" style={{ color: T.inkFaint }}>
          Concept 3 · Preview only · Not a production route
        </motion.p>
      </motion.div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Concept3() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div style={{ fontFamily: 'var(--font-outfit, system-ui, sans-serif)' }}>
      <Nav />
      <ProductHero reduced={reduced} />
      <DiffSection reduced={reduced} />
      <AudienceSection reduced={reduced} />
      <CTA />
    </div>
  );
}
