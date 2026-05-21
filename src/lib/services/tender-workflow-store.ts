import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { QueryResultRow } from "pg";
import { saveWorkflowAttachment, type StoredAttachment } from "@/lib/services/attachment-store";
import { createId } from "@/lib/services/ids";
import { assertFileStoreFallbackAllowed, rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";
import type { Status } from "@/lib/types";
import type { SessionPayload } from "@/lib/auth/session";

const STORE_PATH = path.join(process.cwd(), "data", "tender-workflow.json");

export type TenderRouteFrequency = {
  id: string;
  origin: string;
  destination: string;
  operatingDays?: string;
  weekday?: string;
  frequencyPerWeek: number;
  aircraft?: string;
};

export type TenderWorkflowDocument = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string;
  documentUrl?: string;
  storagePath?: string;
};

export type LiveTender = {
  id: string;
  title: string;
  airline: string;
  airlineEmail: string;
  airlineCompanyId?: string;
  countryScope: string;
  regions: string[];
  lanes: string;
  annualTonnage: number;
  productMix: string;
  deadline: string;
  expectedStart: string;
  status: Extract<Status, "draft" | "open" | "closed">;
  awardMode?: "single" | "multi";
  maxAwards?: number;
  commercialModel?: "commission" | "capacity-risk" | "hybrid";
  requirements: string[];
  commercialExpectations: string;
  routes: TenderRouteFrequency[];
  attachments: TenderWorkflowDocument[];
  createdAt: string;
  updatedAt: string;
};

export type LiveTenderApplication = {
  id: string;
  tenderId: string;
  gsaId: string;
  gsaCompanyId?: string;
  gsaName: string;
  contactName: string;
  email: string;
  headquarters: string;
  coverage: string[];
  markets: string[];
  certifications: string[];
  cargoFocus: string;
  networkScore: number;
  financialScore: number;
  complianceScore: number;
  winRate: number;
  proposedCommission: string;
  launchTimeline: string;
  namedAccountCoverage: string;
  monthlySalesTarget: string;
  networkPlan: string;
  operationalReadiness: string;
  documents: TenderWorkflowDocument[];
  status: Extract<Status, "pending" | "shortlisted" | "accepted" | "rejected">;
  submittedAt: string;
  updatedAt: string;
};

export type LivePartnerContract = {
  id: string;
  tenderId: string;
  sourceApplicationId: string;
  airline: string;
  airlineEmail: string;
  airlineCompanyId?: string;
  gsaId: string;
  gsaCompanyId?: string;
  gsaName: string;
  contactName?: string;
  email?: string;
  headquarters?: string;
  coverage?: string[];
  markets?: string[];
  certifications?: string[];
  cargoFocus?: string;
  networkScore?: number;
  financialScore?: number;
  complianceScore?: number;
  winRate?: number;
  market: string;
  startDate: string;
  endDate?: string;
  status: Extract<Status, "pending" | "active" | "suspended" | "closed">;
  commercialTerms?: string;
  commissionRate?: number;
  targetLoadFactor?: number;
  monthlyTonnageTargetKg?: number;
  reportingCadence?: string;
  controlRules?: ContractControlRules;
  contractRoutes: LiveContractRoute[];
  createdAt: string;
  updatedAt: string;
};

export type ContractControlRules = {
  rateFloorPerKg?: number;
  autoApprovalVariancePct?: number;
  requireAirlineApprovalBelowFloor?: boolean;
  quoteResponseSlaHours?: number;
  monthlyRevenueTarget?: number;
  minimumMonthlyQuotes?: number;
  quoteWinRateTargetPct?: number;
  namedAccounts?: string[];
  productScope?: string[];
  territoryExclusivity?: "exclusive" | "shared" | "non-exclusive";
  monthlyReportDueDay?: number;
  penaltyClause?: string;
};

export type LiveContractRoute = TenderRouteFrequency & {
  status: "available" | "assigned";
  assignedAt?: string;
  assignedBy?: string;
};

