import Link from 'next/link';

const CONCEPTS = [
  {
    num: 10,
    href: '/landing-concepts/concept-10',
    title: '★★ Scroll Cinema',
    tagline: 'GSAP Scrub · 13 Bilder · Video-Style',
    description:
      'Alle 13 AI-Bilder scrollen als Film-Sequenz durch — GSAP steuert Crossfade + Ken Burns. ' +
      '4 Kapitel mit eigenem Accent-Color und Headline. Fortschrittsbalken + Kapitel-Dots. ' +
      'Upgrade-Pfad für echtes Video-Scrubbing (Apple-style) ist fertig einkommentiert.',
    bg: 'from-[#050D1E] to-[#071830]',
    border: '#0F2040',
    accent: '#60A5FA',
    badge: 'bg-[#050D1E] text-[#60A5FA] border border-[#0F2040]',
    pill: '★★ Krasseste Animation · Video-ready',
    dark: true,
  },
  {
    num: 9,
    href: '/landing-concepts/concept-9',
    title: '★ Deep Parallax',
    tagline: 'Multi-Layer Parallax · 5 Scenes · Real Images',
    description:
      'Klassisches Parallax-Prinzip: 5 vollformatige Bildszenen scrollen mit unterschiedlicher ' +
      'Geschwindigkeit — Hintergrund langsamer, Text leicht schneller als die Seite. ' +
      'Wechsel zwischen Dark-Image-Sections und hellen Content-Breaks. Alle AI-Bilder genutzt.',
    bg: 'from-[#071830] to-[#0C2040]',
    border: '#162040',
    accent: '#60A5FA',
    badge: 'bg-[#071830] text-[#60A5FA] border border-[#162040]',
    pill: '★ Neu · Parallax · 5 Szenen',
    dark: true,
  },
  {
    num: 6,
    href: '/landing-concepts/concept-6',
    title: '★ Global Prestige',
    tagline: 'Navy · Gold · Parallax Hero · Real Images',
    description:
      'Luxury airline aesthetic — deep navy + gold, full-bleed parallax takeoff hero, ' +
      'split image/text sections with all real AI-generated images. ' +
      'Inspired by Emirates & Qatar Airways premium brand feel.',
    bg: 'from-[#08152E] to-[#0C1E3E]',
    border: '#1A3060',
    accent: '#C9A84C',
    badge: 'bg-[#0C1E3E] text-[#E8C96E] border border-[#1A3060]',
    pill: '★ Neu · Real Images · Prestige',
    dark: true,
  },
  {
    num: 7,
    href: '/landing-concepts/concept-7',
    title: '★ Sky Commerce',
    tagline: 'Bright White · Blue · Split Hero · 3 Steps',
    description:
      'Clean modern B2B SaaS — white dominant with electric blue. ' +
      'Split hero (text + sky image), 3-step how-it-works with real photos, ' +
      'full-bleed cargo image section. Professional, airy, trustworthy.',
    bg: 'from-white to-[#F4F7FF]',
    border: '#DDE4F5',
    accent: '#1A5AFF',
    badge: 'bg-[#EBF1FF] text-[#1A5AFF]',
    pill: '★ Neu · Bright · B2B Clean',
  },
  {
    num: 8,
    href: '/landing-concepts/concept-8',
    title: '★ Bento Grid',
    tagline: 'All Images · Grid Layout · Sky Blue',
    description:
      'Modern product grid — shows all AI-generated images at once in a rich bento layout. ' +
      'Sky blue + cyan on dark navy. Every scene visible: meetings, cargo, takeoff, network. ' +
      'Bold headline, gradient text, stagger-reveal tiles.',
    bg: 'from-[#050D1E] to-[#0A1628]',
    border: '#162040',
    accent: '#3B82F6',
    badge: 'bg-[#0A1628] text-[#60A5FA] border border-[#162040]',
    pill: '★ Neu · Bento · All Scenes',
    dark: true,
  },
  {
    num: 5,
    href: '/landing-concepts/concept-5',
    title: 'Cinematic Story',
    tagline: 'GSAP Scroll · 3 Szenen · Story-driven',
    description:
      'Story-driven Scroll-Experience. Meeting → Cargo → Take-off. ' +
      'GSAP sticky sections, Ken Burns parallax, particle system, connection animation. ' +
      'Aviation sky-blue palette — cinematische, vollständige Landingpage.',
    bg: 'from-[#001A6E] to-[#003399]',
    border: '#162040',
    accent: '#3B82F6',
    badge: 'bg-[#001A6E] text-[#60A5FA] border border-[#162040]',
    pill: 'Story · GSAP · Cinematic',
    dark: true,
  },
  {
    num: 1,
    href: '/landing-concepts/concept-1',
    title: 'Premium Aviation SaaS',
    tagline: 'Apple · Linear · Stripe-inspired',
    description:
      'Hell, luftig, clean. Radikale Weißraum-Ästhetik, animierte Metriken, ' +
      'überlappende Produkt-UI-Cards im Hero. Konvertiert Entscheider die Qualität erwarten.',
    bg: 'from-white to-[#F0F4FF]',
    border: '#DDE4F5',
    accent: '#1A5AFF',
    badge: 'bg-[#EBF1FF] text-[#1A5AFF]',
    pill: 'Hell · Clean · Premium',
  },
  {
    num: 2,
    href: '/landing-concepts/concept-2',
    title: 'Futuristic Cargo Network',
    tagline: '3D-Globe · Route-Arcs · Dark Tech',
    description:
      'Dunkel, technologisch, autoritär. Three.js-Globus mit animierten Cargo-Routen ' +
      'als vollflächiger Hero. Mission-Control-Ästhetik für globale Netzwerk-Positionierung.',
    bg: 'from-[#060B18] to-[#0C1428]',
    border: '#162040',
    accent: '#1A5AFF',
    badge: 'bg-[#0C1428] text-[#00D4FF] border border-[#162040]',
    pill: 'Dunkel · 3D · Global',
    dark: true,
  },
  {
    num: 3,
    href: '/landing-concepts/concept-3',
    title: 'Product-First Dashboard',
    tagline: "Show don't tell · UI im Hero",
    description:
      'Der erste Eindruck IS das Produkt. Großes Browser-Mockup mit echtem ' +
      'Tender-Board, Application-Scoring und Performance-Dashboard. Tab-Navigation direkt im Hero.',
    bg: 'from-[#F7F9FF] to-white',
    border: '#DDE4F5',
    accent: '#1A5AFF',
    badge: 'bg-[#EBF1FF] text-[#1A5AFF]',
    pill: 'Produkt-Fokus · Direkt · Vertrauend',
  },
  {
    num: 4,
    href: '/landing-concepts/concept-4',
    title: 'Tender Journey Storytelling',
    tagline: 'GSAP Scroll · 6 Stages · Horizontal',
    description:
      'Scroll-basiertes Storytelling durch den kompletten Tender-Lifecycle: ' +
      'Tender → Bewerbungen → AI-Scoring → Award → Route-Aktivierung → Performance. ' +
      'GSAP-gesteuerte horizontale Scroll-Stage-Transitions.',
    bg: 'from-[#0B1E4F] to-[#0F2468]',
    border: '#1C3070',
    accent: '#1A5AFF',
    badge: 'bg-[#1C3070] text-[#7FA8FF] border border-[#1C3070]',
    pill: 'Storytelling · GSAP · Journey',
    dark: true,
  },
];

