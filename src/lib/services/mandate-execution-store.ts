import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { saveWorkflowAttachment } from "@/lib/services/attachment-store";
import { createId } from "@/lib/services/ids";
import { queueWorkflowEmail } from "@/lib/services/notification-email";
import { assertFileStoreFallbackAllowed, rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";
import { listLivePartnerContracts, type LiveContractRoute, type LivePartnerContract } from "@/lib/services/tender-workflow-store";

const STORE_PATH = path.join(process.cwd(), "data", "mandate-execution.json");
const LEGACY_STORE_KEY = "mandate_execution_store";
const EMPTY_STORE: MandateExecutionStore = {
  quotes: [],
  bookings: [],
  controlActions: [],
  controlActionComments: [],
  notifications: [],
  monthlyReports: [],
  auditEvents: [],
};

export type MandateQuoteStatus =
  | "draft"
  | "auto-approved"
  | "airline-approval-required"
  | "airline-approved"
  | "airline-rejected"
  | "countered"
  | "declined"
  | "expired";

export type MandateBookingStatus = "booked" | "flown" | "cancelled";
export type RevenueReconciliationStatus = "pending" | "reconciled" | "disputed";
export type ControlActionStatus = "open" | "in-progress" | "completed" | "cancelled";
export type ControlActionSeverity = "info" | "warning" | "critical";
export type MonthlyReportStatus = "draft" | "submitted" | "accepted" | "changes-requested" | "rejected";
export type NotificationType = "control-action" | "monthly-report" | "quote" | "booking" | "system";

const MONTHLY_REPORT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const MONTHLY_REPORT_ALLOWED_EXTENSIONS = new Set(["pdf", "csv", "xls", "xlsx"]);
const MONTHLY_REPORT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

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
  sourceChannel?: "manual" | "customer-email";
  sourceEmailText?: string;
  sourceEmailProvider?: "openai" | "rules";
  sourceEmailConfidence?: number;
  dimensions?: string;
  volumeCbm?: number;
  readyDate?: string;
  product?: string;
  routingPreference?: string;
  transitRequirement?: string;
  dangerousGoods?: boolean;
  unNumber?: string;
  dgClass?: string;
  packingInstruction?: string;
  temperatureRange?: string;
  handlingNotes?: string[];
  requestedConfirmations?: string[];
  priority?: "standard" | "priority" | "urgent";
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
> & Partial<Pick<
  MandateQuote,
  | "sourceChannel"
  | "sourceEmailText"
  | "sourceEmailProvider"
  | "sourceEmailConfidence"
  | "dimensions"
  | "volumeCbm"
  | "readyDate"
  | "product"
  | "routingPreference"
  | "transitRequirement"
  | "dangerousGoods"
  | "unNumber"
  | "dgClass"
  | "packingInstruction"
  | "temperatureRange"
  | "handlingNotes"
  | "requestedConfirmations"
  | "priority"
>>;

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
  bookedWeightKg?: number;
  flownWeightKg?: number;
  pieces: number;
  ratePerKg: number;
  revenueAmount: number;
  bookedRevenueAmount?: number;
  finalRevenueAmount?: number;
  currency: "EUR";
  awbNumber: string;
  flightNumber?: string;
  flightDate: string;
  status: MandateBookingStatus;
  reconciliationStatus?: RevenueReconciliationStatus;
  reconciliationNote?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  flownAt?: string;
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

export type BookingUpdateInput = {
  status?: MandateBookingStatus;
  flownWeightKg?: number;
  finalRatePerKg?: number;
  flightNumber?: string;
  flightDate?: string;
  reconciliationStatus?: RevenueReconciliationStatus;
  reconciliationNote?: string;
  cancellationReason?: string;
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
  assigneeName?: string;
  assigneeEmail?: string;
  sourceRiskReasons: string[];
  gsaResponse?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastUpdatedBy?: string;
  closedAt?: string;
  comments?: ControlActionComment[];
};

export type ControlActionComment = {
  id: string;
  actionId: string;
  contractId: string;
  body: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  attachmentUrl?: string;
  attachmentStoragePath?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  createdByRole: SessionPayload["role"];
};

export type ControlActionCommentInput = {
  body: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  attachmentUrl?: string;
  attachmentStoragePath?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
};

export type WorkflowNotification = {
  id: string;
  recipientRole: "airline" | "gsa" | "admin";
  recipientCompanyId?: string;
  recipientEmail?: string;
  title: string;
  body: string;
  href: string;
  type: NotificationType;
  entityId: string;
  readAt?: string;
  createdAt: string;
};

export type ControlActionCreateInput = {
  contractId: string;
  title: string;
  description?: string;
  severity?: ControlActionSeverity;
  dueDate?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  sourceRiskReasons?: string[];
};

export type ControlActionUpdateInput = {
  status?: ControlActionStatus;
  description?: string;
  severity?: ControlActionSeverity;
  dueDate?: string;
  assigneeName?: string;
  assigneeEmail?: string;
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
  version: number;
  revisions: MonthlyReportRevision[];
  changeRequestCount?: number;
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
  attachmentDataUrl?: string;
  attachmentUrl?: string;
  attachmentStoragePath?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
  ownerName?: string;
  ownerEmail?: string;
  airlineReviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastUpdatedBy?: string;
};

export type MonthlyReportRevision = {
  version: number;
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
  attachmentUrl?: string;
  attachmentStoragePath?: string;
  ownerName?: string;
  ownerEmail?: string;
  airlineReviewNote?: string;
  createdAt: string;
  createdBy: string;
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
  attachmentDataUrl?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
  ownerName?: string;
  ownerEmail?: string;
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
  controlActionComments: ControlActionComment[];
  notifications: WorkflowNotification[];
  monthlyReports: MonthlyContractReport[];
  auditEvents: MandateAuditEvent[];
};

export async function listMandateQuotes(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const visibleContractIds = new Set(contracts.filter((contract) => canViewContract(session, contract)).map((contract) => contract.id));
  return store.quotes
    .filter((quote) => visibleContractIds.has(quote.contractId))
    .map(withRuntimeQuoteStatus)
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
    .map((action) => ({
      ...action,
      comments: store.controlActionComments
        .filter((comment) => comment.actionId === action.id)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    }))
    .sort((left, right) => {
      const statusScore = statusOrder(left.status) - statusOrder(right.status);
      if (statusScore !== 0) return statusScore;
      return right.createdAt.localeCompare(left.createdAt);
    });
}

export async function listWorkflowNotifications(session: SessionPayload) {
  const store = await readStore();
  return store.notifications
    .filter((notification) => isNotificationForSession(notification, session))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function markWorkflowNotificationRead(session: SessionPayload, id: string) {
  const store = await readStore();
  const index = store.notifications.findIndex((notification) => notification.id === id);
  if (index < 0) return null;
  if (!isNotificationForSession(store.notifications[index], session)) throw new Error("Notification not found");
  store.notifications[index] = {
    ...store.notifications[index],
    readAt: store.notifications[index].readAt ?? new Date().toISOString(),
  };
  await writeStore(store);
  return store.notifications[index];
}

export async function markAllWorkflowNotificationsRead(session: SessionPayload) {
  const store = await readStore();
  const now = new Date().toISOString();
  let changed = false;
  store.notifications = store.notifications.map((notification) => {
    if (notification.readAt || !isNotificationForSession(notification, session)) return notification;
    changed = true;
    return { ...notification, readAt: now };
  });
  if (changed) await writeStore(store);
  return store.notifications.filter((notification) => isNotificationForSession(notification, session));
}

export async function createWorkflowNotifications(inputs: Array<Omit<WorkflowNotification, "id" | "createdAt">>) {
  if (inputs.length === 0) return [];
  const store = await readStore();
  const notifications = inputs.map(buildWorkflowNotification);
  store.notifications.unshift(...notifications);
  await writeStore(store);
  await dispatchWorkflowNotifications(notifications);
  return notifications;
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
  ensureContractAllowsGsaOperations(contract);
  validateQuoteInput(contract, input);

  const floorRate = contract.controlRules?.rateFloorPerKg;
  const status = getInitialQuoteStatus(input.requestedRatePerKg, floorRate, contract);
  const now = new Date().toISOString();
  const quote: MandateQuote = {
    ...input,
    id: createId("quo"),
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
  const quote = withRuntimeQuoteStatus(store.quotes[index]);
  if (quote.status === "expired") {
    store.quotes[index] = {
      ...store.quotes[index],
      status: "expired",
      decisionReason: store.quotes[index].decisionReason ?? "Customer deadline expired before quote decision.",
      updatedAt: now,
    };
    store.auditEvents.unshift(buildAuditEvent(session, {
      entityType: "quote",
      entityId: quote.id,
      action: "quote.expired",
      summary: `Quote ${quote.id} expired before decision`,
      metadata: { contractId: quote.contractId, deadline: quote.deadline },
    }));
    await writeStore(store);
    throw new Error("Quote deadline has expired");
  }

  const nextStatus = getNextQuoteStatus(session, quote, input);
  const nextQuote: MandateQuote = {
    ...quote,
    status: nextStatus,
    decisionReason: input.reason ?? quote.decisionReason,
    counterRatePerKg: input.action === "counter" ? requirePositiveCounterRate(input.counterRatePerKg) : quote.counterRatePerKg,
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
  ensureContractAllowsGsaOperations(contract);
  if (session.role === "gsa" && quote.gsaCompanyId && quote.gsaCompanyId !== session.companyId) throw new Error("Quote not found");
  if (quote.status !== "auto-approved" && quote.status !== "airline-approved") {
    throw new Error("Only approved quotes can be converted into bookings");
  }

  const awbNumber = normalizeAwbNumber(input.awbNumber) ?? generateAwbNumber();
  if (store.bookings.some((booking) => booking.awbNumber === awbNumber)) throw new Error("AWB number already exists");
  const existing = store.bookings.find((booking) => booking.quoteId === quote.id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const ratePerKg = positiveNumber(input.finalRatePerKg) ?? quote.counterRatePerKg ?? quote.requestedRatePerKg;
  const weightKg = positiveNumber(input.flownWeightKg) ?? quote.weightKg;
  const bookedRevenueAmount = roundMoney(quote.weightKg * ratePerKg);
  const revenueAmount = roundMoney(weightKg * ratePerKg);
  const booking: MandateBooking = {
    id: createId("bkg"),
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
    bookedWeightKg: quote.weightKg,
    flownWeightKg: input.flownWeightKg ? weightKg : undefined,
    pieces: quote.pieces,
    ratePerKg,
    revenueAmount,
    bookedRevenueAmount,
    finalRevenueAmount: input.flownWeightKg ? revenueAmount : undefined,
    currency: "EUR",
    awbNumber,
    flightNumber: input.flightNumber?.trim() || undefined,
    flightDate: input.flightDate || quote.flightDate,
    status: "booked",
    reconciliationStatus: "pending",
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

export async function updateMandateBooking(session: SessionPayload, id: string, input: BookingUpdateInput) {
  const store = await readStore();
  const index = store.bookings.findIndex((booking) => booking.id === id || booking.awbNumber === normalizeAwbNumber(id));
  if (index < 0) return null;

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === store.bookings[index].contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Booking not found");
  if (session.role === "gsa" && store.bookings[index].gsaCompanyId && store.bookings[index].gsaCompanyId !== session.companyId) {
    throw new Error("Booking not found");
  }
  if (session.role === "gsa" && input.status && input.status !== "cancelled") throw new Error("Only airline can mark flown or reconcile bookings");
  if ((session.role === "airline" || session.role === "admin") && !canManageWorkflow(session)) throw new Error("Manager access required");

  const current = store.bookings[index];
  const nextStatus = input.status ?? current.status;
  if (!canTransitionBookingStatus(current.status, nextStatus)) {
    throw new Error(`Invalid booking status transition from ${current.status} to ${nextStatus}`);
  }

  const now = new Date().toISOString();
  const ratePerKg = positiveNumber(input.finalRatePerKg) ?? current.ratePerKg;
  const flownWeightKg = positiveNumber(input.flownWeightKg) ?? current.flownWeightKg ?? current.weightKg;
  const finalRevenueAmount = roundMoney(flownWeightKg * ratePerKg);
  const cancelled = nextStatus === "cancelled";
  const flown = nextStatus === "flown";
  const booking: MandateBooking = {
    ...current,
    status: nextStatus,
    flightNumber: input.flightNumber !== undefined ? input.flightNumber.trim() || undefined : current.flightNumber,
    flightDate: input.flightDate || current.flightDate,
    ratePerKg,
    weightKg: cancelled ? 0 : flown ? flownWeightKg : current.weightKg,
    flownWeightKg: flown ? flownWeightKg : current.flownWeightKg,
    revenueAmount: cancelled ? 0 : flown ? finalRevenueAmount : current.revenueAmount,
    finalRevenueAmount: flown ? finalRevenueAmount : current.finalRevenueAmount,
    reconciliationStatus: input.reconciliationStatus ?? (flown ? "reconciled" : cancelled ? "reconciled" : current.reconciliationStatus ?? "pending"),
    reconciliationNote: input.reconciliationNote?.trim() || current.reconciliationNote,
    cancelledAt: cancelled ? current.cancelledAt ?? now : current.cancelledAt,
    cancelledBy: cancelled ? current.cancelledBy ?? session.email : current.cancelledBy,
    cancellationReason: cancelled ? input.cancellationReason?.trim() || current.cancellationReason || "Cancelled by user" : current.cancellationReason,
    flownAt: flown ? current.flownAt ?? now : current.flownAt,
    updatedAt: now,
  };

  store.bookings[index] = booking;
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "booking",
    entityId: booking.id,
    action: `booking.${nextStatus}`,
    summary: `${session.company} updated booking ${booking.awbNumber} to ${nextStatus}`,
    metadata: {
      contractId: booking.contractId,
      awbNumber: booking.awbNumber,
      revenueAmount: booking.revenueAmount,
      reconciliationStatus: booking.reconciliationStatus,
    },
  }));
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "revenue",
    entityId: booking.id,
    action: "revenue.reconciled",
    summary: `Revenue for ${booking.awbNumber} is now EUR ${booking.revenueAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    metadata: {
      contractId: booking.contractId,
      awbNumber: booking.awbNumber,
      status: booking.status,
      bookedRevenueAmount: booking.bookedRevenueAmount,
      finalRevenueAmount: booking.finalRevenueAmount,
    },
  }));
  await writeStore(store);
  return booking;
}

export async function createControlAction(session: SessionPayload, input: ControlActionCreateInput) {
  if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline login required");
  if (!canManageWorkflow(session)) throw new Error("Manager access required");
  if (!input.contractId || !input.title?.trim()) throw new Error("Control action needs contract and title");

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === input.contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Contract not found");
  if (contract.status === "closed") throw new Error("Closed contracts cannot receive control actions");

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
    id: createId("act"),
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
    assigneeName: input.assigneeName?.trim() || contract.contactName || contract.gsaName,
    assigneeEmail: input.assigneeEmail?.trim() || contract.email,
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
  const notifications = [buildControlActionCreatedNotification(action)];
  store.notifications.unshift(...notifications);
  await writeStore(store);
  await dispatchWorkflowNotifications(notifications);
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
  if (airlineCanEdit && !canManageWorkflow(session)) throw new Error("Manager access required");

  const nextStatus = input.status ?? current.status;
  if (gsaCanRespond && (nextStatus === "cancelled")) throw new Error("Only airline can cancel control actions");

  const action: ContractControlAction = {
    ...current,
    status: nextStatus,
    description: airlineCanEdit && input.description !== undefined ? input.description : current.description,
    severity: airlineCanEdit && input.severity ? input.severity : current.severity,
    dueDate: airlineCanEdit && input.dueDate !== undefined ? input.dueDate : current.dueDate,
    assigneeName: airlineCanEdit && input.assigneeName !== undefined ? input.assigneeName : current.assigneeName,
    assigneeEmail: airlineCanEdit && input.assigneeEmail !== undefined ? input.assigneeEmail : current.assigneeEmail,
    gsaResponse: input.gsaResponse !== undefined ? input.gsaResponse : current.gsaResponse,
    updatedAt: now,
    lastUpdatedBy: session.email,
    closedAt: nextStatus === "completed" || nextStatus === "cancelled" ? current.closedAt ?? now : undefined,
    comments: undefined,
  };

  store.controlActions[index] = action;
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "control-action",
    entityId: action.id,
    action: "control_action.updated",
    summary: `${session.company} updated control action ${action.title} to ${action.status}`,
    metadata: { contractId: action.contractId, status: action.status, severity: action.severity },
  }));
  const notifications = buildControlActionUpdateNotifications(session, action);
  store.notifications.unshift(...notifications);
  await writeStore(store);
  await dispatchWorkflowNotifications(notifications);
  return action;
}

export async function listControlActionComments(session: SessionPayload, actionId: string) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const action = store.controlActions.find((item) => item.id === actionId);
  if (!action) throw new Error("Control action not found");
  const contract = contracts.find((item) => item.id === action.contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Control action not found");
  return store.controlActionComments
    .filter((comment) => comment.actionId === actionId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function addControlActionComment(session: SessionPayload, actionId: string, input: ControlActionCommentInput) {
  if (!input.body?.trim() && !input.attachmentName?.trim()) throw new Error("Comment or attachment required");

  const store = await readStore();
  const actionIndex = store.controlActions.findIndex((item) => item.id === actionId);
  if (actionIndex < 0) throw new Error("Control action not found");
  const action = store.controlActions[actionIndex];

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === action.contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Control action not found");

  const now = new Date().toISOString();
  const storedAttachment = await saveWorkflowAttachment({
    contractId: action.contractId,
    entityType: "control-action-comment",
    fileName: input.attachmentName,
    mimeType: input.attachmentMimeType,
    size: input.attachmentSize,
    dataUrl: input.attachmentDataUrl,
  });
  const comment: ControlActionComment = {
    id: createId("actc"),
    actionId: action.id,
    contractId: action.contractId,
    body: input.body?.trim() || "",
    attachmentName: input.attachmentName?.trim() || undefined,
    attachmentDataUrl: undefined,
    attachmentUrl: storedAttachment?.attachmentUrl,
    attachmentStoragePath: storedAttachment?.attachmentStoragePath,
    attachmentMimeType: input.attachmentMimeType,
    attachmentSize: input.attachmentSize,
    createdAt: now,
    createdBy: session.email,
    createdByName: session.name,
    createdByRole: session.role,
  };

  store.controlActionComments.unshift(comment);
  store.controlActions[actionIndex] = {
    ...action,
    updatedAt: now,
    lastUpdatedBy: session.email,
    status: session.role === "gsa" && action.status === "open" ? "in-progress" : action.status,
    comments: undefined,
  };
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "control-action",
    entityId: action.id,
    action: "control_action.comment",
    summary: `${session.company} commented on control action ${action.title}`,
    metadata: { contractId: action.contractId, attachmentName: comment.attachmentName },
  }));
  const notifications = buildControlActionCommentNotifications(session, store.controlActions[actionIndex], comment);
  store.notifications.unshift(...notifications);
  await writeStore(store);
  await dispatchWorkflowNotifications(notifications);
  return comment;
}

export async function createMonthlyReport(session: SessionPayload, input: MonthlyReportInput) {
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");
  if (!input.contractId) throw new Error("Monthly report needs a contract");

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === input.contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Contract not found");
  ensureContractAllowsGsaOperations(contract);

  const store = await readStore();
  const existingIndex = store.monthlyReports.findIndex((report) => report.contractId === contract.id && report.period === input.period);
  const now = new Date().toISOString();
  const baseReport = existingIndex >= 0 ? store.monthlyReports[existingIndex] : null;
  validateMonthlyReportInput(session, input, Boolean(input.submit));
  assertGsaMonthlyReportWriteAllowed(baseReport, Boolean(input.submit));
  const storedAttachment = await saveWorkflowAttachment({
    contractId: contract.id,
    entityType: "monthly-report",
    fileName: input.attachmentName,
    mimeType: input.attachmentMimeType,
    size: input.attachmentSize,
    dataUrl: input.attachmentDataUrl,
  });

  const status: MonthlyReportStatus = input.submit ? "submitted" : baseReport?.status === "changes-requested" ? "changes-requested" : "draft";
  const version = getNextMonthlyReportVersion(baseReport, status);
  const revisions = baseReport ? appendMonthlyReportRevision(baseReport, session) : [];
  const report: MonthlyContractReport = {
    ...(baseReport ?? {}),
    id: baseReport?.id ?? createId("mrep"),
    contractId: contract.id,
    tenderId: contract.tenderId,
    airline: contract.airline,
    airlineEmail: contract.airlineEmail,
    airlineCompanyId: contract.airlineCompanyId,
    gsaName: contract.gsaName,
    gsaCompanyId: contract.gsaCompanyId,
    market: contract.market,
    period: input.period,
    version,
    revisions,
    changeRequestCount: baseReport?.changeRequestCount ?? 0,
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
    attachmentDataUrl: undefined,
    attachmentUrl: storedAttachment?.attachmentUrl ?? baseReport?.attachmentUrl,
    attachmentStoragePath: storedAttachment?.attachmentStoragePath ?? baseReport?.attachmentStoragePath,
    attachmentMimeType: input.attachmentMimeType,
    attachmentSize: input.attachmentSize,
    ownerName: normalizeOwnerName(session, input.ownerName),
    ownerEmail: normalizeOwnerEmail(session, input.ownerEmail),
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
    metadata: { contractId: report.contractId, period: report.period, status: report.status, version: report.version },
  }));
  const notifications = status === "submitted" ? [buildMonthlyReportSubmittedNotification(report)] : [];
  store.notifications.unshift(...notifications);
  await writeStore(store);
  await dispatchWorkflowNotifications(notifications);
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
  const wantsAirlineReview = Boolean(input.status && ["accepted", "changes-requested", "rejected"].includes(input.status));
  const airlineCanReview = session.role === "airline" || (session.role === "admin" && wantsAirlineReview);
  const gsaCanEdit = session.role === "gsa" || (session.role === "admin" && !wantsAirlineReview);
  if (!airlineCanReview && !gsaCanEdit) throw new Error("Not allowed");
  if (airlineCanReview && !canManageWorkflow(session)) throw new Error("Manager access required");

  const now = new Date().toISOString();
  let status = current.status;
  if (input.status) {
    status = getNextMonthlyReportStatus(session, current.status, input.status, airlineCanReview, gsaCanEdit);
  }

  if (gsaCanEdit) {
    assertGsaMonthlyReportWriteAllowed(current, status === "submitted");
    validateMonthlyReportInput(session, { ...current, ...input, contractId: current.contractId, summary: input.summary ?? current.summary }, status === "submitted");
  }
  const storedAttachment = gsaCanEdit
    ? await saveWorkflowAttachment({
        contractId: current.contractId,
        entityType: "monthly-report",
        fileName: input.attachmentName,
        mimeType: input.attachmentMimeType,
        size: input.attachmentSize,
        dataUrl: input.attachmentDataUrl,
      })
    : null;

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
    attachmentDataUrl: undefined,
    attachmentUrl: storedAttachment?.attachmentUrl ?? current.attachmentUrl,
    attachmentStoragePath: storedAttachment?.attachmentStoragePath ?? current.attachmentStoragePath,
    attachmentMimeType: gsaCanEdit && input.attachmentMimeType !== undefined ? input.attachmentMimeType : current.attachmentMimeType,
    attachmentSize: gsaCanEdit && input.attachmentSize !== undefined ? input.attachmentSize : current.attachmentSize,
    ownerName: gsaCanEdit && input.ownerName !== undefined ? input.ownerName : current.ownerName,
    ownerEmail: gsaCanEdit && input.ownerEmail !== undefined ? input.ownerEmail : current.ownerEmail,
    version: gsaCanEdit ? getNextMonthlyReportVersion(current, status) : current.version,
    revisions: gsaCanEdit ? appendMonthlyReportRevision(current, session) : current.revisions ?? [],
    changeRequestCount: airlineCanReview && status === "changes-requested" && current.status !== "changes-requested"
      ? (current.changeRequestCount ?? 0) + 1
      : current.changeRequestCount,
    airlineReviewNote: airlineCanReview && input.airlineReviewNote !== undefined ? input.airlineReviewNote?.trim() : current.airlineReviewNote,
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
    metadata: { contractId: report.contractId, period: report.period, status: report.status, version: report.version },
  }));
  if (airlineCanReview && ["accepted", "changes-requested", "rejected"].includes(status)) {
    const notifications = [buildMonthlyReportReviewedNotification(report)];
    store.notifications.unshift(...notifications);
    await writeStore(store);
    await dispatchWorkflowNotifications(notifications);
    return report;
  }
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
    ...store.controlActionComments.filter((comment) => actionIds.has(comment.actionId)).map((comment): ContractTimelineEvent => ({
      id: comment.id,
      type: "control-action",
      title: "Control action comment",
      summary: comment.attachmentName ? `${comment.body || "Attachment added"} (${comment.attachmentName})` : comment.body,
      createdAt: comment.createdAt,
      actor: comment.createdByName,
      metadata: { controlActionId: comment.actionId, attachmentName: comment.attachmentName },
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

export async function createRecommendedControlActions(session: SessionPayload) {
  if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline login required");
  if (!canManageWorkflow(session)) throw new Error("Manager access required");

  const snapshots = await listContractPerformance(session);
  const store = await readStore();
  const contracts = await listLivePartnerContracts();
  const visibleContracts = contracts.filter((contract) => canViewContract(session, contract));
  const created: ContractControlAction[] = [];

  for (const snapshot of snapshots) {
    if (snapshot.riskLevel === "green") continue;
    const contract = visibleContracts.find((item) => item.id === snapshot.contractId);
    if (!contract) continue;

    for (const title of snapshot.recommendedActions) {
      const exists = store.controlActions.some((action) =>
        action.contractId === snapshot.contractId &&
        action.title.toLowerCase() === title.toLowerCase() &&
        action.status !== "completed" &&
        action.status !== "cancelled",
      );
      if (exists) continue;

      const now = new Date().toISOString();
      const dueDate = new Date(Date.now() + (snapshot.riskLevel === "red" ? 3 : 7) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const action: ContractControlAction = {
        id: createId("act"),
        contractId: contract.id,
        tenderId: contract.tenderId,
        airline: contract.airline,
        airlineEmail: contract.airlineEmail,
        airlineCompanyId: contract.airlineCompanyId,
        gsaName: contract.gsaName,
        gsaCompanyId: contract.gsaCompanyId,
        market: contract.market,
        title,
        description: snapshot.riskReasons.join("; ") || "Automatically generated from KPI risk scoring.",
        severity: snapshot.riskLevel === "red" ? "critical" : "warning",
        status: "open",
        dueDate,
        assigneeName: contract.contactName || contract.gsaName,
        assigneeEmail: contract.email,
        sourceRiskReasons: snapshot.riskReasons,
        createdAt: now,
        updatedAt: now,
        createdBy: session.email,
      };
      store.controlActions.unshift(action);
      const notification = buildControlActionCreatedNotification(action);
      store.notifications.unshift(notification);
      store.auditEvents.unshift(buildAuditEvent(session, {
        entityType: "control-action",
        entityId: action.id,
        action: "control_action.auto_created",
        summary: `Auto-created control action for ${action.gsaName}: ${action.title}`,
        metadata: { contractId: action.contractId, status: action.status, severity: action.severity },
      }));
      created.push(action);
    }
  }

  if (created.length > 0) {
    await writeStore(store);
    await dispatchWorkflowNotifications(
      store.notifications.filter((notification) => notification.type === "control-action" && created.some((action) => action.id === notification.entityId)),
    );
  }
  return created;
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

function getNextQuoteStatus(session: SessionPayload, quote: MandateQuote, input: QuoteActionInput): MandateQuoteStatus {
  if (isTerminalQuoteStatus(quote.status)) throw new Error(`Quote is already ${quote.status}`);

  if (input.action === "approve") {
    if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline approval required");
    if (quote.status !== "airline-approval-required") throw new Error("Only quotes waiting for airline approval can be approved");
    return "airline-approved";
  }
  if (input.action === "reject") {
    if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline approval required");
    if (quote.status !== "airline-approval-required") throw new Error("Only quotes waiting for airline approval can be rejected");
    return "airline-rejected";
  }
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");
  if (input.action === "counter") {
    requirePositiveCounterRate(input.counterRatePerKg);
    return "countered";
  }
  return "declined";
}

function validateQuoteInput(contract: LivePartnerContract, input: QuoteCreateInput) {
  if (!input.customer?.trim()) throw new Error("Customer is required");
  if (!input.origin?.trim() || !input.destination?.trim()) throw new Error("Route origin and destination are required");
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) throw new Error("Quote weight must be greater than zero");
  if (!Number.isFinite(input.pieces) || input.pieces <= 0) throw new Error("Quote pieces must be greater than zero");
  if (!Number.isFinite(input.requestedRatePerKg) || input.requestedRatePerKg <= 0) throw new Error("Quote rate must be greater than zero");
  if (!input.flightDate || Number.isNaN(new Date(input.flightDate).getTime())) throw new Error("Valid flight date is required");
  if (!input.deadline || Number.isNaN(new Date(input.deadline).getTime())) throw new Error("Valid customer deadline is required");
  if (new Date(input.deadline).getTime() <= Date.now()) throw new Error("Customer deadline must be in the future");

  const assignedRoutes = contract.contractRoutes.filter((route) => route.status === "assigned");
  if (assignedRoutes.length === 0) throw new Error("Contract has no assigned routes");
  if (input.routeId) {
    const route = assignedRoutes.find((item) => item.id === input.routeId);
    if (!route) throw new Error("Quote route is not assigned to this GSA contract");
    if (route.origin !== input.origin || route.destination !== input.destination) {
      throw new Error("Quote route does not match the assigned contract route");
    }
  }
}

function validateMonthlyReportInput(session: SessionPayload, input: MonthlyReportInput, submitting: boolean) {
  if (!/^\d{4}-\d{2}$/.test(input.period)) throw new Error("Monthly report period must use YYYY-MM");
  if (!input.summary?.trim()) throw new Error("Monthly report summary is required");
  if (submitting && input.summary.trim().length < 20) throw new Error("Submitted monthly report summary must be at least 20 characters");

  const numericFields = [
    ["reported revenue", input.reportedRevenue ?? 0],
    ["reported tonnage", input.reportedTonnageKg ?? 0],
    ["reported quotes", input.reportedQuotes ?? 0],
    ["reported bookings", input.reportedBookings ?? 0],
  ] as const;
  for (const [label, value] of numericFields) {
    if (!Number.isFinite(Number(value)) || Number(value) < 0) throw new Error(`Monthly report ${label} must be zero or greater`);
  }

  const ownerEmail = normalizeOwnerEmail(session, input.ownerEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw new Error("Monthly report owner email is invalid");
  if (submitting && !normalizeOwnerName(session, input.ownerName)) throw new Error("Monthly report owner is required");
  validateMonthlyReportAttachment(input);
}

function validateMonthlyReportAttachment(input: Pick<MonthlyReportInput, "attachmentName" | "attachmentDataUrl" | "attachmentMimeType" | "attachmentSize">) {
  if (!input.attachmentName && !input.attachmentDataUrl) return;
  const fileName = input.attachmentName?.trim();
  if (!fileName) throw new Error("Monthly report attachment needs a file name");
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  if (!extension || !MONTHLY_REPORT_ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Monthly report attachment must be PDF, CSV, XLS or XLSX");
  }
  if (input.attachmentMimeType && !MONTHLY_REPORT_ALLOWED_MIME_TYPES.has(input.attachmentMimeType) && input.attachmentMimeType !== "application/octet-stream") {
    throw new Error("Monthly report attachment type is not allowed");
  }
  if (input.attachmentSize !== undefined && input.attachmentSize > MONTHLY_REPORT_ATTACHMENT_MAX_BYTES) {
    throw new Error("Monthly report attachment must be 5 MB or smaller");
  }
}

function assertGsaMonthlyReportWriteAllowed(report: MonthlyContractReport | null, submitting: boolean) {
  if (!report) return;
  if (report.status === "accepted") throw new Error("Accepted reports cannot be overwritten");
  if (report.status === "rejected") throw new Error("Rejected reports are closed");
  if (report.status === "submitted") throw new Error("Submitted reports are locked until airline review");
  if (report.status === "changes-requested" && !submitting) return;
}

function getNextMonthlyReportStatus(
  session: SessionPayload,
  current: MonthlyReportStatus,
  next: MonthlyReportStatus,
  airlineCanReview: boolean,
  gsaCanEdit: boolean,
) {
  if (next === current) return next;
  if (airlineCanReview) {
    if (current !== "submitted") throw new Error("Only submitted reports can be reviewed");
    if (next === "accepted" || next === "changes-requested" || next === "rejected") return next;
  }
  if (gsaCanEdit) {
    if (current === "draft" && (next === "draft" || next === "submitted")) return next;
    if (current === "changes-requested" && next === "submitted") return next;
  }
  throw new Error(`Invalid monthly report status transition for ${session.role}`);
}

function getNextMonthlyReportVersion(report: MonthlyContractReport | null, nextStatus: MonthlyReportStatus) {
  const currentVersion = report?.version ?? 1;
  if (!report) return 1;
  if (report.status === "changes-requested" && nextStatus === "submitted") return currentVersion + 1;
  return currentVersion;
}

function appendMonthlyReportRevision(report: MonthlyContractReport, session: SessionPayload): MonthlyReportRevision[] {
  const revisions = report.revisions ?? [];
  const lastRevision = revisions[revisions.length - 1];
  if (lastRevision?.version === report.version && lastRevision.status === report.status && lastRevision.createdAt === report.updatedAt) {
    return revisions;
  }
  return [
    ...revisions,
    {
      version: report.version ?? 1,
      status: report.status,
      reportedRevenue: report.reportedRevenue,
      reportedTonnageKg: report.reportedTonnageKg,
      reportedQuotes: report.reportedQuotes,
      reportedBookings: report.reportedBookings,
      summary: report.summary,
      pipelineNotes: report.pipelineNotes,
      risks: report.risks,
      supportNeeded: report.supportNeeded,
      attachmentName: report.attachmentName,
      attachmentUrl: report.attachmentUrl,
      attachmentStoragePath: report.attachmentStoragePath,
      ownerName: report.ownerName,
      ownerEmail: report.ownerEmail,
      airlineReviewNote: report.airlineReviewNote,
      createdAt: report.updatedAt,
      createdBy: session.email,
    },
  ];
}

function normalizeOwnerName(session: SessionPayload, value: string | undefined) {
  return value?.trim() || session.name;
}

function normalizeOwnerEmail(session: SessionPayload, value: string | undefined) {
  return value?.trim().toLowerCase() || session.email.toLowerCase();
}

function withRuntimeQuoteStatus(quote: MandateQuote): MandateQuote {
  if (!isOpenQuoteStatus(quote.status) || !isQuotePastDeadline(quote)) return quote;
  return {
    ...quote,
    status: "expired",
    decisionReason: quote.decisionReason ?? "Customer deadline expired before quote decision.",
  };
}

function isOpenQuoteStatus(status: MandateQuoteStatus) {
  return status === "draft" || status === "airline-approval-required" || status === "countered";
}

function isTerminalQuoteStatus(status: MandateQuoteStatus) {
  return status === "airline-approved" || status === "airline-rejected" || status === "declined" || status === "expired";
}

function isQuotePastDeadline(quote: Pick<MandateQuote, "deadline">) {
  const deadline = new Date(quote.deadline).getTime();
  return Number.isFinite(deadline) && deadline <= Date.now();
}

function requirePositiveCounterRate(value: number | undefined) {
  if (!Number.isFinite(value) || value === undefined || value <= 0) throw new Error("Counter rate must be greater than zero");
  return value;
}

function buildAuditEvent(
  session: SessionPayload,
  event: Omit<MandateAuditEvent, "id" | "actorEmail" | "actorName" | "actorRole" | "company" | "createdAt">,
): MandateAuditEvent {
  return {
    ...event,
    id: createId("aud"),
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

function normalizeAwbNumber(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const digits = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) throw new Error("AWB must contain 11 digits including 3 digit prefix");
  const serial = digits.slice(3);
  if (!isValidAwbCheckDigit(serial)) throw new Error("AWB check digit is invalid");
  return `${digits.slice(0, 3)}-${serial}`;
}

function isValidAwbCheckDigit(serialWithCheckDigit: string) {
  if (!/^\d{8}$/.test(serialWithCheckDigit)) return false;
  const serial = serialWithCheckDigit.slice(0, 7);
  const checkDigit = Number(serialWithCheckDigit[7]);
  return Number(serial) % 7 === checkDigit;
}

function canTransitionBookingStatus(current: MandateBookingStatus, next: MandateBookingStatus) {
  if (current === next) return true;
  if (current === "booked") return next === "flown" || next === "cancelled";
  return false;
}

function ensureContractAllowsGsaOperations(contract: Pick<LivePartnerContract, "status">) {
  if (contract.status === "active") return;
  if (contract.status === "pending") throw new Error("Contract is not active yet");
  if (contract.status === "suspended") throw new Error("Contract is suspended");
  throw new Error("Contract is closed");
}

function generateAwbNumber() {
  return `160-${Date.now().toString().slice(-8)}`;
}

function buildContractPerformance(contract: LivePartnerContract, store: MandateExecutionStore): ContractPerformanceSnapshot {
  const { periodStart, periodEnd } = currentMonthWindow();
  const quotes = store.quotes
    .map(withRuntimeQuoteStatus)
    .filter((quote) => quote.contractId === contract.id && isInWindow(quote.createdAt, periodStart, periodEnd));
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
  const rejectedQuoteCount = quotes.filter((quote) => quote.status === "airline-rejected" || quote.status === "declined" || quote.status === "expired").length;
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
    if (quote.status === "expired") return true;
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

function buildWorkflowNotification(input: Omit<WorkflowNotification, "id" | "createdAt">): WorkflowNotification {
  return {
    ...input,
    id: createId("ntf"),
    createdAt: new Date().toISOString(),
  };
}

async function dispatchWorkflowNotifications(notifications: WorkflowNotification[]) {
  if (notifications.length === 0) return;
  await Promise.all(notifications.map(async (notification) => {
    try {
      await queueWorkflowEmail(notification);
    } catch (error) {
      console.warn("[notifications] email dispatch failed:", (error as Error).message);
    }
  }));
}

function buildControlActionCreatedNotification(action: ContractControlAction) {
  return buildWorkflowNotification({
    recipientRole: "gsa",
    recipientCompanyId: action.gsaCompanyId,
    recipientEmail: action.assigneeEmail,
    title: `New airline control action: ${action.title}`,
    body: `${action.airline} opened a ${action.severity} action for ${action.market}.`,
    href: "/gsa/performance",
    type: "control-action",
    entityId: action.id,
  });
}

function buildControlActionUpdateNotifications(session: SessionPayload, action: ContractControlAction) {
  if (session.role === "gsa") {
    return [buildWorkflowNotification({
      recipientRole: "airline",
      recipientCompanyId: action.airlineCompanyId,
      recipientEmail: action.airlineEmail,
      title: `${action.gsaName} updated a control action`,
      body: `${action.title} is now ${action.status}.`,
      href: "/airline/contracts",
      type: "control-action",
      entityId: action.id,
    })];
  }
  if (session.role === "airline") {
    return [buildWorkflowNotification({
      recipientRole: "gsa",
      recipientCompanyId: action.gsaCompanyId,
      recipientEmail: action.assigneeEmail,
      title: `Airline updated action: ${action.title}`,
      body: `${action.airline} changed the action status to ${action.status}.`,
      href: "/gsa/performance",
      type: "control-action",
      entityId: action.id,
    })];
  }
  return [];
}

function buildControlActionCommentNotifications(session: SessionPayload, action: ContractControlAction, comment: ControlActionComment) {
  if (session.role === "gsa") {
    return [buildWorkflowNotification({
      recipientRole: "airline",
      recipientCompanyId: action.airlineCompanyId,
      recipientEmail: action.airlineEmail,
      title: `${action.gsaName} commented on a control action`,
      body: comment.attachmentName ? `${comment.body || "Attachment added"} (${comment.attachmentName})` : comment.body,
      href: "/airline/contracts",
      type: "control-action",
      entityId: action.id,
    })];
  }
  if (session.role === "airline") {
    return [buildWorkflowNotification({
      recipientRole: "gsa",
      recipientCompanyId: action.gsaCompanyId,
      recipientEmail: action.assigneeEmail,
      title: `${action.airline} commented on an action`,
      body: comment.attachmentName ? `${comment.body || "Attachment added"} (${comment.attachmentName})` : comment.body,
      href: "/gsa/performance",
      type: "control-action",
      entityId: action.id,
    })];
  }
  return [];
}

function buildMonthlyReportSubmittedNotification(report: MonthlyContractReport) {
  return buildWorkflowNotification({
    recipientRole: "airline",
    recipientCompanyId: report.airlineCompanyId,
    recipientEmail: report.airlineEmail,
    title: `${report.gsaName} submitted monthly report ${report.period}`,
    body: `${formatTimelineMoney(report.reportedRevenue)}, ${Math.round(report.reportedTonnageKg).toLocaleString()} kg reported.`,
    href: "/airline/contracts",
    type: "monthly-report",
    entityId: report.id,
  });
}

function buildMonthlyReportReviewedNotification(report: MonthlyContractReport) {
  return buildWorkflowNotification({
    recipientRole: "gsa",
    recipientCompanyId: report.gsaCompanyId,
    recipientEmail: report.ownerEmail,
    title: `${report.airline} reviewed monthly report ${report.period}`,
    body: `Report status: ${report.status}${report.airlineReviewNote ? ` - ${report.airlineReviewNote}` : ""}`,
    href: "/gsa/monthly-reports",
    type: "monthly-report",
    entityId: report.id,
  });
}

function isNotificationForSession(notification: WorkflowNotification, session: SessionPayload) {
  if (session.role === "admin") return true;
  if (notification.recipientRole !== session.role) return false;
  if (notification.recipientCompanyId && session.companyId) return notification.recipientCompanyId === session.companyId;
  if (notification.recipientEmail) return notification.recipientEmail.toLowerCase() === session.email.toLowerCase();
  return false;
}

function canManageWorkflow(session: SessionPayload) {
  return session.role === "admin" || session.accessRole === undefined || ["owner", "admin", "manager"].includes(session.accessRole);
}

function statusOrder(status: ControlActionStatus) {
  if (status === "open") return 0;
  if (status === "in-progress") return 1;
  if (status === "completed") return 2;
  return 3;
}

async function readStore(): Promise<MandateExecutionStore> {
  const dbStore = await readStoreFromPostgres();
  if (dbStore) {
    if (!isEmptyStore(dbStore)) return dbStore;

    const legacyStore = await readLegacyStore();
    if (!isEmptyStore(legacyStore)) {
      await writeStoreToPostgres(legacyStore);
      return legacyStore;
    }

    return EMPTY_STORE;
  }

  return readLegacyStore();
}

async function writeStore(store: MandateExecutionStore) {
  const saved = await writeStoreToPostgres(store);
  if (saved) return;

  assertFileStoreFallbackAllowed("Mandate execution store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalizeStore(store), null, 2)}\n`, "utf-8");
}

function normalizeStore(store: Partial<MandateExecutionStore>): MandateExecutionStore {
  return {
    quotes: store.quotes ?? EMPTY_STORE.quotes,
    bookings: store.bookings ?? EMPTY_STORE.bookings,
    controlActions: store.controlActions ?? EMPTY_STORE.controlActions,
    controlActionComments: store.controlActionComments ?? EMPTY_STORE.controlActionComments,
    notifications: store.notifications ?? EMPTY_STORE.notifications,
    monthlyReports: store.monthlyReports ?? EMPTY_STORE.monthlyReports,
    auditEvents: store.auditEvents ?? EMPTY_STORE.auditEvents,
  };
}

async function readStoreFromPostgres(): Promise<MandateExecutionStore | null> {
  return withPostgres(async (client) => {
    const [
      quotesResult,
      bookingsResult,
      actionsResult,
      commentsResult,
      notificationsResult,
      reportsResult,
      auditResult,
    ] = await Promise.all([
      client.query("select data from public.workflow_mandate_quotes order by created_at desc"),
      client.query("select data from public.workflow_mandate_bookings order by created_at desc"),
      client.query("select data from public.workflow_control_actions order by updated_at desc"),
      client.query("select data from public.workflow_control_action_comments order by created_at asc"),
      client.query("select data from public.workflow_notifications order by created_at desc"),
      client.query("select data from public.workflow_monthly_reports order by period desc, updated_at desc"),
      client.query("select data from public.workflow_audit_events order by created_at desc"),
    ]);

    return normalizeStore({
      quotes: quotesResult.rows.map((row) => rowData<MandateQuote>(row)),
      bookings: bookingsResult.rows.map((row) => rowData<MandateBooking>(row)),
      controlActions: actionsResult.rows.map((row) => rowData<ContractControlAction>(row)),
      controlActionComments: commentsResult.rows.map((row) => rowData<ControlActionComment>(row)),
      notifications: notificationsResult.rows.map((row) => rowData<WorkflowNotification>(row)),
      monthlyReports: reportsResult.rows.map((row) => rowData<MonthlyContractReport>(row)),
      auditEvents: auditResult.rows.map((row) => rowData<MandateAuditEvent>(row)),
    });
  });
}

async function readLegacyStore(): Promise<MandateExecutionStore> {
  const dbStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [LEGACY_STORE_KEY]);
    return result.rows[0] ? normalizeStore(rowData<Partial<MandateExecutionStore>>(result.rows[0])) : null;
  });
  if (dbStore) return dbStore;

  assertFileStoreFallbackAllowed("Mandate execution store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<MandateExecutionStore>);
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStoreToPostgres(store: MandateExecutionStore) {
  const normalizedStore = normalizeStore(store);
  return withPostgresTransaction(async (client) => {
    await client.query("delete from public.workflow_control_action_comments");
    await client.query("delete from public.workflow_notifications");
    await client.query("delete from public.workflow_audit_events");
    await client.query("delete from public.workflow_monthly_reports");
    await client.query("delete from public.workflow_control_actions");
    await client.query("delete from public.workflow_mandate_bookings");
    await client.query("delete from public.workflow_mandate_quotes");

    for (const quote of normalizedStore.quotes) {
      await client.query(
        `insert into public.workflow_mandate_quotes
          (id, contract_id, airline_company_id, gsa_company_id, status, deadline, created_at, updated_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          quote.id,
          quote.contractId,
          quote.airlineCompanyId ?? null,
          quote.gsaCompanyId ?? null,
          quote.status,
          quote.deadline || null,
          quote.createdAt,
          quote.updatedAt,
          JSON.stringify(quote),
        ],
      );
    }

    for (const booking of normalizedStore.bookings) {
      await client.query(
        `insert into public.workflow_mandate_bookings
          (id, contract_id, quote_id, airline_company_id, gsa_company_id, status, created_at, updated_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          booking.id,
          booking.contractId,
          booking.quoteId,
          booking.airlineCompanyId ?? null,
          booking.gsaCompanyId ?? null,
          booking.status,
          booking.createdAt,
          booking.updatedAt,
          JSON.stringify(booking),
        ],
      );
    }

    for (const action of normalizedStore.controlActions) {
      await client.query(
        `insert into public.workflow_control_actions
          (id, contract_id, airline_company_id, gsa_company_id, status, severity, due_date, created_at, updated_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          action.id,
          action.contractId,
          action.airlineCompanyId ?? null,
          action.gsaCompanyId ?? null,
          action.status,
          action.severity,
          action.dueDate || null,
          action.createdAt,
          action.updatedAt,
          JSON.stringify({ ...action, comments: undefined }),
        ],
      );
    }

    for (const comment of normalizedStore.controlActionComments) {
      const action = normalizedStore.controlActions.find((item) => item.id === comment.actionId);
      await client.query(
        `insert into public.workflow_control_action_comments
          (id, action_id, contract_id, airline_company_id, gsa_company_id, created_at, data)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          comment.id,
          comment.actionId,
          comment.contractId,
          action?.airlineCompanyId ?? null,
          action?.gsaCompanyId ?? null,
          comment.createdAt,
          JSON.stringify(comment),
        ],
      );
    }

    for (const report of normalizedStore.monthlyReports) {
      await client.query(
        `insert into public.workflow_monthly_reports
          (id, contract_id, airline_company_id, gsa_company_id, period, status, version, created_at, updated_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          report.id,
          report.contractId,
          report.airlineCompanyId ?? null,
          report.gsaCompanyId ?? null,
          report.period,
          report.status,
          report.version,
          report.createdAt,
          report.updatedAt,
          JSON.stringify(report),
        ],
      );
    }

    for (const event of normalizedStore.auditEvents) {
      await client.query(
        `insert into public.workflow_audit_events
          (id, contract_id, entity_type, entity_id, actor_email, actor_role, created_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          event.id,
          resolveAuditContractId(event),
          event.entityType,
          event.entityId,
          event.actorEmail,
          event.actorRole,
          event.createdAt,
          JSON.stringify(event),
        ],
      );
    }

    for (const notification of normalizedStore.notifications) {
      await client.query(
        `insert into public.workflow_notifications
          (id, recipient_role, recipient_company_id, recipient_email, type, entity_id, read_at, created_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          notification.id,
          notification.recipientRole,
          notification.recipientCompanyId ?? null,
          notification.recipientEmail ?? null,
          notification.type,
          notification.entityId,
          notification.readAt ?? null,
          notification.createdAt,
          JSON.stringify(notification),
        ],
      );
    }

    return true;
  });
}

function resolveAuditContractId(event: MandateAuditEvent) {
  if (event.entityType === "contract" || event.entityType === "route") return event.entityId;
  const contractId = event.metadata?.contractId;
  return typeof contractId === "string" && contractId ? contractId : null;
}

function isEmptyStore(store: MandateExecutionStore) {
  return (
    store.quotes.length === 0 &&
    store.bookings.length === 0 &&
    store.controlActions.length === 0 &&
    store.controlActionComments.length === 0 &&
    store.notifications.length === 0 &&
    store.monthlyReports.length === 0 &&
    store.auditEvents.length === 0
  );
}
