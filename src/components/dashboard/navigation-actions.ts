export type DashboardRole = "airline" | "gsa" | "admin";

export type NavigationAction = {
  label: string;
  href: string;
  roles: DashboardRole[];
  keywords: string[];
  response: string;
  description: string;
};

const navigationActions: NavigationAction[] = [
  {
    label: "Control Center",
    href: "/airline",
    roles: ["airline"],
    keywords: ["control center", "dashboard", "overview", "airline start", "sales overview", "home"],
    response: "Opening the airline control center.",
    description: "Revenue, partner work, approvals, and watchlist.",
  },
  {
    label: "Create tender",
    href: "/airline/tenders/create",
    roles: ["airline"],
    keywords: ["tender create", "create tender", "new tender", "ausschreibung erstellen", "ausschreibung anlegen", "tender builder"],
    response: "Opening the tender builder.",
    description: "Build and publish a structured GSA mandate.",
  },
  {
    label: "Tender Pipeline",
    href: "/airline/tenders",
    roles: ["airline"],
    keywords: ["tenders", "tender pipeline", "tender workspace", "ausschreibungen", "tender list"],
    response: "Opening the tender pipeline.",
    description: "Track live tenders, stages, deadlines, and applications.",
  },
  {
    label: "Decision Room",
    href: "/airline/applications",
    roles: ["airline"],
    keywords: ["applications", "bewerbungen", "bewerber", "decision room", "gsa applications", "review applications"],
    response: "Opening the application decision room.",
    description: "Compare and accept GSA applications.",
  },
  {
    label: "Partner Activation",
    href: "/airline/gsa/overview",
    roles: ["airline"],
    keywords: ["partner activation", "partner profiles", "gsa partner", "route assignment", "contract routes", "routen zuweisen"],
    response: "Opening partner activation.",
    description: "Activate accepted partners and assign contract routes.",
  },
  {
    label: "Contracts & KPI",
    href: "/airline/contracts",
    roles: ["airline"],
    keywords: ["contracts", "kpi", "quote approvals", "monthly reports", "contract control", "approval queue"],
    response: "Opening contracts and KPI control.",
    description: "Approve exceptions, review reports, and manage control rules.",
  },
  {
    label: "Performance",
    href: "/airline/performance",
    roles: ["airline"],
    keywords: ["performance", "route performance", "revenue", "load factor", "yield", "kpi"],
    response: "Opening airline performance.",
    description: "Analyze route, country, and partner performance.",
  },
  {
    label: "Company Profile",
    href: "/airline/profile",
    roles: ["airline"],
    keywords: ["profile", "company profile", "company settings", "logo", "brand"],
    response: "Opening the company profile.",
    description: "Manage airline profile and public partner-facing assets.",
  },
  {
    label: "Team & Access",
    href: "/airline/team",
    roles: ["airline"],
    keywords: ["team", "access", "users", "permissions", "mitarbeiter", "rechte"],
    response: "Opening team and access.",
    description: "Invite users and manage workspace permissions.",
  },
  {
    label: "Today Cockpit",
    href: "/gsa",
    roles: ["gsa"],
    keywords: ["today cockpit", "dashboard", "gsa start", "home", "tasks today", "morning queue"],
    response: "Opening the GSA today cockpit.",
    description: "The shortest path to urgent customer and airline work.",
  },
  {
    label: "My Tasks",
    href: "/gsa/tasks",
    roles: ["gsa"],
    keywords: ["tasks", "my tasks", "aufgaben", "work queue", "control actions"],
    response: "Opening the task list.",
    description: "Open actions, follow-ups, and required responses.",
  },
  {
    label: "Quote Inbox",
    href: "/gsa/quotes",
    roles: ["gsa"],
    keywords: ["quotes", "quote inbox", "customer replies", "customer desk", "rate", "angebot", "kundenanfrage"],
    response: "Opening the quote inbox.",
    description: "Handle customer requests, quote rooms, and booking follow-up.",
  },
  {
    label: "Active Shipments",
    href: "/gsa/shipments",
    roles: ["gsa"],
    keywords: ["shipments", "active shipments", "awb", "bookings", "sendungen"],
    response: "Opening active shipments.",
    description: "Track operational bookings and AWB status.",
  },
  {
    label: "Cargo Workspace",
    href: "/gsa/cargo-workspace",
    roles: ["gsa"],
    keywords: ["cargo workspace", "ecargoware", "webcargo", "booking", "awb", "tracking", "rates", "raten"],
    response: "Opening the cargo workspace.",
    description: "Rates, booking, and tracking work with live or preview cargo-system calls.",
  },
  {
    label: "Airline Desk",
    href: "/gsa/airline-desk",
    roles: ["gsa"],
    keywords: ["airline desk", "airline communication", "airline chat", "airline reports", "airline actions", "reporting", "partner desk"],
    response: "Opening the airline desk.",
    description: "Reports, airline actions, partner signals, and tender follow-up.",
  },
  {
    label: "Tender Pipeline",
    href: "/gsa/tenders",
    roles: ["gsa"],
    keywords: ["tenders", "open tenders", "marketplace", "ausschreibungen", "apply", "bewerben"],
    response: "Opening the GSA tender pipeline.",
    description: "Find relevant mandates and continue applications.",
  },
  {
    label: "Monthly Reports",
    href: "/gsa/monthly-reports",
    roles: ["gsa"],
    keywords: ["monthly reports", "customer reports", "reports", "kpi reporting", "monat"],
    response: "Opening monthly reports.",
    description: "Submit contract reporting back to airlines.",
  },
  {
    label: "Performance",
    href: "/gsa/performance",
    roles: ["gsa"],
    keywords: ["performance", "kpi", "revenue", "tonnage", "win rate", "performance report"],
    response: "Opening GSA performance.",
    description: "Review KPIs and contract health.",
  },
  {
    label: "Customers",
    href: "/gsa/customers",
    roles: ["gsa"],
    keywords: ["customers", "kunden", "accounts", "customer list"],
    response: "Opening customers.",
    description: "Customer pipeline and account context.",
  },
  {
    label: "Integrations",
    href: "/gsa/integrations",
    roles: ["gsa"],
    keywords: ["integrations", "api", "ecargoware", "webcargo", "credentials", "connect"],
    response: "Opening integrations.",
    description: "Connect eCargoWare and other cargo-system credentials.",
  },
  {
    label: "GSA Profile",
    href: "/gsa/profile",
    roles: ["gsa"],
    keywords: ["profile", "company profile", "gsa profile", "firma", "logo"],
    response: "Opening the GSA profile.",
    description: "Manage partner-facing company data and assets.",
  },
  {
    label: "Team & Access",
    href: "/gsa/team",
    roles: ["gsa"],
    keywords: ["team", "access", "users", "permissions", "mitarbeiter", "rechte"],
    response: "Opening team and access.",
    description: "Invite users and manage workspace permissions.",
  },
  {
    label: "Admin Overview",
    href: "/admin",
    roles: ["admin"],
    keywords: ["admin", "overview", "dashboard", "health", "runtime"],
    response: "Opening admin overview.",
    description: "Platform health and admin summary.",
  },
  {
    label: "Accounts",
    href: "/admin/accounts",
    roles: ["admin"],
    keywords: ["accounts", "users", "registrations", "approvals", "invite", "admin users"],
    response: "Opening account management.",
    description: "Review registrations and manage platform accounts.",
  },
  {
    label: "Email Delivery",
    href: "/admin/email-deliveries",
    roles: ["admin"],
    keywords: ["email", "delivery", "mail", "invites", "sendgrid", "smtp"],
    response: "Opening email delivery.",
    description: "Inspect invite and workflow email status.",
  },
  {
    label: "Sources",
    href: "/admin/sources",
    roles: ["admin"],
    keywords: ["sources", "linkedin", "data sources", "source manager"],
    response: "Opening sources.",
    description: "Manage secondary data sources.",
  },
  {
    label: "Content Import",
    href: "/admin/content",
    roles: ["admin"],
    keywords: ["content", "import", "news", "posts"],
    response: "Opening content import.",
    description: "Import and review low-priority market content.",
  },
  {
    label: "FR24 API Test",
    href: "/admin/fr24",
    roles: ["admin"],
    keywords: ["fr24", "flight radar", "api test", "tracking"],
    response: "Opening FR24 diagnostics.",
    description: "Check optional live-flight provider connectivity.",
  },
];

