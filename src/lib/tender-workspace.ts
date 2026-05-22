import type { BadgeProps } from "@/components/ui/badge";
import type { LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";

export type TenderStageKey =
  | "draft"
  | "published"
  | "applications-open"
  | "evaluation"
  | "shortlisted"
  | "awarded"
  | "closed";

export type TenderStage = {
  key: TenderStageKey;
  label: string;
  variant: BadgeProps["variant"];
  progress: number;
};

export type StructuredGsaApplication = {
  id: string;
  gsaName: string;
  companyProfile: string;
  country: string;
  offices: string[];
  teamSize: number;
  yearsInCargoSales: number;
  currentAirlineRepresentations: string[];
  coveredAirports: string[];
  keyCustomerSegments: string[];
  cargoCapabilities: string[];
  salesStrategy: string;
  expectedMonthlyTonnage: string;
  first90DaysPlan: string;
  documentsCount: number;
  status: LiveTenderApplication["status"];
  strengths: string[];
};

export type CandidateScorecard = {
  applicationId: string;
  overallFit: number;
  marketCoverageScore: number;
  salesStrengthScore: number;
  cargoCapabilityScore: number;
  commercialPlanScore: number;
  riskLevel: "Low" | "Medium" | "High";
  recommendation: "Strong contender" | "Shortlist" | "Review carefully" | "Do not advance";
  summary: string;
};

const AIRPORTS_BY_MARKET: Record<string, string[]> = {
  DACH: ["FRA", "MUC", "VIE", "ZRH"],
  Germany: ["FRA", "MUC", "DUS", "HAM"],
  France: ["CDG", "ORY", "LYS", "MRS"],
  UK: ["LHR", "MAN", "STN"],
  Benelux: ["AMS", "BRU", "LGG"],
  Iberia: ["MAD", "BCN", "LIS"],
  Asia: ["HKG", "SIN", "BKK"],
  China: ["PVG", "SZX", "CAN"],
  India: ["BOM", "DEL", "BLR"],
  Africa: ["JNB", "NBO", "CAI"],
};

export function getApplicationsForTender(tenderId: string, applications: LiveTenderApplication[]) {
  return applications.filter((application) => application.tenderId === tenderId);
}

export function getTenderStage(tender: LiveTender, applications: LiveTenderApplication[]): TenderStage {
  const rows = getApplicationsForTender(tender.id, applications);
  const accepted = rows.filter((row) => row.status === "accepted").length;
  const shortlisted = rows.filter((row) => row.status === "shortlisted").length;

  if (tender.status === "draft") return { key: "draft", label: "Draft", variant: "muted", progress: 12 };
  if (accepted > 0) return { key: "awarded", label: "Awarded", variant: "success", progress: 100 };
  if (tender.status === "closed") return { key: "closed", label: "Closed", variant: "muted", progress: 100 };
  if (shortlisted > 0) return { key: "shortlisted", label: "Shortlisted", variant: "warning", progress: 72 };
  if (rows.length > 0) return { key: "evaluation", label: "Evaluation", variant: "warning", progress: 55 };
  if (!tender.deadline) return { key: "published", label: "Published", variant: "default", progress: 28 };
  return { key: "applications-open", label: "Applications Open", variant: "default", progress: 38 };
}

export function getTenderAirports(tender: LiveTender) {
  const routeAirports = tender.routes.flatMap((route) => [route.origin, route.destination]);
  const laneAirports = tender.lanes.match(/\b[A-Z]{3}\b/g) ?? [];
  return Array.from(new Set([...routeAirports, ...laneAirports].map((item) => item.toUpperCase()))).filter(Boolean);
}

export function getTenderCargoTypes(tender: LiveTender) {
  return tender.productMix
    .split(/[,/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getTenderIntelligenceSummary(tender: LiveTender, applications: LiveTenderApplication[]) {
  const stage = getTenderStage(tender, applications);
  const airports = getTenderAirports(tender);
  const cargoTypes = getTenderCargoTypes(tender);
  const monthlyTonnage = Math.round((tender.annualTonnage || 0) / 12);

  return `${tender.airline} is sourcing ${getMandateLabel(tender)} for ${tender.countryScope || tender.regions.join(", ") || "the selected market"} under a ${getCoverageLabel(tender)} coverage model with ${
    monthlyTonnage ? `${monthlyTonnage.toLocaleString()} tons monthly` : "a market-led tonnage target"
  }. The tender is currently in ${stage.label.toLowerCase()} stage. ${
    airports.length ? `Primary airport focus is ${airports.join(", ")}.` : "The scope is market-led rather than lane-specific."
  } ${
    cargoTypes.length ? `Cargo focus includes ${cargoTypes.join(", ")}.` : "Cargo focus should be clarified during evaluation."
  } Applications should be compared on market coverage, cargo capability, sales execution, required capability fit, and commercial readiness.`;
}

export function toStructuredApplication(tender: LiveTender, application: LiveTenderApplication): StructuredGsaApplication {
  const airports = getCoverageAirports(tender, application);
  const teamSize = Math.max(5, Math.round((application.networkScore + application.complianceScore) / 5));
  const yearsInCargoSales = Math.max(3, Math.round(application.winRate / 4));
  const cargoTypes = getTenderCargoTypes(tender);
  const capabilities = Array.from(
    new Set([
      ...application.cargoFocus.split(/[,/]/).map((item) => item.trim()).filter(Boolean),
      ...application.certifications,
      ...cargoTypes.filter((type) => type.length > 0),
    ]),
  );

  return {
    id: application.id,
    gsaName: application.gsaName,
    companyProfile: `${application.gsaName} is a cargo sales partner headquartered in ${application.headquarters}, covering ${application.coverage.join(", ")}.`,
    country: application.headquarters,
    offices: application.coverage.slice(0, 5),
    teamSize,
    yearsInCargoSales,
    currentAirlineRepresentations: buildRepresentations(application),
    coveredAirports: airports,
    keyCustomerSegments: buildCustomerSegments(tender, application),
    cargoCapabilities: capabilities.slice(0, 8),
    salesStrategy: application.networkPlan || "Sales strategy not provided.",
    expectedMonthlyTonnage: application.monthlySalesTarget || "Not provided",
    first90DaysPlan: application.operationalReadiness || application.launchTimeline || "Not provided.",
    documentsCount: application.documents.length,
    status: application.status,
    strengths: buildStrengths(tender, application, airports),
  };
}

export function scoreCandidate(tender: LiveTender, application: LiveTenderApplication): CandidateScorecard {
  const tenderAirports = getTenderAirports(tender);
  const structured = toStructuredApplication(tender, application);
  const marketCoverageScore = scoreMarketCoverage(tender, tenderAirports, structured.coveredAirports, application);
  const cargoCapabilityScore = scoreCargoCapability(tender, structured);
  const salesStrengthScore = clamp(Math.round(application.networkScore * 0.45 + application.winRate * 0.35 + structured.teamSize * 0.9 + structured.yearsInCargoSales * 0.8));
  const commercialPlanScore = scoreCommercialPlan(tender, application);
  const overallFit = clamp(Math.round((marketCoverageScore + salesStrengthScore + cargoCapabilityScore + commercialPlanScore) / 4));
  const missingSignals = [
    !application.networkPlan,
    !application.operationalReadiness,
    !application.monthlySalesTarget,
    application.documents.length === 0,
  ].filter(Boolean).length;
  const riskLevel = missingSignals >= 3 || overallFit < 60 ? "High" : missingSignals >= 1 || overallFit < 75 ? "Medium" : "Low";
  const recommendation =
    overallFit >= 84 && riskLevel !== "High"
      ? "Strong contender"
      : overallFit >= 74
        ? "Shortlist"
        : overallFit >= 62
          ? "Review carefully"
          : "Do not advance";

  return {
    applicationId: application.id,
    overallFit,
    marketCoverageScore,
    salesStrengthScore,
    cargoCapabilityScore,
    commercialPlanScore,
    riskLevel,
    recommendation,
    summary: `${application.gsaName} scores ${overallFit}/100 overall with ${marketCoverageScore}/100 market coverage and ${cargoCapabilityScore}/100 cargo capability. Risk is ${riskLevel.toLowerCase()} based on missing commercial or readiness signals.`,
  };
}

function getCoverageAirports(tender: LiveTender, application: LiveTenderApplication) {
  const airports = new Set<string>();
  for (const route of tender.routes) {
    if (application.coverage.includes(route.id) || application.markets.includes(route.id)) {
      airports.add(route.origin.toUpperCase());
      airports.add(route.destination.toUpperCase());
    }
  }
  for (const market of [...application.markets, ...application.coverage]) {
    for (const airport of AIRPORTS_BY_MARKET[market] ?? []) airports.add(airport);
  }
  for (const region of tender.regions) {
    if (application.markets.includes(region) || application.coverage.includes(region)) {
      for (const airport of AIRPORTS_BY_MARKET[region] ?? []) airports.add(airport);
    }
  }
  return Array.from(airports).slice(0, 8);
}

function scoreMarketCoverage(tender: LiveTender, tenderAirports: string[], coveredAirports: string[], application: LiveTenderApplication) {
  if (tender.coverageModel === "country-wide" || tender.coverageModel === "regional-cluster") {
    const regionMatches = tender.regions.filter((region) => application.markets.includes(region) || application.coverage.includes(region)).length;
    const regionFit = tender.regions.length ? Math.round((regionMatches / tender.regions.length) * 45) : 28;
    return clamp(regionFit + Math.round(application.networkScore * 0.35) + Math.round(application.complianceScore * 0.2));
  }
  if (tenderAirports.length === 0) return clamp(Math.round((application.networkScore + application.complianceScore) / 2));
  const covered = tenderAirports.filter((airport) => coveredAirports.includes(airport)).length;
  return clamp(Math.round((covered / tenderAirports.length) * 70 + application.networkScore * 0.3));
}

function scoreCargoCapability(tender: LiveTender, structured: StructuredGsaApplication) {
  const cargoTypes = getTenderCargoTypes(tender).map((item) => item.toLowerCase());
  if (cargoTypes.length === 0) return 72;
  const capabilityText = structured.cargoCapabilities.join(" ").toLowerCase();
  const matches = cargoTypes.filter((type) => capabilityText.includes(type.toLowerCase())).length;
  return clamp(Math.round((matches / cargoTypes.length) * 70 + Math.min(structured.cargoCapabilities.length, 6) * 5));
}

function scoreCommercialPlan(tender: LiveTender, application: LiveTenderApplication) {
  let score = 30;
  if (application.proposedCommission.trim()) score += 18;
  if (application.namedAccountCoverage.trim()) score += 16;
  if (application.monthlySalesTarget.trim()) score += 14;
  if (application.networkPlan.trim().length > 60) score += 14;
  if (application.operationalReadiness.trim().length > 40) score += 8;
  if ((tender.requiredCapabilities?.length ?? 0) > 0 && application.documents.length > 0) score += 4;
  return clamp(score);
}

function buildRepresentations(application: LiveTenderApplication) {
  const count = Math.max(1, Math.min(6, Math.round(application.winRate / 12)));
  return Array.from({ length: count }, (_, index) => `Cargo airline representation ${index + 1}`);
}

function buildCustomerSegments(tender: LiveTender, application: LiveTenderApplication) {
  const productMix = getTenderCargoTypes(tender);
  const base = productMix.length ? productMix : application.cargoFocus.split(/[,/]/).map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set([...base, "forwarders", "specialized SME accounts"])).slice(0, 6);
}

function buildStrengths(tender: LiveTender, application: LiveTenderApplication, airports: string[]) {
  const strengths = [
    airports.length > 0 ? `Covers ${airports.slice(0, 3).join(", ")}` : "",
    application.certifications.length ? `${application.certifications.slice(0, 2).join(" / ")} certified` : "",
    application.networkScore >= 82 ? "Strong account network" : "",
    application.operationalReadiness ? "Launch plan provided" : "",
    application.monthlySalesTarget ? "Monthly target declared" : "",
    tender.regions.some((region) => application.markets.includes(region)) ? "Direct market match" : "",
    tender.requiredCapabilities?.length && application.documents.length ? "Capability evidence attached" : "",
  ].filter(Boolean);
  return strengths.slice(0, 4);
}

function getMandateLabel(tender: LiveTender) {
  if (tender.mandateType === "sales-only") return "sales-only GSA representation";
  if (tender.mandateType === "route-launch") return "a route launch mandate";
  if (tender.mandateType === "product-specialist") return "a product specialist GSA mandate";
  if (tender.mandateType === "regional-cluster") return "a regional cluster GSA mandate";
  return "full GSA representation";
}

function getCoverageLabel(tender: LiveTender) {
  if (tender.coverageModel === "airport-led") return "airport-led";
  if (tender.coverageModel === "route-led") return "route-led";
  if (tender.coverageModel === "regional-cluster") return "regional-cluster";
  return "country-wide";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
