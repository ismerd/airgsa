import PptxGenJS from "pptxgenjs";

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";

// ── Brand colours ──────────────────────────────────────────────────────────────
const C = {
  bg:       "0F172A",  // slate-900
  card:     "1E293B",  // slate-800
  accent:   "67E8F9",  // cyan-300
  white:    "FFFFFF",
  muted:    "94A3B8",  // slate-400
  green:    "34D399",  // emerald-400
  blue:     "60A5FA",  // blue-400
  purple:   "A78BFA",  // violet-400
  amber:    "FBBF24",  // amber-400
};

function slide(title, sub) {
  const s = pptx.addSlide();
  s.background = { color: C.bg };
  if (title) {
    s.addText(title, {
      x: 0.4, y: 0.25, w: "90%", h: 0.55,
      fontSize: 24, bold: true, color: C.white, fontFace: "Calibri",
    });
  }
  if (sub) {
    s.addText(sub, {
      x: 0.4, y: 0.78, w: "90%", h: 0.32,
      fontSize: 13, color: C.accent, fontFace: "Calibri", italic: true,
    });
  }
  // thin accent line under header
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 1.08, w: 12.6, h: 0.03, fill: { color: C.accent }, line: { color: C.accent },
  });
  return s;
}

function box(s, x, y, w, h, opts = {}) {
  s.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: opts.fill || C.card },
    line: { color: opts.border || "334155", width: 1 },
    ...( opts.radius ? { rectRadius: 0.08 } : {} ),
  });
}

function label(s, text, x, y, w, h, opts = {}) {
  s.addText(text, {
    x, y, w, h,
    fontSize: opts.size || 11,
    color: opts.color || C.white,
    fontFace: "Calibri",
    bold: opts.bold || false,
    align: opts.align || "left",
    valign: opts.valign || "middle",
    wrap: true,
    ...opts.extra,
  });
}

function featureCard(s, x, y, w, title, bullets, color) {
  const h = 0.38 + bullets.length * 0.27;
  box(s, x, y, w, h, { fill: "1A2744", border: color });
  label(s, title, x + 0.12, y + 0.06, w - 0.2, 0.28,
    { size: 12, bold: true, color: color });
  bullets.forEach((b, i) => {
    label(s, "• " + b, x + 0.12, y + 0.34 + i * 0.27, w - 0.2, 0.25,
      { size: 10, color: C.muted });
  });
  return h;
}

void featureCard;