export function getDashboardRole(pathname: string): DashboardRole {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/gsa")) return "gsa";
  return "airline";
}

export function getActionsForRole(role: DashboardRole) {
  return navigationActions.filter((action) => action.roles.includes(role));
}

export function findNavigationAction(input: string, role: DashboardRole) {
  return filterNavigationActions(input, role, 1)[0] ?? null;
}

export function filterNavigationActions(input: string, role: DashboardRole, limit = 6) {
  const normalized = normalizeSearch(input);
  const actions = getActionsForRole(role);
  if (!normalized) return actions.slice(0, limit);

  return actions
    .map((action) => ({ action, score: scoreAction(action, normalized) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.action);
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreAction(action: NavigationAction, query: string) {
  const label = normalizeSearch(action.label);
  const description = normalizeSearch(action.description);
  const keywords = action.keywords.map(normalizeSearch);
  const haystack = [label, description, ...keywords].join(" ");
  const tokens = query.split(" ").filter(Boolean);

  if (label === query) return 100;
  if (label.startsWith(query)) return 90;
  if (keywords.some((keyword) => keyword === query)) return 85;
  if (keywords.some((keyword) => keyword.startsWith(query))) return 75;
  if (label.includes(query)) return 70;
  if (keywords.some((keyword) => keyword.includes(query) || query.includes(keyword))) return 65;
  if (tokens.length > 0 && tokens.every((token) => haystack.includes(token))) return 45 + tokens.length;
  return 0;
}
