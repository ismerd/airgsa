import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { rowData, withPostgres } from "@/lib/services/postgres-store";
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
  market: string;
  startDate: string;
  endDate?: string;
  status: Extract<Status, "pending" | "active" | "closed">;
  commercialTerms?: string;
  createdAt: string;
  updatedAt: string;
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
  const tender: LiveTender = {
    ...input,
    id: `tnd-${Date.now().toString(36)}`,
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

export async function createLiveApplication(
  tenderId: string,
  applicant: Pick<SessionPayload, "company" | "email" | "name" | "companyId">,
  input: ApplicationCreateInput,
) {
  const store = await readStore();
  const tender = store.tenders.find((item) => item.id === tenderId);
  if (!tender || tender.status !== "open") throw new Error("Tender is not open");

  const partner = realGsaPartners.find((item) => item.name === applicant.company || item.email === applicant.email);
  const gsaId = applicant.companyId ?? partner?.id ?? slugId(applicant.company || applicant.email);

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
  const application: LiveTenderApplication = {
    id: existingApplication?.id ?? `app-${Date.now().toString(36)}`,
    tenderId,
    gsaId,
    gsaCompanyId: applicant.companyId,
    gsaName: partner?.name ?? applicant.company,
    contactName: partner?.contactName ?? applicant.name,
    email: partner?.email ?? applicant.email,
    headquarters: partner?.headquarters ?? "Not provided",
    coverage: partner?.coverage ?? [],
    markets: partner?.markets ?? [],
    certifications: partner?.certifications ?? [],
    cargoFocus: partner?.cargoFocus ?? "General cargo",
    networkScore: partner?.networkScore ?? 50,
    financialScore: partner?.financialScore ?? 50,
    complianceScore: partner?.complianceScore ?? 50,
    winRate: partner?.winRate ?? 0,
    ...input,
    status: existingApplication?.status ?? "pending",
    submittedAt: existingApplication?.submittedAt ?? now,
    updatedAt: now,
  };

  if (existingIndex >= 0) store.applications[existingIndex] = application;
  else store.applications.unshift(application);

  await writeStore(store);
  return application;
}

function slugId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `gsa-${Date.now().toString(36)}`;
}

export function canEditApplication(application: Pick<LiveTenderApplication, "submittedAt" | "status">) {
  if (application.status !== "pending") return false;
  return Date.now() - new Date(application.submittedAt).getTime() < 24 * 60 * 60 * 1000;
}

export async function updateLiveApplicationStatus(
  applicationId: string,
  status: Extract<Status, "pending" | "shortlisted" | "accepted" | "rejected">,
) {
  const store = await readStore();
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

  await writeStore(store);
  return store.applications[index];
}

function upsertContractFromAward(
  contracts: LivePartnerContract[],
  tender: LiveTender,
  application: LiveTenderApplication,
) {
  const now = new Date().toISOString();
  const existingIndex = contracts.findIndex((contract) => contract.sourceApplicationId === application.id);
  const contract: LivePartnerContract = {
    ...(existingIndex >= 0 ? contracts[existingIndex] : {}),
    id: existingIndex >= 0 ? contracts[existingIndex].id : `ctr-${Date.now().toString(36)}-${application.gsaId}`,
    tenderId: tender.id,
    sourceApplicationId: application.id,
    airline: tender.airline,
    airlineEmail: tender.airlineEmail,
    airlineCompanyId: tender.airlineCompanyId,
    gsaId: application.gsaId,
    gsaCompanyId: application.gsaCompanyId,
    gsaName: application.gsaName,
    market: tender.countryScope || tender.regions.join(", ") || tender.lanes || "Market scope",
    startDate: tender.expectedStart || new Date().toISOString().slice(0, 10),
    status: "pending",
    commercialTerms: application.proposedCommission,
    createdAt: existingIndex >= 0 ? contracts[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    return contracts.map((item, index) => (index === existingIndex ? contract : item));
  }

  return [contract, ...contracts];
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

    return {
      tenders: tendersResult.rows.map((row) => rowData<LiveTender>(row)),
      applications: applicationsResult.rows.map((row) => rowData<LiveTenderApplication>(row)),
      contracts: contractsResult.rows.map((row) => rowData<LivePartnerContract>(row)),
    };
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

  return readFileStore();
}

async function readFileStore(): Promise<TenderWorkflowStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TenderWorkflowStore>;
    return {
      tenders: parsed.tenders ?? [],
      applications: parsed.applications ?? [],
      contracts: parsed.contracts ?? [],
    };
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

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}