export type ContractTermsUpdateInput = Partial<
  Pick<
    LivePartnerContract,
    | "startDate"
    | "endDate"
    | "status"
    | "commercialTerms"
    | "commissionRate"
    | "targetLoadFactor"
    | "monthlyTonnageTargetKg"
    | "reportingCadence"
    | "controlRules"
  >
>;

export type LiveGsaAssignedRoute = LiveContractRoute & {
  contractId: string;
  tenderId: string;
  airline: string;
  airlineEmail: string;
  airlineCompanyId?: string;
  gsaId: string;
  gsaCompanyId?: string;
  gsaName: string;
  contractStartDate: string;
  contractEndDate?: string;
  commercialTerms?: string;
  commissionRate?: number;
};

type TenderWorkflowStore = {
  tenders: LiveTender[];
  applications: LiveTenderApplication[];
  contracts: LivePartnerContract[];
};

export type TenderCreateInput = Omit<LiveTender, "id" | "createdAt" | "updatedAt">;
export type TenderUpdateInput = Partial<Omit<LiveTender, "id" | "airline" | "airlineEmail" | "airlineCompanyId" | "createdAt" | "updatedAt">>;
export type ApplicationCreateInput = Pick<
  LiveTenderApplication,
  | "proposedCommission"
  | "launchTimeline"
  | "namedAccountCoverage"
  | "monthlySalesTarget"
  | "networkPlan"
  | "operationalReadiness"
  | "documents"
>;

