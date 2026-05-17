import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { rowData, withPostgres } from "@/lib/services/postgres-store";
import { listLivePartnerContracts, type LiveContractRoute, type LivePartnerContract } from "@/lib/services/tender-workflow-store";

const STORE_PATH = path.join(process.cwd(), "data", "mandate-execution.json");
const STORE_KEY = "mandate_execution_store";

export type MandateQuoteStatus =
  | "draft"
  | "auto-approved"
  | "airline-approval-required"
  | "airline-approved"
  | "airline-rejected"
  | "countered"
  | "declined";

export type MandateBookingStatus = "booked" | "flown" | "cancelled";
export type ControlActionStatus = "open" | "in-progress" | "completed" | "cancelled";
export type ControlActionSeverity = "info" | "warning" | "critical";
export type MonthlyReportStatus = "draft" | "submitted" | "accepted" | "changes-requested" | "rejected";

export type MandateQuote = {
  id: string;
  contractId: string;
  tenderId: string;
  airlineCompanyId?: string;
  airlineEmail: string;
  airline: string;
  gsaCompanyId?: string;
  gsaId: string;
  gsaName: string;
  routeId?: string;
  origin: string;
  destination: string;
  customer: string;
  contactName: string;
  contactEmail: string;
  cargoType: string;
  weightKg: number;
  pieces: number;
  requestedRatePerKg: number;
  floorRatePerKg?: number;
  flightDate: string;
  deadline: string;
  status: MandateQuoteStatus;
  decisionReason?: string;
  counterRatePerKg?: number;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decidedBy?: string;
};

export type QuoteCreateInput = Pick<
  MandateQuote,
  | "contractId"
  | "routeId"
  | "origin"
  | "destination"
  | "customer"
  | "contactName"
  | "contactEmail"
  | "cargoType"
  | "weightKg"
  | "pieces"
  | "requestedRatePerKg"
  | "flightDate"
  | "deadline"
>;

export type QuoteActionInput = {
  action: "approve" | "reject" | "counter" | "decline";
  reason?: string;
  counterRatePerKg?: number;
};

