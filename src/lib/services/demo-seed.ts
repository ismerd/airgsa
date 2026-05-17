import type { SessionPayload } from "@/lib/auth/session";
import { realGsaPartners } from "@/lib/real-gsa-data";
import {
  assignRoutesToContract,
  createLiveApplication,
  createLiveTender,
  listLiveApplications,
  listLivePartnerContracts,
  listLiveTenders,
  updateContractTerms,
  updateLiveApplicationStatus,
  updateLiveTender,
  type LivePartnerContract,
  type LiveTender,
  type LiveTenderApplication,
} from "@/lib/services/tender-workflow-store";
import {
  createControlAction,
  createMandateBooking,
  createMandateQuote,
  createMonthlyReport,
  listControlActions,
  listMandateBookings,
  listMandateQuotes,
  listMonthlyReports,
  updateMandateQuoteStatus,
  type MandateQuote,
} from "@/lib/services/mandate-execution-store";

const SEED_TITLE = "Seed: Saudia DACH Control Flow";
const AIRLINE_COMPANY_ID = "airline-saudia-cargo";
const GSA_COMPANY_ID = "gsa-forto";

const airlineSession: SessionPayload = {
  email: "saudia@airgsa.demo",
  role: "airline",
  accessRole: "admin",
  name: "Ahmed Al-Rashid",
  company: "Saudia Cargo",
  companyId: AIRLINE_COMPANY_ID,
};

const forto = realGsaPartners.find((partner) => partner.id === GSA_COMPANY_ID) ?? realGsaPartners[0];

const gsaSession: SessionPayload = {
  email: forto.email,
  role: "gsa",
  accessRole: "admin",
  name: forto.contactName,
  company: forto.name,
  companyId: GSA_COMPANY_ID,
};

export type SalesDemoSeedResult = {
  tender: Pick<LiveTender, "id" | "title" | "status">;
  application: Pick<LiveTenderApplication, "id" | "status" | "gsaName">;
  contract: Pick<LivePartnerContract, "id" | "status" | "gsaName" | "market"> & {
    assignedRoutes: number;
  };
  quoteIds: string[];
  bookingIds: string[];
  controlActionIds: string[];
  monthlyReportIds: string[];
};

export async function seedSalesDemoFlow(session: SessionPayload): Promise<SalesDemoSeedResult> {
  if (session.role !== "admin") throw new Error("Admin login required");

  const tender = await ensureTender();
  const application = await ensureApplication(tender);
  const acceptedApplication = await updateLiveApplicationStatus(application.id, "accepted");
  if (!acceptedApplication) throw new Error("Could not accept seed application");

  const contract = await ensureContract(acceptedApplication.id);
  const assignedContract = await ensureRoutesAssigned(contract);
  const tunedContract = await ensureContractTerms(assignedContract);

  const quotes = await ensureQuotes(tunedContract);
  const bookings = await ensureBookings(quotes);
  const controlActions = await ensureControlActions(tunedContract);
  const monthlyReports = await ensureMonthlyReport(tunedContract, bookings.length, quotes.length);

  return {
    tender: { id: tender.id, title: tender.title, status: tender.status },
    application: { id: acceptedApplication.id, status: acceptedApplication.status, gsaName: acceptedApplication.gsaName },
    contract: {
      id: tunedContract.id,
      status: tunedContract.status,
      gsaName: tunedContract.gsaName,
      market: tunedContract.market,
      assignedRoutes: tunedContract.contractRoutes.filter((route) => route.status === "assigned").length,
    },
    quoteIds: quotes.map((quote) => quote.id),
    bookingIds: bookings.map((booking) => booking.id),
    controlActionIds: controlActions.map((action) => action.id),
    monthlyReportIds: monthlyReports.map((report) => report.id),
  };
}