export async function listLiveTenders() {
  const store = await readStore();
  return store.tenders.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getLiveTender(id: string) {
  const store = await readStore();
  return store.tenders.find((tender) => tender.id === id) ?? null;
}

export async function createLiveTender(input: TenderCreateInput) {
  const store = await readStore();
  const now = new Date().toISOString();
  const id = createId("tnd");
  const tender: LiveTender = {
    ...input,
    id,
    attachments: await persistWorkflowDocuments(input.attachments, {
      entityType: "tender-document",
      entityId: id,
      airlineCompanyId: input.airlineCompanyId,
      airlineEmail: input.airlineEmail,
      visibility: "tender-public",
    }),
    createdAt: now,
    updatedAt: now,
  };

  store.tenders.unshift(tender);
  await writeStore(store);
  return tender;
}

export async function updateLiveTender(id: string, input: TenderUpdateInput) {
  const store = await readStore();
  const index = store.tenders.findIndex((tender) => tender.id === id);
  if (index < 0) return null;

  const tender: LiveTender = {
    ...store.tenders[index],
    ...input,
    id,
    airline: store.tenders[index].airline,
    airlineEmail: store.tenders[index].airlineEmail,
    createdAt: store.tenders[index].createdAt,
    attachments: input.attachments
      ? await persistWorkflowDocuments(input.attachments, {
          entityType: "tender-document",
          entityId: id,
          airlineCompanyId: store.tenders[index].airlineCompanyId,
          airlineEmail: store.tenders[index].airlineEmail,
          visibility: "tender-public",
        })
      : store.tenders[index].attachments,
    updatedAt: new Date().toISOString(),
  };

  store.tenders[index] = tender;
  await writeStore(store);
  return tender;
}

export async function deleteLiveTender(id: string) {
  const store = await readStore();
  const tender = store.tenders.find((item) => item.id === id);
  if (!tender) return false;

  store.tenders = store.tenders.filter((item) => item.id !== id);
  store.applications = store.applications.filter((application) => application.tenderId !== id);
  store.contracts = store.contracts.filter((contract) => contract.tenderId !== id);
  await writeStore(store);
  return true;
}

export async function listLiveApplications() {
  const store = await readStore();
  return store.applications.sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

export async function getLiveApplication(id: string) {
  const store = await readStore();
  return store.applications.find((application) => application.id === id) ?? null;
}

export async function listLivePartnerContracts() {
  const store = await readStore();
  return store.contracts.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getLivePartnerContract(id: string) {
  const store = await readStore();
  return store.contracts.find((contract) => contract.id === id) ?? null;
}

export async function getContractByGsaAndAirline(gsaCompanyIdOrId: string, airlineCompanyIdOrEmail: string) {
  const store = await readStore();
  return store.contracts.find((contract) => {
    const gsaMatches = contract.gsaCompanyId === gsaCompanyIdOrId || contract.gsaId === gsaCompanyIdOrId;
    const airlineMatches =
      contract.airlineCompanyId === airlineCompanyIdOrEmail ||
      contract.airlineEmail.toLowerCase() === airlineCompanyIdOrEmail.toLowerCase();
    return gsaMatches && airlineMatches;
  }) ?? null;
}

export async function updateContractTerms(id: string, input: ContractTermsUpdateInput) {
  return mutateStore((store) => {
  const index = store.contracts.findIndex((contract) => contract.id === id);
  if (index < 0) return null;

  const existing = store.contracts[index];
  const contract: LivePartnerContract = {
    ...existing,
    ...input,
    id: existing.id,
    tenderId: existing.tenderId,
    sourceApplicationId: existing.sourceApplicationId,
    airline: existing.airline,
    airlineEmail: existing.airlineEmail,
    airlineCompanyId: existing.airlineCompanyId,
    gsaId: existing.gsaId,
    gsaCompanyId: existing.gsaCompanyId,
    gsaName: existing.gsaName,
    createdAt: existing.createdAt,
    contractRoutes: existing.contractRoutes,
    updatedAt: new Date().toISOString(),
  };

  store.contracts[index] = contract;
  return contract;
  });
}

export async function assignRoutesToContract(id: string, routeIds: string[], assignedBy?: string) {
  return mutateStore((store) => {
  const contract = store.contracts.find((item) => item.id === id);
  if (!contract) return null;
  if (contract.status === "closed") throw new Error("Closed contracts cannot receive route assignments");

  const routeIdSet = new Set(routeIds);
  const assignableRouteIds = new Set(contract.contractRoutes.map((route) => route.id));
  const invalidRouteIds = routeIds.filter((routeId) => !assignableRouteIds.has(routeId));
  if (invalidRouteIds.length > 0) {
    throw new Error(`Route is not available on this contract: ${invalidRouteIds.join(", ")}`);
  }

  const now = new Date().toISOString();
  store.contracts = store.contracts.map((item) => {
    if (item.tenderId !== contract.tenderId) return item;

    const shouldAssignToTarget = item.id === id;
    return {
      ...item,
      contractRoutes: item.contractRoutes.map((route) => {
        if (!routeIdSet.has(route.id)) return route;
        if (shouldAssignToTarget) {
          return {
            ...route,
            status: "assigned" as const,
            assignedAt: route.assignedAt ?? now,
            assignedBy,
          };
        }

        return {
          ...route,
          status: "available" as const,
          assignedAt: undefined,
          assignedBy: undefined,
        };
      }),
      updatedAt: now,
    };
  });

  return store.contracts.find((item) => item.id === id) ?? null;
  });
}

export async function unassignRouteFromContract(id: string, routeId: string) {
  return mutateStore((store) => {
  const index = store.contracts.findIndex((contract) => contract.id === id);
  if (index < 0) return null;
  if (store.contracts[index].status === "closed") throw new Error("Closed contracts cannot change route assignments");

  const now = new Date().toISOString();
  store.contracts[index] = {
    ...store.contracts[index],
    contractRoutes: store.contracts[index].contractRoutes.map((route) =>
      route.id === routeId
        ? {
            ...route,
            status: "available",
            assignedAt: undefined,
            assignedBy: undefined,
          }
        : route,
    ),
    updatedAt: now,
  };

  return store.contracts[index];
  });
}

export async function listRoutesForGsa(session: Pick<SessionPayload, "companyId" | "company" | "email">) {
  const store = await readStore();
  return store.contracts
    .filter((contract) => isContractOwnedByGsaSession(session, contract))
    .flatMap((contract) =>
      contract.contractRoutes
        .filter((route) => route.status === "assigned")
        .map((route): LiveGsaAssignedRoute => ({
          ...route,
          contractId: contract.id,
          tenderId: contract.tenderId,
          airline: contract.airline,
          airlineEmail: contract.airlineEmail,
          airlineCompanyId: contract.airlineCompanyId,
          gsaId: contract.gsaId,
          gsaCompanyId: contract.gsaCompanyId,
          gsaName: contract.gsaName,
          contractStartDate: contract.startDate,
          contractEndDate: contract.endDate,
          commercialTerms: contract.commercialTerms,
          commissionRate: contract.commissionRate,
        })),
    );
}

export async function createLiveApplication(
  tenderId: string,
  applicant: Pick<SessionPayload, "company" | "email" | "name" | "companyId"> & {
    contactName?: string;
    headquarters?: string;
    coverage?: string[];
    markets?: string[];
    certifications?: string[];
    cargoFocus?: string;
    networkScore?: number;
    financialScore?: number;
    complianceScore?: number;
    winRate?: number;
  },
  input: ApplicationCreateInput,
) {
  const store = await readStore();
  const tender = store.tenders.find((item) => item.id === tenderId);
  if (!tender || tender.status !== "open") throw new Error("Tender is not open");

  const gsaId = applicant.companyId ?? slugId(applicant.company || applicant.email);

  const now = new Date().toISOString();
  const existingIndex = store.applications.findIndex(
    (application) =>
      application.tenderId === tenderId &&
      (application.gsaId === gsaId || (applicant.companyId && application.gsaCompanyId === applicant.companyId)),
  );
  const existingApplication = existingIndex >= 0 ? store.applications[existingIndex] : null;
  if (existingApplication && !canEditApplication(existingApplication)) {
    throw new Error("Application edit window has expired");
  }
  const applicationId = existingApplication?.id ?? createId("app");
  const application: LiveTenderApplication = {
    id: applicationId,
    tenderId,
    gsaId,
    gsaCompanyId: applicant.companyId,
    gsaName: applicant.company,
    contactName: applicant.contactName ?? applicant.name,
    email: applicant.email,
    headquarters: applicant.headquarters ?? "Not provided",
    coverage: applicant.coverage ?? [],
    markets: applicant.markets ?? [],
    certifications: applicant.certifications ?? [],
    cargoFocus: applicant.cargoFocus ?? "General cargo",
    networkScore: applicant.networkScore ?? 50,
    financialScore: applicant.financialScore ?? 50,
    complianceScore: applicant.complianceScore ?? 50,
    winRate: applicant.winRate ?? 0,
    ...input,
    documents: await persistWorkflowDocuments(input.documents, {
      entityType: "application-document",
      entityId: applicationId,
      airlineCompanyId: tender.airlineCompanyId,
      airlineEmail: tender.airlineEmail,
      gsaCompanyId: applicant.companyId,
      gsaEmail: applicant.email,
      visibility: "application",
    }),
    status: existingApplication?.status ?? "pending",
    submittedAt: existingApplication?.submittedAt ?? now,
    updatedAt: now,
  };

  if (existingIndex >= 0) store.applications[existingIndex] = application;
  else store.applications.unshift(application);

  await writeStore(store);
  return application;
}

async function persistWorkflowDocuments(
  documents: TenderWorkflowDocument[] = [],
  options: {
    entityType: StoredAttachment["entityType"];
    entityId: string;
    airlineCompanyId?: string;
    airlineEmail?: string;
    gsaCompanyId?: string;
    gsaEmail?: string;
    visibility?: StoredAttachment["visibility"];
  },
) {
  return Promise.all(
    documents.map(async (document) => {
      if (!document.dataUrl || document.documentUrl) return document;
      const stored = await saveWorkflowAttachment({
        entityId: options.entityId,
        entityType: options.entityType,
        airlineCompanyId: options.airlineCompanyId,
        airlineEmail: options.airlineEmail,
        gsaCompanyId: options.gsaCompanyId,
        gsaEmail: options.gsaEmail,
        visibility: options.visibility,
        fileName: document.name,
        mimeType: document.mimeType,
        size: document.size,
        dataUrl: document.dataUrl,
      });
      return {
        ...document,
        dataUrl: undefined,
        documentUrl: stored?.attachmentUrl,
        storagePath: stored?.attachmentStoragePath,
      };
    }),
  );
}

function slugId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || createId("gsa");
}

export function canEditApplication(application: Pick<LiveTenderApplication, "submittedAt" | "status">) {
  if (application.status !== "pending") return false;
  return Date.now() - new Date(application.submittedAt).getTime() < 24 * 60 * 60 * 1000;
}

export async function updateLiveApplicationStatus(
  applicationId: string,
  status: Extract<Status, "pending" | "shortlisted" | "accepted" | "rejected">,
) {
  return mutateStore((store) => {
  const index = store.applications.findIndex((application) => application.id === applicationId);
  if (index < 0) return null;

  const tenderIndex = store.tenders.findIndex((tender) => tender.id === store.applications[index].tenderId);
  const tender = tenderIndex >= 0 ? store.tenders[tenderIndex] : null;
  if (status === "accepted" && tender) {
    const awardSlots = getTenderAwardSlots(tender);
    const acceptedCount = store.applications.filter(
      (application) =>
        application.tenderId === tender.id &&
        application.status === "accepted" &&
        application.id !== applicationId,
    ).length;

    if (acceptedCount >= awardSlots) {
      throw new Error("Tender award capacity is already filled");
    }
  }

  store.applications[index] = {
    ...store.applications[index],
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === "accepted" && tender && tenderIndex >= 0) {
    store.contracts = upsertContractFromAward(store.contracts, tender, store.applications[index]);

    const awardSlots = getTenderAwardSlots(tender);
    const acceptedForTender = store.applications.filter(
      (application) => application.tenderId === tender.id && application.status === "accepted",
    );

    if (acceptedForTender.length >= awardSlots) {
      const now = new Date().toISOString();
      store.tenders[tenderIndex] = {
        ...tender,
        status: "closed",
        updatedAt: now,
      };
      store.applications = store.applications.map((application) => {
        if (application.tenderId !== tender.id) return application;
        if (application.status === "accepted") return application;
        return {
          ...application,
          status: "rejected",
          updatedAt: now,
        };
      });
    }
  } else if (status !== "accepted") {
    store.contracts = store.contracts.filter((contract) => contract.sourceApplicationId !== applicationId);
  }

  return store.applications[index];
  });
}

function upsertContractFromAward(
  contracts: LivePartnerContract[],
  tender: LiveTender,
  application: LiveTenderApplication,
) {
  const now = new Date().toISOString();
  const existingIndex = contracts.findIndex((contract) => contract.sourceApplicationId === application.id);
  const existingContract = existingIndex >= 0 ? contracts[existingIndex] : null;
  const contract: LivePartnerContract = {
    ...(existingContract ?? {}),
    id: existingContract?.id ?? `ctr-${application.id}`,
    tenderId: tender.id,
    sourceApplicationId: application.id,
    airline: tender.airline,
    airlineEmail: tender.airlineEmail,
    airlineCompanyId: tender.airlineCompanyId,
    gsaId: application.gsaId,
    gsaCompanyId: application.gsaCompanyId,
    gsaName: application.gsaName,
    contactName: application.contactName,
    email: application.email,
    headquarters: application.headquarters,
    coverage: application.coverage,
    markets: application.markets,
    certifications: application.certifications,
    cargoFocus: application.cargoFocus,
    networkScore: application.networkScore,
    financialScore: application.financialScore,
    complianceScore: application.complianceScore,
    winRate: application.winRate,
    market: tender.countryScope || tender.regions.join(", ") || tender.lanes || "Market scope",
    startDate: existingContract?.startDate ?? tender.expectedStart ?? new Date().toISOString().slice(0, 10),
    endDate: existingContract?.endDate,
    status: existingContract?.status ?? "pending",
    commercialTerms: existingContract?.commercialTerms ?? application.proposedCommission,
    commissionRate: existingContract?.commissionRate ?? parseCommissionRate(application.proposedCommission),
    targetLoadFactor: existingContract?.targetLoadFactor,
    monthlyTonnageTargetKg: existingContract?.monthlyTonnageTargetKg,
    reportingCadence: existingContract?.reportingCadence ?? "weekly",
    controlRules: existingContract?.controlRules ?? buildDefaultControlRules(tender, application),
    contractRoutes: buildContractRoutes(tender, existingContract?.contractRoutes),
    createdAt: existingContract?.createdAt ?? now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    return contracts.map((item, index) => (index === existingIndex ? contract : item));
  }

  return [contract, ...contracts];
}

function buildContractRoutes(tender: LiveTender, existingRoutes: LiveContractRoute[] = []) {
  const existingById = new Map(existingRoutes.map((route) => [route.id, route]));
  return tender.routes.map((route) => {
    const existing = existingById.get(route.id);
    return {
      ...route,
      status: existing?.status ?? "available",
      assignedAt: existing?.assignedAt,
      assignedBy: existing?.assignedBy,
    } satisfies LiveContractRoute;
  });
}

function buildDefaultControlRules(tender: LiveTender, application: LiveTenderApplication): ContractControlRules {
  const commissionRate = Number.parseFloat(application.proposedCommission.match(/\d+(\.\d+)?/)?.[0] ?? "");
  const baseFloor = tender.commercialModel === "capacity-risk" ? 2.2 : tender.commercialModel === "hybrid" ? 2 : 1.8;
  return {
    rateFloorPerKg: Number.isFinite(commissionRate) ? Number((baseFloor + commissionRate / 100).toFixed(2)) : baseFloor,
    autoApprovalVariancePct: 0,
    requireAirlineApprovalBelowFloor: true,
    quoteResponseSlaHours: 4,
    monthlyRevenueTarget: Math.max(50000, Math.round((tender.annualTonnage || 0) * baseFloor / 12)),
    minimumMonthlyQuotes: 12,
    quoteWinRateTargetPct: 35,
    namedAccounts: [],
    productScope: tender.productMix.split(",").map((item) => item.trim()).filter(Boolean),
    territoryExclusivity: tender.awardMode === "single" ? "exclusive" : "shared",
    monthlyReportDueDay: 5,
    penaltyClause: "Below-floor quotes require airline approval before customer confirmation.",
  };
}

function normalizeWorkflowStore(store: TenderWorkflowStore): TenderWorkflowStore {
  const tenderById = new Map(store.tenders.map((tender) => [tender.id, tender]));
  const applicationById = new Map(store.applications.map((application) => [application.id, application]));
  let contracts: LivePartnerContract[] = store.contracts.map((contract) => {
    const tender = tenderById.get(contract.tenderId);
    const application = applicationById.get(contract.sourceApplicationId);
    return {
      ...contract,
      contactName: contract.contactName ?? application?.contactName,
      email: contract.email ?? application?.email,
      headquarters: contract.headquarters ?? application?.headquarters,
      coverage: contract.coverage ?? application?.coverage ?? [],
      markets: contract.markets ?? application?.markets ?? [],
      certifications: contract.certifications ?? application?.certifications ?? [],
      cargoFocus: contract.cargoFocus ?? application?.cargoFocus,
      networkScore: contract.networkScore ?? application?.networkScore,
      financialScore: contract.financialScore ?? application?.financialScore,
      complianceScore: contract.complianceScore ?? application?.complianceScore,
      winRate: contract.winRate ?? application?.winRate,
      commissionRate: contract.commissionRate ?? parseCommissionRate(contract.commercialTerms ?? application?.proposedCommission),
      reportingCadence: contract.reportingCadence ?? "weekly",
      controlRules: contract.controlRules ?? (tender && application ? buildDefaultControlRules(tender, application) : undefined),
      contractRoutes: tender ? buildContractRoutes(tender, contract.contractRoutes ?? []) : contract.contractRoutes ?? [],
    };
  });
  const contractApplicationIds = new Set(contracts.map((contract) => contract.sourceApplicationId));

  for (const application of store.applications) {
    if (application.status !== "accepted" || contractApplicationIds.has(application.id)) continue;
    const tender = tenderById.get(application.tenderId);
    if (!tender) continue;
    contracts = upsertContractFromAward(contracts, tender, application);
    contractApplicationIds.add(application.id);
  }

  return {
    tenders: store.tenders,
    applications: store.applications,
    contracts,
  };
}

function parseCommissionRate(value?: string) {
  if (!value) return undefined;
  const rate = Number.parseFloat(value.match(/\d+(\.\d+)?/)?.[0] ?? "");
  return Number.isFinite(rate) ? rate : undefined;
}

function isContractOwnedByGsaSession(
  session: Pick<SessionPayload, "companyId" | "company" | "email">,
  contract: Pick<LivePartnerContract, "gsaCompanyId" | "gsaId" | "gsaName" | "email">,
) {
  if (contract.gsaCompanyId && session.companyId) return contract.gsaCompanyId === session.companyId;
  return contract.gsaName === session.company || contract.email?.toLowerCase() === session.email.toLowerCase();
}

export function getTenderAwardSlots(tender: Pick<LiveTender, "awardMode" | "maxAwards">) {
  if (tender.awardMode === "multi") return Math.max(2, tender.maxAwards ?? 2);
  return Math.max(1, tender.maxAwards ?? 1);
}

export function getTenderCommercialModel(tender: Pick<LiveTender, "commercialModel">) {
  return tender.commercialModel ?? "commission";
}

async function readStore(): Promise<TenderWorkflowStore> {
  const dbStore = await withPostgres(async (client) => {
    const [tendersResult, applicationsResult, contractsResult] = await Promise.all([
      client.query("select data from live_tenders order by created_at desc"),
      client.query("select data from live_applications order by submitted_at desc"),
      client.query("select data from live_partner_contracts order by created_at desc"),
    ]);

    return normalizeWorkflowStore({
      tenders: tendersResult.rows.map((row) => rowData<LiveTender>(row)),
      applications: applicationsResult.rows.map((row) => rowData<LiveTenderApplication>(row)),
      contracts: contractsResult.rows.map((row) => rowData<LivePartnerContract>(row)),
    });
  });
  if (dbStore) {
    if (dbStore.tenders.length > 0 || dbStore.applications.length > 0 || dbStore.contracts.length > 0) return dbStore;

    const fileStore = await readFileStore();
    if (fileStore.tenders.length > 0 || fileStore.applications.length > 0 || fileStore.contracts.length > 0) {
      await writeStore(fileStore);
      return fileStore;
    }

    return dbStore;
  }

  assertFileStoreFallbackAllowed("Tender workflow store");
  return readFileStore();
}

async function readFileStore(): Promise<TenderWorkflowStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TenderWorkflowStore>;
    return normalizeWorkflowStore({
      tenders: parsed.tenders ?? [],
      applications: parsed.applications ?? [],
      contracts: parsed.contracts ?? [],
    });
  } catch {
    return { tenders: [], applications: [], contracts: [] };
  }
}

