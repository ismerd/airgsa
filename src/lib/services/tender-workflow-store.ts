import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { rowData, withPostgres } from "@/lib/services/postgres-store";
import type { Status } from "@/lib/types";

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

type TenderWorkflowStore = {
  tenders: LiveTender[];
  applications: LiveTenderApplication[];
};

export type TenderCreateInput = Omit<LiveTender, "id" | "createdAt" | "updatedAt">;
export type TenderUpdateInput = Partial<Omit<LiveTender, "id" | "airline" | "airlineEmail" | "createdAt" | "updatedAt">>;
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

export async function createLiveApplication(tenderId: string, gsaCompany: string, input: ApplicationCreateInput) {
  const store = await readStore();
  const tender = store.tenders.find((item) => item.id === tenderId);
  if (!tender || tender.status !== "open") throw new Error("Tender is not open");

  const partner = realGsaPartners.find((item) => item.name === gsaCompany);
  if (!partner) throw new Error("GSA profile not found");

  const now = new Date().toISOString();
  const existingIndex = store.applications.findIndex(
    (application) => application.tenderId === tenderId && application.gsaId === partner.id,
  );
  const existingApplication = existingIndex >= 0 ? store.applications[existingIndex] : null;
  if (existingApplication && !canEditApplication(existingApplication)) {
    throw new Error("Application edit window has expired");
  }
  const application: LiveTenderApplication = {
    id: existingApplication?.id ?? `app-${Date.now().toString(36)}`,
    tenderId,
    gsaId: partner.id,
    gsaName: partner.name,
    contactName: partner.contactName,
    email: partner.email,
    headquarters: partner.headquarters,
    coverage: partner.coverage,
    markets: partner.markets,
    certifications: partner.certifications,
    cargoFocus: partner.cargoFocus,
    networkScore: partner.networkScore,
    financialScore: partner.financialScore,
    complianceScore: partner.complianceScore,
    winRate: partner.winRate,
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
  }

  await writeStore(store);
  return store.applications[index];
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
    const [tendersResult, applicationsResult] = await Promise.all([
      client.query("select data from live_tenders order by created_at desc"),
      client.query("select data from live_applications order by submitted_at desc"),
    ]);

    return {
      tenders: tendersResult.rows.map((row) => rowData<LiveTender>(row)),
      applications: applicationsResult.rows.map((row) => rowData<LiveTenderApplication>(row)),
    };
  });
  if (dbStore) {
    if (dbStore.tenders.length > 0 || dbStore.applications.length > 0) return dbStore;

    const fileStore = await readFileStore();
    if (fileStore.tenders.length > 0 || fileStore.applications.length > 0) {
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
    };
  } catch {
    return { tenders: [], applications: [] };
  }
}

async function writeStore(store: TenderWorkflowStore) {
  const saved = await withPostgres(async (client) => {
    const connection = await client.connect();
    try {
      await connection.query("begin");
      await connection.query("delete from live_tenders");
      await connection.query("delete from live_applications");

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