async function ensureTender() {
  const tenders = await listLiveTenders();
  const existing = tenders.find((tender) => tender.title === SEED_TITLE && tender.airlineEmail === airlineSession.email);
  if (existing) return existing;

  return createLiveTender({
    title: SEED_TITLE,
    airline: airlineSession.company,
    airlineEmail: airlineSession.email,
    airlineCompanyId: AIRLINE_COMPANY_ID,
    countryScope: "Germany, Austria, Switzerland",
    regions: ["DACH", "Middle East"],
    lanes: "FRA/RUH, MUC/JED, VIE/RUH",
    annualTonnage: 1800000,
    productMix: "General cargo, e-commerce, automotive, pharma",
    deadline: addDays(14),
    expectedStart: addDays(35),
    status: "open",
    awardMode: "single",
    maxAwards: 1,
    commercialModel: "hybrid",
    requirements: [
      "Named account coverage for DACH forwarders",
      "Below-floor rates require airline approval",
      "Monthly performance reporting with proof attachments",
    ],
    commercialExpectations: "Hybrid commission with minimum quote activity and route-level KPI control.",
    routes: [
      {
        id: "seed-fra-ruh",
        origin: "FRA",
        destination: "RUH",
        operatingDays: "Mon, Wed, Fri",
        frequencyPerWeek: 3,
        aircraft: "B777F",
      },
      {
        id: "seed-muc-jed",
        origin: "MUC",
        destination: "JED",
        operatingDays: "Tue, Thu",
        frequencyPerWeek: 2,
        aircraft: "A330F",
      },
      {
        id: "seed-vie-ruh",
        origin: "VIE",
        destination: "RUH",
        operatingDays: "Sat",
        frequencyPerWeek: 1,
        aircraft: "B777F",
      },
    ],
    attachments: [],
  });
}

async function ensureApplication(tender: LiveTender) {
  const applications = await listLiveApplications();
  const existing = applications.find(
    (application) => application.tenderId === tender.id && application.gsaCompanyId === GSA_COMPANY_ID,
  );
  if (existing) return existing;

  const openTender = tender.status === "open" ? tender : await updateLiveTender(tender.id, { status: "open" });
  if (!openTender || openTender.status !== "open") throw new Error("Could not open seed tender for application");

  return createLiveApplication(openTender.id, gsaSession, {
    proposedCommission: "5.5% commission plus controlled minimum rate floor",
    launchTimeline: "Ready for launch in 30 days with DACH sales desk coverage.",
    namedAccountCoverage: "DHL Global Forwarding, DB Schenker, BMW Logistics, Kuehne+Nagel, Hellmann",
    monthlySalesTarget: "EUR 260,000 revenue and 120,000 kg booked weight",
    networkPlan: "Daily digital rate distribution, weekly account calls, and airport-led escalation for premium cargo.",
    operationalReadiness: "IATA/CASS setup complete, airline approval desk mapped, mobile task handling enabled.",
    documents: [],
  });
}

async function ensureContract(sourceApplicationId: string) {
  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.sourceApplicationId === sourceApplicationId);
  if (!contract) throw new Error("Awarded application did not create a contract");
  return contract;
}

async function ensureRoutesAssigned(contract: LivePartnerContract) {
  const routeIds = contract.contractRoutes.slice(0, 2).map((route) => route.id);
  const alreadyAssigned = routeIds.every((routeId) =>
    contract.contractRoutes.some((route) => route.id === routeId && route.status === "assigned"),
  );
  if (alreadyAssigned) return contract;

  const updated = await assignRoutesToContract(contract.id, routeIds, airlineSession.email);
  if (!updated) throw new Error("Could not assign seed routes");
  return updated;
}

async function ensureContractTerms(contract: LivePartnerContract) {
  const updated = await updateContractTerms(contract.id, {
    status: "active",
    commercialTerms: "Hybrid GSA mandate: 5.5% commission, protected rate floor, monthly KPI review.",
    targetLoadFactor: 78,
    monthlyTonnageTargetKg: 120000,
    reportingCadence: "monthly",
    controlRules: {
      ...contract.controlRules,
      rateFloorPerKg: 2.15,
      autoApprovalVariancePct: 2,
      requireAirlineApprovalBelowFloor: true,
      quoteResponseSlaHours: 4,
      monthlyRevenueTarget: 260000,
      minimumMonthlyQuotes: 18,
      quoteWinRateTargetPct: 40,
      namedAccounts: ["DHL Global Forwarding", "DB Schenker", "BMW Logistics", "Kuehne+Nagel"],
      productScope: ["General cargo", "e-commerce", "automotive", "pharma"],
      territoryExclusivity: "exclusive",
      monthlyReportDueDay: 5,
      penaltyClause: "Below-floor customer confirmations need airline approval before booking.",
    },
  });
  if (!updated) throw new Error("Could not update seed contract terms");
  return updated;
}