function badge(s, text, x, y, color) {
  s.addShape(pptx.ShapeType.rect, {
    x, y, w: 1.5, h: 0.28,
    fill: { color: "0E2233" }, line: { color: color, width: 1 },
  });
  s.addText(text, {
    x, y, w: 1.5, h: 0.28,
    fontSize: 9, color: color, fontFace: "Calibri",
    align: "center", valign: "middle", bold: true,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 1 – TITLE SLIDE
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg };

  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 7.5,
    fill: { type: "solid", color: "0D1B2E" },
    line: { color: "0D1B2E" },
  });
  // grid lines (decorative)
  for (let i = 0; i < 14; i++) {
    s.addShape(pptx.ShapeType.line, {
      x: i, y: 0, w: 0, h: 7.5,
      line: { color: "1E2D40", width: 0.5 },
    });
  }
  for (let j = 0; j < 8; j++) {
    s.addShape(pptx.ShapeType.line, {
      x: 0, y: j, w: 13.33, h: 0,
      line: { color: "1E2D40", width: 0.5 },
    });
  }

  // glow blob
  s.addShape(pptx.ShapeType.ellipse, {
    x: 5.5, y: 2.5, w: 3, h: 2,
    fill: { color: "083344" }, line: { color: "083344" },
  });

  s.addText("AirGSA", {
    x: 1, y: 1.8, w: 11, h: 1.4,
    fontSize: 64, bold: true, color: C.white, fontFace: "Calibri", align: "center",
  });
  s.addText("Platform Overview", {
    x: 1, y: 3.1, w: 11, h: 0.6,
    fontSize: 26, color: C.accent, fontFace: "Calibri", align: "center",
  });
  s.addText("Aviation Cargo Partner Network · Tender Management · KPI Monitoring · Market Intelligence", {
    x: 1, y: 3.75, w: 11, h: 0.4,
    fontSize: 13, color: C.muted, fontFace: "Calibri", align: "center",
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 5.3, y: 4.5, w: 2.7, h: 0.42,
    fill: { color: "0E7490" }, line: { color: "0E7490" },
  });
  s.addText("Prototype · April 2026", {
    x: 5.3, y: 4.5, w: 2.7, h: 0.42,
    fontSize: 11, color: C.white, fontFace: "Calibri", align: "center", valign: "middle",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 2 – PLATFORM ARCHITECTURE
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Platform Architecture", "Three role-based workspaces on a shared data layer");

  const zones = [
    { label: "AIRLINE", sub: "Tender desk & KPI", color: C.blue,   x: 0.4  },
    { label: "GSA",     sub: "Marketplace",       color: C.green,  x: 4.55 },
    { label: "ADMIN",   sub: "Governance",         color: C.purple, x: 8.7  },
  ];
  zones.forEach(z => {
    box(s, z.x, 1.3, 3.9, 3.8, { fill: "1A2744", border: z.color });
    s.addText(z.label, {
      x: z.x + 0.15, y: 1.45, w: 3.6, h: 0.45,
      fontSize: 20, bold: true, color: z.color, fontFace: "Calibri",
    });
    s.addText(z.sub, {
      x: z.x + 0.15, y: 1.88, w: 3.6, h: 0.28,
      fontSize: 11, color: C.muted, fontFace: "Calibri",
    });
    s.addShape(pptx.ShapeType.rect, {
      x: z.x, y: 2.12, w: 3.9, h: 0.03,
      fill: { color: z.color }, line: { color: z.color },
    });
  });

  // Airline features
  const af = ["Create & publish tenders", "Compare GSA applications", "Commercial KPI tracking", "Contract register", "Market intelligence feed"];
  af.forEach((t, i) => label(s, "▸ " + t, 0.55, 2.28 + i * 0.47, 3.6, 0.38, { size: 10.5, color: C.white }));

  // GSA features
  const gf = ["Browse open tenders", "Submit commercial proposals", "Company profile management", "Performance scorecard", "Notifications & alerts"];
  gf.forEach((t, i) => label(s, "▸ " + t, 4.7, 2.28 + i * 0.47, 3.6, 0.38, { size: 10.5, color: C.white }));

  // Admin features
  const adm = ["LinkedIn import (Apify)", "News source management", "Platform KPI overview", "Postgres schema ready", "Role governance"];
  adm.forEach((t, i) => label(s, "▸ " + t, 8.85, 2.28 + i * 0.47, 3.6, 0.38, { size: 10.5, color: C.white }));

  // Data layer
  box(s, 0.4, 5.3, 12.4, 0.7, { fill: "0F1F35", border: C.accent });
  label(s, "Shared Data Layer - Railway Postgres - Apify LinkedIn scraper - explicit production env validation",
    0.6, 5.38, 12.0, 0.54, { size: 11, color: C.accent, align: "center" });
}

// ══════════════════════════════════════════════════════════════════════════════
// 3 – PUBLIC PAGES
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Public Pages", "No authentication required · Entry points for all user types");

  const pages = [
    { route: "/",              name: "Landing Page",    color: C.accent,
      bullets: ["Hero with value proposition", "Live stats: revenue, loadfactor, GSA count", "Tender Control Tower preview card", "CTAs → Sign up / Marketplace"] },
    { route: "/pricing",       name: "Pricing",         color: C.blue,
      bullets: ["3 plans: GSA Network, Airline Desk, Enterprise", "Feature lists per plan", "Price points ($490 / $1 900 / custom)"] },
    { route: "/login",         name: "Login",           color: C.green,
      bullets: ["Email + password form", "Routes to role selection", "Postgres auth ready"] },
    { route: "/signup",        name: "Sign Up",         color: C.amber,
      bullets: ["Name, company, email, role fields", "Role dropdown (Airline / GSA / Admin)", "Postgres onboarding hook"] },
    { route: "/role-selection",name: "Role Selection",  color: C.purple,
      bullets: ["Post-login workspace picker", "Airline / GSA / Admin cards", "Each opens dedicated workspace"] },
  ];

  pages.forEach((p, i) => {
    const col = i < 3 ? 0 : 1;
    const row = i < 3 ? i : i - 3;
    const x = col === 0 ? 0.4 : 7.0;
    const y = 1.28 + row * 1.85;
    box(s, x, y, 6.2, 1.7, { fill: "17243A", border: p.color });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 6.2, h: 0.04, fill: { color: p.color }, line: { color: p.color } });
    label(s, p.name, x + 0.14, y + 0.1, 4, 0.35, { size: 13, bold: true, color: p.color });
    label(s, p.route, x + 4.2, y + 0.1, 1.9, 0.35, { size: 9, color: C.muted, align: "right" });
    p.bullets.forEach((b, bi) => {
      label(s, "• " + b, x + 0.14, y + 0.44 + bi * 0.28, 5.9, 0.26, { size: 10, color: C.muted });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 4 – AIRLINE WORKSPACE
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Airline Workspace", "Full tender desk — from RFP creation to GSA award and KPI monitoring");

  const pages = [
    { route: "/airline",               name: "Dashboard",        color: C.blue,
      bullets: ["Revenue, loadfactor, yield, active GSA KPI cards", "Tender overview + selection pipeline", "Map placeholder + top GSA profiles"] },
    { route: "/airline/tenders",       name: "Tender Overview",  color: C.accent,
      bullets: ["All tenders in card grid", "Status badges (open / draft)", "Link to application review per tender"] },
    { route: "/airline/tenders/create",name: "Create Tender",    color: C.green,
      bullets: ["RFP form: title, tonnage, markets, lanes, deadline", "Requirements & commercial expectations", "Publish or save as draft"] },
    { route: "/airline/applications",  name: "Applications",     color: C.amber,
      bullets: ["Side-by-side GSA comparison table", "Commercial / network / compliance scores", "Shortlist, Accept, Reject actions"] },
    { route: "/airline/performance",   name: "Performance",      color: C.purple,
      bullets: ["Revenue trend chart", "Yield chart", "Route-level watchlist (loadfactor / yield alerts)"] },
    { route: "/airline/contracts",     name: "Contracts & KPI",  color: C.green,
      bullets: ["Contract register table (partner, market, dates)", "KPI targets per contract", "Status: active / pending"] },
    { route: "/airline/intelligence",  name: "Intelligence",     color: C.muted,
      bullets: ["Embedded cargo news feed", "Category-filtered NewsCards", "Link to full news module"] },
    { route: "/airline/gsa/[id]",      name: "GSA Profile Detail",color: C.accent,
      bullets: ["Partner summary + scores", "Coverage & certifications", "Accept / Shortlist / Reject decision panel"] },
  ];

  const colW = 6.2;
  pages.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 0.4 : 6.75;
    const y = 1.28 + row * 1.52;
    box(s, x, y, colW, 1.38, { fill: "17243A", border: p.color });
    s.addShape(pptx.ShapeType.rect, { x, y, w: colW, h: 0.04, fill: { color: p.color }, line: { color: p.color } });
    label(s, p.name, x + 0.14, y + 0.08, 3.8, 0.3, { size: 12, bold: true, color: p.color });
    label(s, p.route, x + 3.9, y + 0.08, 2.1, 0.3, { size: 8.5, color: C.muted, align: "right" });
    p.bullets.forEach((b, bi) => {
      label(s, "• " + b, x + 0.14, y + 0.4 + bi * 0.29, colW - 0.25, 0.26, { size: 9.5, color: C.muted });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 5 – AIRLINE DASHBOARD (detail)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Airline Dashboard — Detail", "/airline · Main overview for AeroBridge Cargo");

  // KPI row
  const kpis = [
    { label: "Revenue",    value: "$1.26M",  change: "+14.6%",  color: C.green  },
    { label: "Loadfactor", value: "77%",     change: "+3 pts",  color: C.blue   },
    { label: "Yield",      value: "$3.21/kg",change: "+6.1%",   color: C.amber  },
    { label: "Active GSAs",value: "8",       change: "3 pending",color: C.purple },
  ];
  kpis.forEach((k, i) => {
    box(s, 0.4 + i * 3.12, 1.28, 3.0, 1.15, { fill: "17243A", border: k.color });
    label(s, k.label,  0.55 + i * 3.12, 1.35, 2.7, 0.3,  { size: 10, color: C.muted });
    label(s, k.value,  0.55 + i * 3.12, 1.64, 2.7, 0.45, { size: 22, bold: true, color: C.white });
    label(s, k.change, 0.55 + i * 3.12, 2.07, 2.7, 0.28, { size: 10, color: k.color });
  });

  // Tender overview
  box(s, 0.4, 2.58, 7.5, 2.35, { fill: "17243A", border: "334155" });
  label(s, "Tender Overview", 0.55, 2.65, 4, 0.32, { size: 13, bold: true, color: C.white });
  label(s, "+ Create tender", 6.0, 2.65, 1.8, 0.32, { size: 10, color: C.accent, align: "right" });
  const tenders = [
    { title: "Central Europe GSA", status: "Open",  deadline: "24 May 2026", lanes: "FRA/MUC/VIE → DXB", color: C.green },
    { title: "Nordic Cold-chain",  status: "Draft", deadline: "15 Jun 2026", lanes: "ARN/HEL → ORD",     color: C.amber },
  ];
  tenders.forEach((t, i) => {
    const ty = 3.06 + i * 0.8;
    box(s, 0.55, ty, 7.2, 0.66, { fill: "0F1F35", border: t.color });
    label(s, t.title,    0.7, ty + 0.06, 3.5, 0.28, { size: 11, bold: true, color: C.white });
    label(s, t.lanes,    0.7, ty + 0.34, 3.5, 0.24, { size: 9.5, color: C.muted });
    label(s, t.deadline, 4.3, ty + 0.06, 1.8, 0.28, { size: 10, color: C.muted });
    box(s, 6.25, ty + 0.12, 1.1, 0.28, { fill: t.color === C.green ? "064E3B" : "451A03", border: t.color });
    label(s, t.status,   6.25, ty + 0.12, 1.1, 0.28, { size: 9, bold: true, color: t.color, align: "center" });
  });

  // Selection pipeline
  box(s, 8.05, 2.58, 5.1, 2.35, { fill: "17243A", border: "334155" });
  label(s, "Selection Pipeline", 8.2, 2.65, 4, 0.32, { size: 13, bold: true, color: C.white });
  const apps = [
    { gsa: "BlueWing Cargo",         score: "91", comm: "5.8%+1.2%", color: C.green  },
    { gsa: "NordicLift Aviation",     score: "84", comm: "5.5%+1.0%", color: C.blue   },
    { gsa: "Alpine Route Partners",   score: "78", comm: "6.0%",      color: C.amber  },
  ];
  apps.forEach((a, i) => {
    const ay = 3.06 + i * 0.68;
    box(s, 8.2, ay, 4.8, 0.55, { fill: "0F1F35", border: "334155" });
    label(s, a.gsa,  8.35, ay + 0.04, 2.5, 0.28, { size: 10, bold: true, color: C.white });
    label(s, "Score: " + a.score, 8.35, ay + 0.3, 1.5, 0.2, { size: 9, color: C.muted });
    box(s, 10.8, ay + 0.1, 1.0, 0.28, { fill: "0B2B1F", border: a.color });
    label(s, a.comm, 10.8, ay + 0.1, 1.0, 0.28, { size: 9, color: a.color, align: "center" });
  });

  // Map placeholder
  box(s, 0.4, 5.08, 5.5, 1.2, { fill: "0D1E35", border: "1E3A5F" });
  label(s, "🗺  Route map (Mapbox placeholder)", 0.5, 5.08, 5.3, 1.2, { size: 11, color: "334155", align: "center", valign: "middle" });

  // GSA cards
  const gsas = ["BlueWing Cargo Solutions · DACH", "NordicLift Aviation · Nordics"];
  gsas.forEach((g, i) => {
    box(s, 6.1 + i * 3.45, 5.08, 3.2, 1.2, { fill: "17243A", border: "334155" });
    label(s, g, 6.25 + i * 3.45, 5.2, 2.9, 0.9, { size: 10, color: C.white });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 6 – TENDER LIFECYCLE
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Tender Lifecycle", "From RFP creation to GSA award — step-by-step flow");

  const steps = [
    { n: "1", label: "Create Tender",  route: "/airline/tenders/create", color: C.blue,
      detail: ["Title, markets, lanes, tonnage", "Deadline & requirements", "Publish or save draft"] },
    { n: "2", label: "GSAs Apply",     route: "/gsa/tenders/[id]/apply", color: C.green,
      detail: ["Commercial proposal", "Commission %", "Network & ops plan"] },
    { n: "3", label: "Compare",        route: "/airline/applications",   color: C.accent,
      detail: ["Score table: commercial / network / compliance", "Side-by-side view", "Shortlist action"] },
    { n: "4", label: "Award",          route: "/airline/applications",   color: C.amber,
      detail: ["Accept best application", "Status → accepted", "Contract created"] },
    { n: "5", label: "Monitor",        route: "/airline/contracts",      color: C.purple,
      detail: ["Contract register", "KPI targets", "Performance dashboard"] },
  ];

  steps.forEach((st, i) => {
    const x = 0.4 + i * 2.54;
    // connector arrow
    if (i < steps.length - 1) {
      s.addShape(pptx.ShapeType.line, {
        x: x + 2.4, y: 2.5, w: 0.28, h: 0,
        line: { color: C.muted, width: 1.5, endArrowType: "open" },
      });
    }
    box(s, x, 1.28, 2.3, 0.95, { fill: "17243A", border: st.color });
    label(s, st.n, x + 0.15, 1.33, 0.35, 0.35, { size: 20, bold: true, color: st.color });
    label(s, st.label, x + 0.52, 1.33, 1.65, 0.35, { size: 12, bold: true, color: C.white });
    label(s, st.route, x + 0.15, 1.72, 2.0, 0.22, { size: 8, color: C.muted });

    st.detail.forEach((d, di) => {
      label(s, "• " + d, x, 2.4 + di * 0.52, 2.3, 0.45, { size: 9.5, color: C.muted, align: "center" });
    });
  });

  // Status badge explanation
  box(s, 0.4, 4.1, 12.4, 1.3, { fill: "0F1F35", border: "334155" });
  label(s, "Tender Status Flow", 0.65, 4.2, 4, 0.3, { size: 12, bold: true, color: C.white });
  const statuses = [
    { label: "draft",       color: C.muted  },
    { label: "open",        color: C.blue   },
    { label: "shortlisted", color: C.accent },
    { label: "accepted",    color: C.green  },
    { label: "rejected",    color: "F87171" },
    { label: "active",      color: C.green  },
    { label: "pending",     color: C.amber  },
    { label: "closed",      color: C.muted  },
  ];
  statuses.forEach((st, i) => {
    badge(s, st.label, 0.55 + i * 1.55, 4.62, st.color);
  });

  // Create tender form detail
  box(s, 0.4, 5.55, 6.0, 1.75, { fill: "17243A", border: C.blue });
  label(s, "Create Tender — Form Fields", 0.6, 5.62, 5.5, 0.3, { size: 11, bold: true, color: C.blue });
  const fields = ["Tender title", "Annual tonnage (kg)", "Markets (regions)", "Core lanes", "Status", "Deadline", "Requirements (text)", "Commercial expectations (text)"];
  fields.forEach((f, i) => {
    const col = i % 2; const row = Math.floor(i / 2);
    label(s, "□ " + f, 0.55 + col * 3.0, 5.97 + row * 0.3, 2.85, 0.28, { size: 9.5, color: C.muted });
  });

  // Compare table
  box(s, 6.6, 5.55, 6.5, 1.75, { fill: "17243A", border: C.accent });
  label(s, "Applications Table — Columns", 6.8, 5.62, 6.0, 0.3, { size: 11, bold: true, color: C.accent });
  const cols2 = ["GSA name (link)", "Commercial score", "Network score", "Compliance score", "Proposed commission", "Status badge", "Shortlist", "Accept / Reject"];
  cols2.forEach((c, i) => {
    const col = i % 2; const row = Math.floor(i / 2);
    label(s, "□ " + c, 6.75 + col * 3.2, 5.97 + row * 0.3, 3.1, 0.28, { size: 9.5, color: C.muted });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 7 – GSA WORKSPACE
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("GSA Workspace", "Opportunity discovery, proposals, profile, performance and notifications");

  const pages = [
    { route: "/gsa",                       name: "Marketplace",     color: C.green,
      bullets: ["Open tenders count / matched markets", "All tenders as browsable cards", "Open tender CTA per card"] },
    { route: "/gsa/tenders/[id]",          name: "Tender Detail",   color: C.blue,
      bullets: ["Airline, lanes, tonnage, deadline", "Markets & requirements", "91% match score + fit summary", "Apply button"] },
    { route: "/gsa/tenders/[id]/apply",    name: "Apply to Tender", color: C.accent,
      bullets: ["Commission %, timeline, account coverage", "Monthly sales target", "Network & operational readiness text", "Submit proposal"] },
    { route: "/gsa/profile",               name: "Company Profile", color: C.amber,
      bullets: ["Company name, HQ, summary", "Certifications badges", "Cargo focus, coverage, win rate, compliance"] },
    { route: "/gsa/performance",           name: "Performance",     color: C.purple,
      bullets: ["Revenue trend chart", "Yield chart", "GSA-scaled data (42% of airline baseline)"] },
    { route: "/gsa/notifications",         name: "Notifications",   color: C.green,
      bullets: ["Stacked notification cards", "Title + body + timestamp", "Cyan border on unread items"] },
  ];

  const colW = 6.15;
  pages.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 0.4 : 6.75;
    const y = 1.28 + row * 1.98;
    box(s, x, y, colW, 1.84, { fill: "17243A", border: p.color });
    s.addShape(pptx.ShapeType.rect, { x, y, w: colW, h: 0.04, fill: { color: p.color }, line: { color: p.color } });
    label(s, p.name, x + 0.14, y + 0.1, 3.8, 0.32, { size: 13, bold: true, color: p.color });
    label(s, p.route, x + 3.9, y + 0.1, 2.1, 0.32, { size: 8.5, color: C.muted, align: "right" });
    p.bullets.forEach((b, bi) => {
      label(s, "• " + b, x + 0.14, y + 0.48 + bi * 0.36, colW - 0.25, 0.32, { size: 10, color: C.muted });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 8 – NEWS / CARGO INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("News & Cargo Intelligence", "Market signals sourced from LinkedIn via Apify · available to all workspaces");

  // News feed card
  box(s, 0.4, 1.28, 7.8, 4.45, { fill: "17243A", border: C.accent });
  label(s, "News Feed  /news", 0.6, 1.38, 5, 0.36, { size: 14, bold: true, color: C.accent });

  const cats = ["GSA opportunity", "airline expansion", "new route", "cargo capacity", "tender/RFP", "partnership"];
  cats.forEach((c, i) => {
    box(s, 0.6 + i * 1.27, 1.88, 1.2, 0.28, { fill: "0E2233", border: C.accent });
    label(s, c, 0.6 + i * 1.27, 1.88, 1.2, 0.28, { size: 7.5, color: C.accent, align: "center", valign: "middle" });
  });

  const cards = [
    { title: "Lufthansa Cargo eyes GSA reshuffle in DACH region",   cat: "GSA opportunity",   src: "linkedin/lufthansa" },
    { title: "Emirates SkyCargo doubles pharma capacity FRA-DXB",   cat: "cargo capacity",    src: "linkedin/emirates"  },
    { title: "New cold-chain route Stockholm–Chicago live Q3 2026", cat: "new route",          src: "linkedin/sas"       },
    { title: "AirFrance KLM issues DACH tender — deadline July",    cat: "tender/RFP",         src: "linkedin/afkl"      },
  ];
  cards.forEach((c, i) => {
    const col = i % 2; const row = Math.floor(i / 2);
    const cx = 0.6 + col * 3.8; const cy = 2.32 + row * 1.5;
    box(s, cx, cy, 3.6, 1.35, { fill: "0F1F35", border: "334155" });
    box(s, cx, cy, 3.6, 0.28, { fill: "0E2233", border: "0E2233" });
    label(s, c.cat, cx + 0.1, cy + 0.02, 3.4, 0.24, { size: 8.5, color: C.accent });
    label(s, c.title, cx + 0.1, cy + 0.33, 3.4, 0.58, { size: 9.5, color: C.white });
    label(s, c.src, cx + 0.1, cy + 1.1, 3.4, 0.2, { size: 8, color: C.muted });
  });

  // Sources page
  box(s, 8.4, 1.28, 4.7, 4.45, { fill: "17243A", border: C.blue });
  label(s, "LinkedIn Sources  /news/sources", 8.6, 1.38, 4.3, 0.36, { size: 13, bold: true, color: C.blue });
  const sourceSections = [
    { label: "Add Source form", items: ["Company / page name", "LinkedIn URL", "Category dropdown", "Add source button"] },
    { label: "Source table columns", items: ["Source name", "URL (cyan link)", "Category", "Last import date", "Status badge"] },
  ];
  let sy = 1.88;
  sourceSections.forEach(sec => {
    label(s, sec.label, 8.6, sy, 4.2, 0.28, { size: 10.5, bold: true, color: C.white });
    sy += 0.3;
    sec.items.forEach(it => {
      label(s, "• " + it, 8.7, sy, 4.0, 0.26, { size: 9.5, color: C.muted });
      sy += 0.28;
    });
    sy += 0.12;
  });

  // Admin import
  box(s, 8.4, 4.02, 4.7, 1.65, { fill: "17243A", border: C.purple });
  label(s, "Admin LinkedIn Import", 8.6, 4.1, 4.2, 0.3, { size: 12, bold: true, color: C.purple });
  const importItems = ["Apify actor WI0tj4Ieb5Kq458gB", "postedLimit: 1h / 24h / week / month…", "targetUrls (one per line)", "includeReposts / includeQuotePosts", "Batch mode (max 6 URLs/call)"];
  importItems.forEach((it, i) => {
    label(s, "• " + it, 8.6, 4.46 + i * 0.23, 4.3, 0.22, { size: 9.5, color: C.muted });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 9 – ADMIN CONSOLE
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Admin Console", "/admin · Platform operations oversight and LinkedIn import management");

  // KPI cards
  const kpis = [
    { label: "Users",          value: "18",  color: C.blue   },
    { label: "Companies",      value: "11",  color: C.green  },
    { label: "Imported posts", value: "124", color: C.accent },
    { label: "Tables ready",   value: "11",  color: C.purple },
  ];
  kpis.forEach((k, i) => {
    box(s, 0.4 + i * 3.12, 1.28, 3.0, 0.95, { fill: "17243A", border: k.color });
    label(s, k.label, 0.6 + i * 3.12, 1.35, 2.6, 0.28, { size: 10, color: C.muted });
    label(s, k.value, 0.6 + i * 3.12, 1.62, 2.6, 0.5,  { size: 28, bold: true, color: k.color });
  });

  // LinkedIn import panel
  box(s, 0.4, 2.42, 7.5, 4.85, { fill: "17243A", border: "334155" });
  label(s, "LinkedIn Import — Left Panel (Settings)", 0.6, 2.52, 7.0, 0.32, { size: 13, bold: true, color: C.white });

  const importFields = [
    { label: "Access Token",      desc: "Server-side Apify API key from environment",        color: C.accent },
    { label: "LinkedIn pages",    desc: "One URL per line (profile / company / post URLs)",  color: C.blue   },
    { label: "Import posts from", desc: "Dropdown: 1h / 24h / week / month / year / any",   color: C.green  },
    { label: "Automatic import",  desc: "Checkbox + interval (hours / days / weeks)",        color: C.amber  },
    { label: "Include reposts",   desc: "Toggle reposts & quote posts",                       color: C.purple },
  ];
  importFields.forEach((f, i) => {
    box(s, 0.55, 2.93 + i * 0.74, 7.2, 0.66, { fill: "0F1F35", border: "334155" });
    label(s, f.label, 0.72, 2.97 + i * 0.74, 2.2, 0.28, { size: 10.5, bold: true, color: f.color });
    label(s, f.desc,  0.72, 3.25 + i * 0.74, 6.8, 0.28, { size: 9.5, color: C.muted });
  });

  // Right panel — summary
  box(s, 8.1, 2.42, 5.0, 2.4, { fill: "17243A", border: "334155" });
  label(s, "Current Setup Summary (Right Panel)", 8.3, 2.52, 4.6, 0.32, { size: 12, bold: true, color: C.white });
  const summaryItems = ["Sources watched (count)", "Posts from (human label)", "Apify filter value (mono)", "Schedule on/off", "Quote posts included/ignored", "Reposts included/ignored"];
  summaryItems.forEach((it, i) => {
    label(s, "• " + it, 8.3, 2.9 + i * 0.3, 4.6, 0.28, { size: 9.5, color: C.muted });
  });

  // Post preview
  box(s, 8.1, 4.97, 5.0, 2.28, { fill: "17243A", border: "334155" });
  label(s, "Post Preview (after import)", 8.3, 5.07, 4.6, 0.3, { size: 12, bold: true, color: C.white });
  const prevItems = ["Author name + LinkedIn URL", "Post text (4-line clamp)", "Published date", "Media cards (image / document)", "Width × height if available"];
  prevItems.forEach((it, i) => {
    label(s, "• " + it, 8.3, 5.43 + i * 0.3, 4.6, 0.28, { size: 9.5, color: C.muted });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 10 – TECH STACK
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = slide("Tech Stack & Architecture", "Production-ready foundations with persistent operational data");

  const cols = [
    { title: "Frontend", color: C.blue, items: [
      "Next.js 15 (App Router)",
      "React 19",
      "Tailwind CSS v4",
      "Lucide React (icons)",
      "Recharts (KPI charts)",
      "TypeScript 5",
    ]},
    { title: "Backend / API", color: C.green, items: [
      "Next.js Route Handlers",
      "Node.js runtime",
      "Apify Client SDK",
      "Actor: WI0tj4Ieb5Kq458gB",
      "Batch size: 6 URLs/call",
      "maxDuration: 300 s",
    ]},
    { title: "Database", color: C.accent, items: [
      "Railway Postgres",
      "pg client",
      "news_posts table",
      "DATABASE_URL (server)",
      "Private attachment storage",
    ]},
    { title: "Deployment", color: C.purple, items: [
      "Railway (production)",
      "LINKEDIN_API_TOKEN env var",
      "PORT auto-assigned",
      "scripts/start.mjs",
      "Node ≥ 20, < 23",
      "Private repo",
    ]},
  ];

  cols.forEach((c, i) => {
    const x = 0.4 + i * 3.22;
    box(s, x, 1.28, 3.0, 4.7, { fill: "17243A", border: c.color });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.28, w: 3.0, h: 0.38, fill: { color: c.color }, line: { color: c.color } });
    label(s, c.title, x + 0.12, 1.3, 2.75, 0.34, { size: 13, bold: true, color: "000000" });
    c.items.forEach((it, ii) => {
      label(s, it, x + 0.15, 1.84 + ii * 0.57, 2.7, 0.48, { size: 10.5, color: C.white });
      s.addShape(pptx.ShapeType.line, {
        x: x + 0.1, y: 2.38 + ii * 0.57, w: 2.8, h: 0,
        line: { color: "1E3A5F", width: 0.5 },
      });
    });
  });

  // env vars table
  box(s, 0.4, 6.13, 12.5, 1.15, { fill: "0F1F35", border: "334155" });
  label(s, "Required environment variables", 0.6, 6.2, 5, 0.28, { size: 11, bold: true, color: C.white });
  const envs = [
    { key: "LINKEDIN_API_TOKEN",           desc: "Apify API key",         required: true  },
    { key: "DATABASE_URL",                 desc: "Railway Postgres",      required: true  },
    { key: "AUTH_SESSION_SECRET",          desc: "Session signing key",   required: true  },
    { key: "RAILWAY_VOLUME_MOUNT_PATH",    desc: "Attachment storage",    required: false },
  ];
  envs.forEach((e, i) => {
    label(s, e.key, 0.6 + i * 3.1, 6.54, 2.9, 0.28, { size: 8.5, color: C.accent, extra: { fontFace: "Courier New" } });
    label(s, e.desc + (e.required ? " *" : ""), 0.6 + i * 3.1, 6.8, 2.9, 0.28, { size: 8.5, color: C.muted });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SAVE
// ══════════════════════════════════════════════════════════════════════════════
const out = "AirGSA-Platform-Overview.pptx";
await pptx.writeFile({ fileName: out });
console.log("Saved:", out);