async function writeStore(store: TenderWorkflowStore) {
  const saved = await withPostgres(async (client) => {
    const connection = await client.connect();
    try {
      await connection.query("begin");
      await connection.query("delete from live_tenders");
      await connection.query("delete from live_applications");
      await connection.query("delete from live_partner_contracts");

      for (const tender of store.tenders) {
        await connection.query(
          `
            insert into live_tenders (id, status, created_at, updated_at, data)
            values ($1, $2, $3, $4, $5::jsonb)
          `,
          [tender.id, tender.status, tender.createdAt, tender.updatedAt, JSON.stringify(tender)],
        );
      }

      for (const application of store.applications) {
        await connection.query(
          `
            insert into live_applications (id, tender_id, gsa_id, gsa_name, status, submitted_at, updated_at, data)
            values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          `,
          [
            application.id,
            application.tenderId,
            application.gsaId,
            application.gsaName,
            application.status,
            application.submittedAt,
            application.updatedAt,
            JSON.stringify(application),
          ],
        );
      }

      for (const contract of store.contracts) {
        await connection.query(
          `
            insert into live_partner_contracts (id, tender_id, application_id, airline_email, gsa_id, status, created_at, updated_at, data)
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
          `,
          [
            contract.id,
            contract.tenderId,
            contract.sourceApplicationId,
            contract.airlineEmail,
            contract.gsaId,
            contract.status,
            contract.createdAt,
            contract.updatedAt,
            JSON.stringify(contract),
          ],
        );
      }

      await connection.query("commit");
      return true;
    } catch (err) {
      await connection.query("rollback");
      throw err;
    } finally {
      connection.release();
    }
  });
  if (saved) return;

  assertFileStoreFallbackAllowed("Tender workflow store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

async function mutateStore<T>(operation: (store: TenderWorkflowStore) => T): Promise<T> {
  const dbResult = await withPostgresTransaction(async (client) => {
    const store = await readStoreFromPostgresClient(client);
    const result = operation(store);
    await writeStoreToPostgresClient(client, store);
    return { result };
  });
  if (dbResult) return dbResult.result;

  assertFileStoreFallbackAllowed("Tender workflow store");
  const store = await readFileStore();
  const result = operation(store);
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  return result;
}

type PgQueryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
};

async function readStoreFromPostgresClient(client: PgQueryable): Promise<TenderWorkflowStore> {
  const [tendersResult, applicationsResult, contractsResult] = await Promise.all([
    client.query("select data from live_tenders order by created_at desc for update"),
    client.query("select data from live_applications order by submitted_at desc for update"),
    client.query("select data from live_partner_contracts order by created_at desc for update"),
  ]);

  return normalizeWorkflowStore({
    tenders: tendersResult.rows.map((row) => rowData<LiveTender>(row)),
    applications: applicationsResult.rows.map((row) => rowData<LiveTenderApplication>(row)),
    contracts: contractsResult.rows.map((row) => rowData<LivePartnerContract>(row)),
  });
}

async function writeStoreToPostgresClient(client: PgQueryable, store: TenderWorkflowStore) {
  await client.query("delete from live_tenders");
  await client.query("delete from live_applications");
  await client.query("delete from live_partner_contracts");

  for (const tender of store.tenders) {
    await client.query(
      `
        insert into live_tenders (id, status, created_at, updated_at, data)
        values ($1, $2, $3, $4, $5::jsonb)
      `,
      [tender.id, tender.status, tender.createdAt, tender.updatedAt, JSON.stringify(tender)],
    );
  }

  for (const application of store.applications) {
    await client.query(
      `
        insert into live_applications (id, tender_id, gsa_id, gsa_name, status, submitted_at, updated_at, data)
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      `,
      [
        application.id,
        application.tenderId,
        application.gsaId,
        application.gsaName,
        application.status,
        application.submittedAt,
        application.updatedAt,
        JSON.stringify(application),
      ],
    );
  }

  for (const contract of store.contracts) {
    await client.query(
      `
        insert into live_partner_contracts (id, tender_id, application_id, airline_email, gsa_id, status, created_at, updated_at, data)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        contract.id,
        contract.tenderId,
        contract.sourceApplicationId,
        contract.airlineEmail,
        contract.gsaId,
        contract.status,
        contract.createdAt,
        contract.updatedAt,
        JSON.stringify(contract),
      ],
    );
  }
}