async function ensureQuotes(contract: LivePartnerContract) {
  const route = contract.contractRoutes.find((item) => item.status === "assigned") ?? contract.contractRoutes[0];
  if (!route) throw new Error("Seed contract has no route");

  const existingQuotes = await listMandateQuotes(gsaSession);
  const targetCustomers = ["DHL Global Forwarding Seed", "BMW Logistics Seed"];
  const quotes: MandateQuote[] = [];

  for (const customer of targetCustomers) {
    const existing = existingQuotes.find((quote) => quote.contractId === contract.id && quote.customer === customer);
    if (existing) {
      quotes.push(await approveIfNeeded(existing));
      continue;
    }

    const quote = await createMandateQuote(gsaSession, {
      contractId: contract.id,
      routeId: route.id,
      origin: route.origin,
      destination: route.destination,
      customer,
      contactName: customer.startsWith("DHL") ? "Maria Keller" : "Tobias Weber",
      contactEmail: customer.startsWith("DHL") ? "maria.keller@example.com" : "tobias.weber@example.com",
      cargoType: customer.startsWith("DHL") ? "E-commerce consolidations" : "Automotive components",
      weightKg: customer.startsWith("DHL") ? 18500 : 12400,
      pieces: customer.startsWith("DHL") ? 72 : 38,
      requestedRatePerKg: customer.startsWith("DHL") ? 2.28 : 2.05,
      flightDate: addDays(customer.startsWith("DHL") ? 9 : 12),
      deadline: addDays(2),
    });
    quotes.push(await approveIfNeeded(quote));
    await pause();
  }

  return quotes;
}

async function approveIfNeeded(quote: MandateQuote) {
  if (quote.status !== "airline-approval-required") return quote;
  return (await updateMandateQuoteStatus(airlineSession, quote.id, {
    action: "approve",
    reason: "Seed scenario: airline approves controlled below-floor strategic account quote.",
  })) ?? quote;
}

async function ensureBookings(quotes: MandateQuote[]) {
  const existingBookings = await listMandateBookings(gsaSession);
  const bookings = [];

  for (const quote of quotes.filter((item) => item.status === "auto-approved" || item.status === "airline-approved").slice(0, 1)) {
    const existing = existingBookings.find((booking) => booking.quoteId === quote.id);
    if (existing) {
      bookings.push(existing);
      continue;
    }

    const booking = await createMandateBooking(gsaSession, {
      quoteId: quote.id,
      awbNumber: "065-12345675",
      flightNumber: quote.origin === "FRA" ? "SV9821" : "SV9823",
      flightDate: quote.flightDate,
    });
    bookings.push(booking);
  }

  return bookings;
}

async function ensureControlActions(contract: LivePartnerContract) {
  const actions = await listControlActions(airlineSession);
  const existing = actions.find(
    (action) => action.contractId === contract.id && action.title === "Increase DACH quote velocity for week 1",
  );
  if (existing) return [existing];

  const action = await createControlAction(airlineSession, {
    contractId: contract.id,
    title: "Increase DACH quote velocity for week 1",
    description: "Seed scenario: sales activity is below the configured monthly quote target. GSA should upload account call proof.",
    severity: "warning",
    dueDate: addDays(7),
    assigneeName: contract.contactName,
    assigneeEmail: contract.email,
    sourceRiskReasons: ["Quote activity below target", "New route launch requires early account proof"],
  });
  return [action];
}

async function ensureMonthlyReport(contract: LivePartnerContract, bookingCount: number, quoteCount: number) {
  const period = new Date().toISOString().slice(0, 7);
  const reports = await listMonthlyReports(gsaSession);
  const existing = reports.find((report) => report.contractId === contract.id && report.period === period);
  if (existing) return [existing];

  const report = await createMonthlyReport(gsaSession, {
    contractId: contract.id,
    period,
    reportedRevenue: 42180,
    reportedTonnageKg: 18500,
    reportedQuotes: Math.max(quoteCount, 2),
    reportedBookings: Math.max(bookingCount, 1),
    summary: "Seed scenario: first DACH launch report submitted with route activity, pipeline and support needs.",
    pipelineNotes: "DHL and BMW lanes active. DB Schenker and Hellmann next account calls scheduled.",
    risks: "Need faster airline decisioning for below-floor strategic automotive spot requests.",
    supportNeeded: "Confirm winter capacity outlook for FRA-RUH before next customer push.",
    ownerName: gsaSession.name,
    ownerEmail: gsaSession.email,
    submit: true,
  });
  return [report];
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function pause() {
  return new Promise((resolve) => setTimeout(resolve, 1));
}