export default function LandingConceptsIndex() {
  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Header */}
      <div className="border-b border-[#162040] px-6 py-5">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#4A6090]">
              AirGSA / Design Lab
            </span>
            <h1 className="mt-1 text-[18px] font-bold text-[#E0E8FF]">
              Landing Page Konzepte <span className="text-[#4A6090] font-normal text-[14px]">10 Konzepte</span>
            </h1>
          </div>
          <Link
            href="/"
            className="text-[11px] text-[#4A6090] hover:text-[#E0E8FF] transition-colors"
          >
            ← Zurück zur Hauptseite
          </Link>
        </div>
      </div>

      {/* Intro */}
      <div className="mx-auto max-w-5xl px-6 pt-10 pb-6">
        <p className="text-[14px] leading-relaxed text-[#5A7090] max-w-2xl">
          Zehn isolierte Landingpage-Konzepte für AirGSA — davon drei neu mit echten AI-generierten Bildern.
          Jedes Konzept ist eine eigenständige Preview-Route ohne Verbindung zu produktiven Routen, Auth oder APIs.
          Konzepte 6–8 nutzen deine generierten Bilder aus <code className="text-[#4A7090]">/public/landing/</code>.
        </p>
      </div>

      {/* Concept grid */}
      <div className="mx-auto max-w-5xl px-6 pb-16 grid gap-5 sm:grid-cols-2">
        {CONCEPTS.map((c) => (
          <Link
            key={c.num}
            href={c.href}
            className="group relative block overflow-hidden rounded-2xl border transition-all duration-300
                       hover:shadow-[0_8px_40px_rgba(26,90,255,0.18)] hover:-translate-y-0.5"
            style={{ borderColor: c.border }}
          >
            {/* Preview gradient swatch */}
            <div
              className={`h-36 bg-gradient-to-br ${c.bg} relative`}
            >
              {/* Concept number */}
              <div
                className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center
                           rounded-lg text-[13px] font-extrabold text-white"
                style={{ background: c.accent }}
              >
                {c.num}
              </div>
              {/* Pill */}
              <div
                className={`absolute bottom-4 left-4 rounded-full px-2.5 py-1
                            text-[10px] font-semibold ${c.badge}`}
              >
                {c.pill}
              </div>
              {/* Arrow hover indicator */}
              <div
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center
                           rounded-full opacity-0 transition-all group-hover:opacity-100"
                style={{ background: c.accent + '20', color: c.accent }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 bg-[#0F1E38] border-t" style={{ borderColor: c.border }}>
              <p
                className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: c.accent }}
              >
                {c.tagline}
              </p>
              <h2 className="text-[15px] font-bold text-[#E0E8FF]">{c.title}</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[#5A7090]">
                {c.description}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: c.accent }}>
                Konzept öffnen
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <div className="border-t border-[#162040] px-6 py-8 text-center">
        <p className="text-[11px] text-[#3A5070]">
          Isolierte Preview-Routen · Keine produktiven Seiten verändert · AirGSA Design Lab 2026
        </p>
      </div>
    </div>
  );
}