export type MandateBooking = {
  id: string;
  quoteId: string;
  contractId: string;
  tenderId: string;
  airlineCompanyId?: string;
  airlineEmail: string;
  airline: string;
  gsaCompanyId?: string;
  gsaId: string;
  gsaName: string;
  routeId?: string;
  origin: string;
  destination: string;
  customer: string;
  contactName: string;
  contactEmail: string;
  cargoType: string;
  weightKg: number;
  pieces: number;
  ratePerKg: number;
  revenueAmount: number;
  currency: "EUR";
  awbNumber: string;
  flightNumber?: string;
  flightDate: string;
  status: MandateBookingStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type BookingCreateInput = {
  quoteId: string;
  awbNumber?: string;
  flightNumber?: string;
  flightDate?: string;
  flownWeightKg?: number;
  finalRatePerKg?: number;
};

export type ContractRoutePerformance = {
  routeId: string;
  origin: string;
  destination: string;
  assigned: boolean;
  quoteCount: number;
  bookingCount: number;
  revenueAmount: number;
  tonnageKg: number;
  riskLevel: "green" | "amber" | "red";
};

export type ContractPerformanceSnapshot = {
  contractId: string;
  tenderId: string;
  airline: string;
  airlineEmail: string;
  airlineCompanyId?: string;
  gsaName: string;
  gsaCompanyId?: string;
  market: string;
  periodStart: string;
  periodEnd: string;
  quoteCount: number;
  bookingCount: number;
  pendingApprovalCount: number;
  rejectedQuoteCount: number;
  slaBreachCount: number;
  revenueAmount: number;
  revenueTarget: number;
  revenueAttainmentPct: number;
  tonnageKg: number;
  tonnageTargetKg: number;
  tonnageAttainmentPct: number;
  winRatePct: number;
  winRateTargetPct: number;
  quoteTarget: number;
  quoteTargetPct: number;
  riskLevel: "green" | "amber" | "red";
  riskReasons: string[];
  recommendedActions: string[];
  routePerformance: ContractRoutePerformance[];
};

export type ContractControlAction = {
  id: string;
  contractId: string;
  tenderId: string;
  airline: string;
  airlineEmail: string;
  airlineCompanyId?: string;
  gsaName: string;
  gsaCompanyId?: string;
  market: string;
  title: string;
  description?: string;
  severity: ControlActionSeverity;
  status: ControlActionStatus;
  dueDate?: string;
  sourceRiskReasons: string[];
  gsaResponse?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastUpdatedBy?: string;
  closedAt?: string;
};

export type ControlActionCreateInput = {
  contractId: string;
  title: string;
  description?: string;
  severity?: ControlActionSeverity;
  dueDate?: string;
  sourceRiskReasons?: string[];
};

export type ControlActionUpdateInput = {
  status?: ControlActionStatus;
  description?: string;
  severity?: ControlActionSeverity;
  dueDate?: string;
  gsaResponse?: string;
};

export type MonthlyContractReport = {
  id: string;
  contractId: string;
  tenderId: string;
  airline: string;
  airlineEmail: string;
  airlineCompanyId?: string;
  gsaName: string;
  gsaCompanyId?: string;
  market: string;
  period: string;
  status: MonthlyReportStatus;
  reportedRevenue: number;
  reportedTonnageKg: number;
  reportedQuotes: number;
  reportedBookings: number;
  summary: string;
  pipelineNotes?: string;
  risks?: string;
  supportNeeded?: string;
  attachmentName?: string;
  airlineReviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastUpdatedBy?: string;
};

export type MonthlyReportInput = {
  contractId: string;
  period: string;
  reportedRevenue?: number;
  reportedTonnageKg?: number;
  reportedQuotes?: number;
  reportedBookings?: number;
  summary: string;
  pipelineNotes?: string;
  risks?: string;
  supportNeeded?: string;
  attachmentName?: string;
  submit?: boolean;
};

export type MonthlyReportUpdateInput = Partial<Omit<MonthlyReportInput, "contractId">> & {
  status?: MonthlyReportStatus;
  airlineReviewNote?: string;
};

export type ContractTimelineEvent = {
  id: string;
  type: "audit" | "quote" | "booking" | "control-action" | "monthly-report";
  title: string;
  summary: string;
  createdAt: string;
  actor?: string;
  status?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type MandateAuditEvent = {
  id: string;
  actorEmail: string;
  actorName: string;
  actorRole: SessionPayload["role"];
  company: string;
  entityType: "contract" | "quote" | "route" | "booking" | "revenue" | "control-action" | "monthly-report";
  entityId: string;
  action: string;
  summary: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

type MandateExecutionStore = {
  quotes: MandateQuote[];
  bookings: MandateBooking[];
  controlActions: ContractControlAction[];
  monthlyReports: MonthlyContractReport[];
  auditEvents: MandateAuditEvent[];
};

export async function listMandateQuotes(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const visibleContractIds = new Set(contracts.filter((contract) => canViewContract(session, contract)).map((contract) => contract.id));
  return store.quotes
    .filter((quote) => visibleContractIds.has(quote.contractId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getMandateQuote(id: string) {
  const store = await readStore();
  return store.quotes.find((quote) => quote.id === id) ?? null;
}

export async function listMandateBookings(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const visibleContractIds = new Set(contracts.filter((contract) => canViewContract(session, contract)).map((contract) => contract.id));
  return store.bookings
    .filter((booking) => visibleContractIds.has(booking.contractId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function listContractPerformance(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const visibleContracts = contracts.filter((contract) => canViewContract(session, contract));
  return visibleContracts.map((contract) => buildContractPerformance(contract, store));
}

export async function listControlActions(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const visibleContractIds = new Set(contracts.filter((contract) => canViewContract(session, contract)).map((contract) => contract.id));
  return store.controlActions
    .filter((action) => visibleContractIds.has(action.contractId))
    .sort((left, right) => {
      const statusScore = statusOrder(left.status) - statusOrder(right.status);
      if (statusScore !== 0) return statusScore;
      return right.createdAt.localeCompare(left.createdAt);
    });
}

export async function listMonthlyReports(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const visibleContractIds = new Set(contracts.filter((contract) => canViewContract(session, contract)).map((contract) => contract.id));
  return store.monthlyReports
    .filter((report) => visibleContractIds.has(report.contractId))
    .sort((left, right) => right.period.localeCompare(left.period) || right.updatedAt.localeCompare(left.updatedAt));
}

export async function createMandateQuote(session: SessionPayload, input: QuoteCreateInput) {
  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === input.contractId);
  if (!contract || !canViewContract(session, contract) || session.role !== "gsa") {
    throw new Error("Contract not found");
  }

  const floorRate = contract.controlRules?.rateFloorPerKg;
  const status = getInitialQuoteStatus(input.requestedRatePerKg, floorRate, contract);
  const now = new Date().toISOString();
  const quote: MandateQuote = {
    ...input,
    id: `quo-${Date.now().toString(36)}`,
    tenderId: contract.tenderId,
    airlineCompanyId: contract.airlineCompanyId,
    airlineEmail: contract.airlineEmail,
    airline: contract.airline,
    gsaCompanyId: contract.gsaCompanyId,
    gsaId: contract.gsaId,
    gsaName: contract.gsaName,
    floorRatePerKg: floorRate,
    status,
    decisionReason: status === "airline-approval-required" ? "Requested rate is below airline floor." : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const store = await readStore();
  store.quotes.unshift(quote);
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "quote",
    entityId: quote.id,
    action: "quote.created",
    summary: `${quote.gsaName} created quote ${quote.origin}-${quote.destination} for ${quote.customer}`,
    metadata: { contractId: quote.contractId, requestedRatePerKg: quote.requestedRatePerKg, status: quote.status },
  }));
  if (status === "airline-approval-required") {
    store.auditEvents.unshift(buildAuditEvent(session, {
      entityType: "quote",
      entityId: quote.id,
      action: "quote.approval_required",
      summary: `Quote ${quote.id} needs airline approval because rate is below floor`,
      metadata: { floorRatePerKg: floorRate, requestedRatePerKg: quote.requestedRatePerKg },
    }));
  }
  await writeStore(store);
  return quote;
}

export async function updateMandateQuoteStatus(session: SessionPayload, quoteId: string, input: QuoteActionInput) {
  const store = await readStore();
  const index = store.quotes.findIndex((quote) => quote.id === quoteId);
  if (index < 0) return null;

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === store.quotes[index].contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Quote not found");

  const now = new Date().toISOString();
  const quote = store.quotes[index];
  const nextStatus = getNextQuoteStatus(session, input.action);
  const nextQuote: MandateQuote = {
    ...quote,
    status: nextStatus,
    decisionReason: input.reason ?? quote.decisionReason,
    counterRatePerKg: input.action === "counter" ? input.counterRatePerKg : quote.counterRatePerKg,
    updatedAt: now,
    decidedAt: now,
    decidedBy: session.email,
  };

  store.quotes[index] = nextQuote;
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "quote",
    entityId: quote.id,
    action: `quote.${input.action}`,
    summary: `${session.company} ${input.action}ed quote ${quote.id}`,
    metadata: {
      contractId: quote.contractId,
      requestedRatePerKg: quote.requestedRatePerKg,
      floorRatePerKg: quote.floorRatePerKg,
      counterRatePerKg: input.counterRatePerKg,
    },
  }));
  await writeStore(store);
  return nextQuote;
}

export async function createMandateBooking(session: SessionPayload, input: BookingCreateInput) {
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");

  const store = await readStore();
  const quote = store.quotes.find((item) => item.id === input.quoteId);
  if (!quote) throw new Error("Quote not found");

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === quote.contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Quote not found");
  if (session.role === "gsa" && quote.gsaCompanyId && quote.gsaCompanyId !== session.companyId) throw new Error("Quote not found");
  if (quote.status !== "auto-approved" && quote.status !== "airline-approved") {
    throw new Error("Only approved quotes can be converted into bookings");
  }

  const existing = store.bookings.find((booking) => booking.quoteId === quote.id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const ratePerKg = positiveNumber(input.finalRatePerKg) ?? quote.counterRatePerKg ?? quote.requestedRatePerKg;
  const weightKg = positiveNumber(input.flownWeightKg) ?? quote.weightKg;
  const booking: MandateBooking = {
    id: `bkg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    quoteId: quote.id,
    contractId: quote.contractId,
    tenderId: quote.tenderId,
    airlineCompanyId: quote.airlineCompanyId,
    airlineEmail: quote.airlineEmail,
    airline: quote.airline,
    gsaCompanyId: quote.gsaCompanyId,
    gsaId: quote.gsaId,
    gsaName: quote.gsaName,
    routeId: quote.routeId,
    origin: quote.origin,
    destination: quote.destination,
    customer: quote.customer,
    contactName: quote.contactName,
    contactEmail: quote.contactEmail,
    cargoType: quote.cargoType,
    weightKg,
    pieces: quote.pieces,
    ratePerKg,
    revenueAmount: Math.round(weightKg * ratePerKg * 100) / 100,
    currency: "EUR",
    awbNumber: input.awbNumber?.trim() || generateAwbNumber(),
    flightNumber: input.flightNumber?.trim() || undefined,
    flightDate: input.flightDate || quote.flightDate,
    status: "booked",
    createdAt: now,
    updatedAt: now,
    createdBy: session.email,
  };

  store.bookings.unshift(booking);
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "booking",
    entityId: booking.id,
    action: "booking.created",
    summary: `${booking.gsaName} booked ${booking.origin}-${booking.destination} for ${booking.customer}`,
    metadata: {
      quoteId: booking.quoteId,
      contractId: booking.contractId,
      awbNumber: booking.awbNumber,
      revenueAmount: booking.revenueAmount,
    },
  }));
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "revenue",
    entityId: booking.id,
    action: "revenue.attributed",
    summary: `Revenue EUR ${booking.revenueAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} attributed to ${booking.gsaName}`,
    metadata: {
      quoteId: booking.quoteId,
      contractId: booking.contractId,
      awbNumber: booking.awbNumber,
      revenueAmount: booking.revenueAmount,
      ratePerKg: booking.ratePerKg,
      weightKg: booking.weightKg,
    },
  }));
  await writeStore(store);
  return booking;
}

export async function createControlAction(session: SessionPayload, input: ControlActionCreateInput) {
  if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline login required");
  if (!input.contractId || !input.title?.trim()) throw new Error("Control action needs contract and title");

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === input.contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Contract not found");

  const store = await readStore();
  const title = input.title.trim();
  const existing = store.controlActions.find(
    (action) =>
      action.contractId === contract.id &&
      action.title.toLowerCase() === title.toLowerCase() &&
      action.status !== "completed" &&
      action.status !== "cancelled",
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const action: ContractControlAction = {
    id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    contractId: contract.id,
    tenderId: contract.tenderId,
    airline: contract.airline,
    airlineEmail: contract.airlineEmail,
    airlineCompanyId: contract.airlineCompanyId,
    gsaName: contract.gsaName,
    gsaCompanyId: contract.gsaCompanyId,
    market: contract.market,
    title,
    description: input.description?.trim() || undefined,
    severity: input.severity ?? "warning",
    status: "open",
    dueDate: input.dueDate,
    sourceRiskReasons: input.sourceRiskReasons ?? [],
    createdAt: now,
    updatedAt: now,
    createdBy: session.email,
  };

  store.controlActions.unshift(action);
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "control-action",
    entityId: action.id,
    action: "control_action.created",
    summary: `${session.company} opened control action for ${action.gsaName}: ${action.title}`,
    metadata: { contractId: action.contractId, status: action.status, severity: action.severity },
  }));
  await writeStore(store);
  return action;
}

export async function updateControlAction(session: SessionPayload, id: string, input: ControlActionUpdateInput) {
  const store = await readStore();
  const index = store.controlActions.findIndex((action) => action.id === id);
  if (index < 0) return null;

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === store.controlActions[index].contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Control action not found");

  const current = store.controlActions[index];
  const now = new Date().toISOString();
  const airlineCanEdit = session.role === "airline" || session.role === "admin";
  const gsaCanRespond = session.role === "gsa";
  if (!airlineCanEdit && !gsaCanRespond) throw new Error("Not allowed");

  const nextStatus = input.status ?? current.status;
  if (gsaCanRespond && (nextStatus === "cancelled")) throw new Error("Only airline can cancel control actions");

  const action: ContractControlAction = {
    ...current,
    status: nextStatus,
    description: airlineCanEdit && input.description !== undefined ? input.description : current.description,
    severity: airlineCanEdit && input.severity ? input.severity : current.severity,
    dueDate: airlineCanEdit && input.dueDate !== undefined ? input.dueDate : current.dueDate,
    gsaResponse: input.gsaResponse !== undefined ? input.gsaResponse : current.gsaResponse,
    updatedAt: now,
    lastUpdatedBy: session.email,
    closedAt: nextStatus === "completed" || nextStatus === "cancelled" ? current.closedAt ?? now : undefined,
  };

  store.controlActions[index] = action;
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "control-action",
    entityId: action.id,
    action: "control_action.updated",
    summary: `${session.company} updated control action ${action.title} to ${action.status}`,
    metadata: { contractId: action.contractId, status: action.status, severity: action.severity },
  }));
  await writeStore(store);
  return action;
}

export async function createMonthlyReport(session: SessionPayload, input: MonthlyReportInput) {
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");
  if (!input.contractId || !input.period || !input.summary?.trim()) throw new Error("Monthly report needs contract, period and summary");

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === input.contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Contract not found");

  const store = await readStore();
  const existingIndex = store.monthlyReports.findIndex((report) => report.contractId === contract.id && report.period === input.period);
  const now = new Date().toISOString();
  const baseReport = existingIndex >= 0 ? store.monthlyReports[existingIndex] : null;
  if (baseReport && baseReport.status === "accepted") throw new Error("Accepted reports cannot be overwritten");

  const status: MonthlyReportStatus = input.submit ? "submitted" : baseReport?.status === "changes-requested" ? "submitted" : "draft";
  const report: MonthlyContractReport = {
    ...(baseReport ?? {}),
    id: baseReport?.id ?? `mrep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    contractId: contract.id,
    tenderId: contract.tenderId,
    airline: contract.airline,
    airlineEmail: contract.airlineEmail,
    airlineCompanyId: contract.airlineCompanyId,
    gsaName: contract.gsaName,
    gsaCompanyId: contract.gsaCompanyId,
    market: contract.market,
    period: input.period,
    status,
    reportedRevenue: Number(input.reportedRevenue ?? 0),
    reportedTonnageKg: Number(input.reportedTonnageKg ?? 0),
    reportedQuotes: Number(input.reportedQuotes ?? 0),
    reportedBookings: Number(input.reportedBookings ?? 0),
    summary: input.summary.trim(),
    pipelineNotes: input.pipelineNotes?.trim() || undefined,
    risks: input.risks?.trim() || undefined,
    supportNeeded: input.supportNeeded?.trim() || undefined,
    attachmentName: input.attachmentName?.trim() || undefined,
    airlineReviewNote: status === "submitted" ? undefined : baseReport?.airlineReviewNote,
    submittedAt: status === "submitted" ? now : baseReport?.submittedAt,
    reviewedAt: status === "submitted" ? undefined : baseReport?.reviewedAt,
    reviewedBy: status === "submitted" ? undefined : baseReport?.reviewedBy,
    createdAt: baseReport?.createdAt ?? now,
    updatedAt: now,
    createdBy: baseReport?.createdBy ?? session.email,
    lastUpdatedBy: session.email,
  };

  if (existingIndex >= 0) store.monthlyReports[existingIndex] = report;
  else store.monthlyReports.unshift(report);

  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "monthly-report",
    entityId: report.id,
    action: status === "submitted" ? "monthly_report.submitted" : "monthly_report.saved",
    summary: `${report.gsaName} ${status === "submitted" ? "submitted" : "saved"} monthly report ${report.period}`,
    metadata: { contractId: report.contractId, period: report.period, status: report.status },
  }));
  await writeStore(store);
  return report;
}

export async function updateMonthlyReport(session: SessionPayload, id: string, input: MonthlyReportUpdateInput) {
  const store = await readStore();
  const index = store.monthlyReports.findIndex((report) => report.id === id);
  if (index < 0) return null;

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === store.monthlyReports[index].contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Monthly report not found");

  const current = store.monthlyReports[index];
  const airlineCanReview = session.role === "airline" || session.role === "admin";
  const gsaCanEdit = session.role === "gsa" || session.role === "admin";
  if (!airlineCanReview && !gsaCanEdit) throw new Error("Not allowed");

  const now = new Date().toISOString();
  let status = current.status;
  if (input.status) {
    if (airlineCanReview && ["accepted", "changes-requested", "rejected"].includes(input.status)) status = input.status;
    else if (gsaCanEdit && ["draft", "submitted"].includes(input.status)) status = input.status;
    else throw new Error("Invalid report status transition");
  }

  if (current.status === "accepted" && !airlineCanReview) throw new Error("Accepted reports cannot be edited by GSA");

  const report: MonthlyContractReport = {
    ...current,
    period: gsaCanEdit && input.period ? input.period : current.period,
    status,
    reportedRevenue: gsaCanEdit && input.reportedRevenue !== undefined ? Number(input.reportedRevenue) : current.reportedRevenue,
    reportedTonnageKg: gsaCanEdit && input.reportedTonnageKg !== undefined ? Number(input.reportedTonnageKg) : current.reportedTonnageKg,
    reportedQuotes: gsaCanEdit && input.reportedQuotes !== undefined ? Number(input.reportedQuotes) : current.reportedQuotes,
    reportedBookings: gsaCanEdit && input.reportedBookings !== undefined ? Number(input.reportedBookings) : current.reportedBookings,
    summary: gsaCanEdit && input.summary !== undefined ? input.summary : current.summary,
    pipelineNotes: gsaCanEdit && input.pipelineNotes !== undefined ? input.pipelineNotes : current.pipelineNotes,
    risks: gsaCanEdit && input.risks !== undefined ? input.risks : current.risks,
    supportNeeded: gsaCanEdit && input.supportNeeded !== undefined ? input.supportNeeded : current.supportNeeded,
    attachmentName: gsaCanEdit && input.attachmentName !== undefined ? input.attachmentName : current.attachmentName,
    airlineReviewNote: airlineCanReview && input.airlineReviewNote !== undefined ? input.airlineReviewNote : current.airlineReviewNote,
    submittedAt: status === "submitted" && current.status !== "submitted" ? now : current.submittedAt,
    reviewedAt: airlineCanReview && ["accepted", "changes-requested", "rejected"].includes(status) ? now : current.reviewedAt,
    reviewedBy: airlineCanReview && ["accepted", "changes-requested", "rejected"].includes(status) ? session.email : current.reviewedBy,
    updatedAt: now,
    lastUpdatedBy: session.email,
  };

  store.monthlyReports[index] = report;
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "monthly-report",
    entityId: report.id,
    action: "monthly_report.updated",
    summary: `${session.company} updated monthly report ${report.period} to ${report.status}`,
    metadata: { contractId: report.contractId, period: report.period, status: report.status },
  }));
  await writeStore(store);
  return report;
}

export async function listContractTimeline(session: SessionPayload, contractId: string) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const contract = contracts.find((item) => item.id === contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Contract not found");

  const quoteIds = new Set(store.quotes.filter((quote) => quote.contractId === contractId).map((quote) => quote.id));
  const bookingIds = new Set(store.bookings.filter((booking) => booking.contractId === contractId).map((booking) => booking.id));
  const actionIds = new Set(store.controlActions.filter((action) => action.contractId === contractId).map((action) => action.id));
  const reportIds = new Set(store.monthlyReports.filter((report) => report.contractId === contractId).map((report) => report.id));

  const events: ContractTimelineEvent[] = [
    {
      id: `contract-${contract.id}`,
      type: "audit",
      title: "Contract created",
      summary: `${contract.gsaName} awarded ${contract.market}`,
      createdAt: contract.createdAt,
      status: contract.status,
      metadata: { contractId: contract.id },
    },
    ...store.quotes.filter((quote) => quote.contractId === contractId).map((quote): ContractTimelineEvent => ({
      id: quote.id,
      type: "quote",
      title: `Quote ${quote.status}`,
      summary: `${quote.customer} ${quote.origin}-${quote.destination} at EUR ${quote.requestedRatePerKg.toFixed(2)}/kg`,
      createdAt: quote.updatedAt,
      actor: quote.gsaName,
      status: quote.status,
      metadata: { quoteId: quote.id, customer: quote.customer },
    })),
    ...store.bookings.filter((booking) => booking.contractId === contractId).map((booking): ContractTimelineEvent => ({
      id: booking.id,
      type: "booking",
      title: `Booking ${booking.awbNumber}`,
      summary: `${booking.customer} ${booking.origin}-${booking.destination}, ${formatTimelineMoney(booking.revenueAmount)}`,
      createdAt: booking.createdAt,
      actor: booking.gsaName,
      status: booking.status,
      metadata: { bookingId: booking.id, awbNumber: booking.awbNumber },
    })),
    ...store.controlActions.filter((action) => action.contractId === contractId).map((action): ContractTimelineEvent => ({
      id: action.id,
      type: "control-action",
      title: `Control action ${action.status}`,
      summary: action.title,
      createdAt: action.updatedAt,
      actor: action.lastUpdatedBy ?? action.createdBy,
      status: action.status,
      metadata: { controlActionId: action.id, severity: action.severity },
    })),
    ...store.monthlyReports.filter((report) => report.contractId === contractId).map((report): ContractTimelineEvent => ({
      id: report.id,
      type: "monthly-report",
      title: `Monthly report ${report.status}`,
      summary: `${report.period}: ${formatTimelineMoney(report.reportedRevenue)}, ${Math.round(report.reportedTonnageKg).toLocaleString()} kg`,
      createdAt: report.updatedAt,
      actor: report.lastUpdatedBy ?? report.createdBy,
      status: report.status,
      metadata: { reportId: report.id, period: report.period },
    })),
    ...store.auditEvents.filter((event) => {
      if (event.entityType === "contract" || event.entityType === "route") return event.entityId === contractId;
      if (event.entityType === "quote") return quoteIds.has(event.entityId);
      if (event.entityType === "booking" || event.entityType === "revenue") return bookingIds.has(event.entityId);
      if (event.entityType === "control-action") return actionIds.has(event.entityId);
      if (event.entityType === "monthly-report") return reportIds.has(event.entityId);
      return false;
    }).map((event): ContractTimelineEvent => ({
      id: event.id,
      type: "audit",
      title: event.action,
      summary: event.summary,
      createdAt: event.createdAt,
      actor: event.actorName,
      metadata: event.metadata,
    })),
  ];

  return events.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function listMandateAuditEvents(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  if (session.role === "admin") return store.auditEvents;

  const visibleContractIds = new Set(contracts.filter((contract) => canViewContract(session, contract)).map((contract) => contract.id));
  const quoteIds = new Set(store.quotes.filter((quote) => visibleContractIds.has(quote.contractId)).map((quote) => quote.id));
  const bookingIds = new Set(store.bookings.filter((booking) => visibleContractIds.has(booking.contractId)).map((booking) => booking.id));
  const controlActionIds = new Set(store.controlActions.filter((action) => visibleContractIds.has(action.contractId)).map((action) => action.id));

  return store.auditEvents.filter((event) => {
    if (event.entityType === "quote") return quoteIds.has(event.entityId);
    if (event.entityType === "booking" || event.entityType === "revenue") return bookingIds.has(event.entityId);
    if (event.entityType === "control-action") return controlActionIds.has(event.entityId);
    if (event.entityType === "contract" || event.entityType === "route") return visibleContractIds.has(event.entityId);
    return false;
  });
}

export async function appendMandateAuditEvent(session: SessionPayload, event: Omit<MandateAuditEvent, "id" | "actorEmail" | "actorName" | "actorRole" | "company" | "createdAt">) {
  const store = await readStore();
  const auditEvent = buildAuditEvent(session, event);
  store.auditEvents.unshift(auditEvent);
  await writeStore(store);
  return auditEvent;
}

function getInitialQuoteStatus(rate: number, floor: number | undefined, contract: LivePartnerContract): MandateQuoteStatus {
  if (!floor) return "auto-approved";
  const variance = contract.controlRules?.autoApprovalVariancePct ?? 0;
  const allowedFloor = floor * (1 - variance / 100);
  if (rate >= allowedFloor) return "auto-approved";
  return contract.controlRules?.requireAirlineApprovalBelowFloor === false ? "draft" : "airline-approval-required";
}

function getNextQuoteStatus(session: SessionPayload, action: QuoteActionInput["action"]): MandateQuoteStatus {
  if (action === "approve") {
    if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline approval required");
    return "airline-approved";
  }
  if (action === "reject") {
    if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline approval required");
    return "airline-rejected";
  }
  if (action === "counter") return "countered";
  return "declined";
}

function buildAuditEvent(
  session: SessionPayload,
  event: Omit<MandateAuditEvent, "id" | "actorEmail" | "actorName" | "actorRole" | "company" | "createdAt">,
): MandateAuditEvent {
  return {
    ...event,
    id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    actorEmail: session.email,
    actorName: session.name,
    actorRole: session.role,
    company: session.company,
    createdAt: new Date().toISOString(),
  };
}

function positiveNumber(value: number | undefined) {
  if (!Number.isFinite(value) || value === undefined || value <= 0) return undefined;
  return value;
}

function generateAwbNumber() {
  return `160-${Date.now().toString().slice(-8)}`;
}

function buildContractPerformance(contract: LivePartnerContract, store: MandateExecutionStore): ContractPerformanceSnapshot {
  const { periodStart, periodEnd } = currentMonthWindow();
  const quotes = store.quotes.filter((quote) => quote.contractId === contract.id && isInWindow(quote.createdAt, periodStart, periodEnd));
  const bookings = store.bookings.filter((booking) => booking.contractId === contract.id && isInWindow(booking.createdAt, periodStart, periodEnd));
  const quoteCount = quotes.length;
  const bookingCount = bookings.length;
  const revenueAmount = roundMoney(bookings.reduce((sum, booking) => sum + booking.revenueAmount, 0));
  const tonnageKg = bookings.reduce((sum, booking) => sum + booking.weightKg, 0);
  const revenueTarget = contract.controlRules?.monthlyRevenueTarget ?? 0;
  const tonnageTargetKg = contract.monthlyTonnageTargetKg ?? 0;
  const quoteTarget = contract.controlRules?.minimumMonthlyQuotes ?? 0;
  const winRateTargetPct = contract.controlRules?.quoteWinRateTargetPct ?? 0;
  const winRatePct = quoteCount > 0 ? Math.round((bookingCount / quoteCount) * 100) : 0;
  const pendingApprovalCount = quotes.filter((quote) => quote.status === "airline-approval-required").length;
  const rejectedQuoteCount = quotes.filter((quote) => quote.status === "airline-rejected" || quote.status === "declined").length;
  const slaBreachCount = countSlaBreaches(quotes, contract.controlRules?.quoteResponseSlaHours);
  const revenueAttainmentPct = percent(revenueAmount, revenueTarget);
  const tonnageAttainmentPct = percent(tonnageKg, tonnageTargetKg);
  const quoteTargetPct = percent(quoteCount, quoteTarget);
  const routePerformance = buildRoutePerformance(contract.contractRoutes, quotes, bookings);
  const { riskLevel, riskReasons } = assessRisk({
    revenueTarget,
    revenueAttainmentPct,
    tonnageTargetKg,
    tonnageAttainmentPct,
    quoteTarget,
    quoteTargetPct,
    winRateTargetPct,
    winRatePct,
    pendingApprovalCount,
    slaBreachCount,
    routePerformance,
  });

  return {
    contractId: contract.id,
    tenderId: contract.tenderId,
    airline: contract.airline,
    airlineEmail: contract.airlineEmail,
    airlineCompanyId: contract.airlineCompanyId,
    gsaName: contract.gsaName,
    gsaCompanyId: contract.gsaCompanyId,
    market: contract.market,
    periodStart,
    periodEnd,
    quoteCount,
    bookingCount,
    pendingApprovalCount,
    rejectedQuoteCount,
    slaBreachCount,
    revenueAmount,
    revenueTarget,
    revenueAttainmentPct,
    tonnageKg,
    tonnageTargetKg,
    tonnageAttainmentPct,
    winRatePct,
    winRateTargetPct,
    quoteTarget,
    quoteTargetPct,
    riskLevel,
    riskReasons,
    recommendedActions: buildRecommendedActions(riskReasons, pendingApprovalCount, routePerformance),
    routePerformance,
  };
}

function buildRoutePerformance(routes: LiveContractRoute[], quotes: MandateQuote[], bookings: MandateBooking[]): ContractRoutePerformance[] {
  return routes.map((route) => {
    const routeQuotes = quotes.filter((quote) => quote.routeId === route.id || (quote.origin === route.origin && quote.destination === route.destination));
    const routeBookings = bookings.filter((booking) => booking.routeId === route.id || (booking.origin === route.origin && booking.destination === route.destination));
    const revenueAmount = roundMoney(routeBookings.reduce((sum, booking) => sum + booking.revenueAmount, 0));
    const quoteCount = routeQuotes.length;
    const bookingCount = routeBookings.length;
    const riskLevel = route.status === "assigned" && quoteCount === 0 && bookingCount === 0 ? "amber" : revenueAmount === 0 && quoteCount > 2 ? "red" : "green";
    return {
      routeId: route.id,
      origin: route.origin,
      destination: route.destination,
      assigned: route.status === "assigned",
      quoteCount,
      bookingCount,
      revenueAmount,
      tonnageKg: routeBookings.reduce((sum, booking) => sum + booking.weightKg, 0),
      riskLevel,
    };
  });
}

function assessRisk(input: {
  revenueTarget: number;
  revenueAttainmentPct: number;
  tonnageTargetKg: number;
  tonnageAttainmentPct: number;
  quoteTarget: number;
  quoteTargetPct: number;
  winRateTargetPct: number;
  winRatePct: number;
  pendingApprovalCount: number;
  slaBreachCount: number;
  routePerformance: ContractRoutePerformance[];
}): { riskLevel: ContractPerformanceSnapshot["riskLevel"]; riskReasons: string[] } {
  const riskReasons: string[] = [];
  if (input.revenueTarget > 0 && input.revenueAttainmentPct < 60) riskReasons.push("Revenue is below 60% of monthly target");
  if (input.tonnageTargetKg > 0 && input.tonnageAttainmentPct < 60) riskReasons.push("Booked tonnage is below 60% of monthly target");
  if (input.quoteTarget > 0 && input.quoteTargetPct < 60) riskReasons.push("Quote activity is below target");
  if (input.winRateTargetPct > 0 && input.winRatePct < input.winRateTargetPct) riskReasons.push("Quote-to-booking win rate is below target");
  if (input.pendingApprovalCount > 3) riskReasons.push("Too many quote approvals are waiting for airline decision");
  if (input.slaBreachCount > 0) riskReasons.push("Open quotes have breached SLA or customer deadline");
  if (input.routePerformance.some((route) => route.riskLevel === "red")) riskReasons.push("One or more assigned routes have quote activity but no bookings");
  if (input.routePerformance.some((route) => route.riskLevel === "amber")) riskReasons.push("One or more assigned routes have no commercial activity this month");

  const redSignals = riskReasons.filter((reason) =>
    reason.includes("below 60%") || reason.includes("breached") || reason.includes("no bookings")
  ).length;
  const riskLevel: ContractPerformanceSnapshot["riskLevel"] = redSignals > 0 ? "red" : riskReasons.length > 0 ? "amber" : "green";
  return { riskLevel, riskReasons };
}

function buildRecommendedActions(reasons: string[], pendingApprovalCount: number, routes: ContractRoutePerformance[]) {
  const actions = new Set<string>();
  if (reasons.some((reason) => reason.includes("Revenue") || reason.includes("tonnage"))) {
    actions.add("Request recovery plan from GSA");
  }
  if (reasons.some((reason) => reason.includes("Quote activity"))) actions.add("Ask GSA for weekly pipeline update");
  if (reasons.some((reason) => reason.includes("win rate"))) actions.add("Review floor rate and customer conversion issues");
  if (pendingApprovalCount > 0) actions.add("Clear pending airline quote approvals");
  if (routes.some((route) => route.riskLevel === "red")) actions.add("Consider freezing underperforming route allocation");
  if (routes.some((route) => route.riskLevel === "amber")) actions.add("Trigger route activation call");
  return Array.from(actions);
}

function countSlaBreaches(quotes: MandateQuote[], slaHours = 4) {
  const now = Date.now();
  return quotes.filter((quote) => {
    if (quote.status !== "airline-approval-required" && quote.status !== "draft") return false;
    const createdDeadline = new Date(quote.createdAt).getTime() + slaHours * 60 * 60 * 1000;
    const customerDeadline = quote.deadline ? new Date(quote.deadline).getTime() : Number.POSITIVE_INFINITY;
    return now > Math.min(createdDeadline, customerDeadline);
  }).length;
}

function currentMonthWindow() {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  return { periodStart, periodEnd };
}

function isInWindow(value: string, start: string, end: string) {
  return value >= start && value < end;
}

function percent(actual: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatTimelineMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function statusOrder(status: ControlActionStatus) {
  if (status === "open") return 0;
  if (status === "in-progress") return 1;
  if (status === "completed") return 2;
  return 3;
}

async function readStore(): Promise<MandateExecutionStore> {
  const dbStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    if (result.rows.length === 0) return null;
    return normalizeStore(rowData<Partial<MandateExecutionStore>>(result.rows[0]));
  });
  if (dbStore) return dbStore;

  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<MandateExecutionStore>);
  } catch {
    return { quotes: [], bookings: [], controlActions: [], monthlyReports: [], auditEvents: [] };
  }
}

async function writeStore(store: MandateExecutionStore) {
  const saved = await withPostgres(async (client) => {
    await client.query(
      `
        insert into app_settings (key, value, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `,
      [STORE_KEY, JSON.stringify(store)],
    );
    return true;
  });
  if (saved) return;

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function normalizeStore(store: Partial<MandateExecutionStore>): MandateExecutionStore {
  return {
    quotes: store.quotes ?? [],
    bookings: store.bookings ?? [],
    controlActions: store.controlActions ?? [],
    monthlyReports: store.monthlyReports ?? [],
    auditEvents: store.auditEvents ?? [],
  };
}
