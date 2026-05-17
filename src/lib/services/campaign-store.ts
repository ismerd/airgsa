import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";
import { listLivePartnerContracts } from "@/lib/services/tender-workflow-store";
import type { Campaign, CampaignChannel, CampaignStatus, CampaignType } from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), "data", "campaigns.json");
const STORE_KEY = "campaign_store";

type CampaignStore = {
  campaigns: Campaign[];
};

export type CampaignInput = {
  title: string;
  type: CampaignType;
  status?: CampaignStatus;
  channels?: CampaignChannel[];
  audience?: string;
  targetCompanyIds?: string[];
  body: string;
  scheduledFor?: string;
  bannerImageUrl?: string;
};

export type CampaignUpdateInput = Partial<CampaignInput>;

const CAMPAIGN_TYPES = new Set<CampaignType>(["route_announcement", "capacity_highlight", "news_update", "promotion"]);
const CAMPAIGN_STATUSES = new Set<CampaignStatus>(["draft", "published", "scheduled", "archived"]);
const CAMPAIGN_CHANNELS = new Set<CampaignChannel>(["platform", "linkedin", "instagram"]);

export async function listCampaigns(session: SessionPayload) {
  const store = await readStore();
  return store.campaigns
    .filter((campaign) => canViewCampaign(session, campaign))
    .sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt));
}

export async function createCampaign(session: SessionPayload, input: CampaignInput) {
  if (session.role !== "airline" && session.role !== "gsa" && session.role !== "admin") throw new Error("Authenticated company login required");
  validateCampaignInput(input);
  const now = new Date().toISOString();
  const status = input.status ?? "draft";
  const targeting = await resolveCampaignTargeting(session, input);
  const campaign: Campaign = {
    id: `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    type: input.type,
    status,
    author: session.company,
    authorRole: session.role === "admin" ? "airline" : session.role,
    authorCompanyId: session.companyId,
    channels: normalizeChannels(input.channels),
    audience: input.audience?.trim() || targeting.audience,
    targetCompanyIds: targeting.targetCompanyIds,
    body: input.body.trim(),
    bannerImageUrl: input.bannerImageUrl?.trim() || undefined,
    scheduledFor: status === "scheduled" ? input.scheduledFor?.trim() : undefined,
    publishedAt: status === "published" ? formatCampaignDate(now) : undefined,
    createdAt: now,
    updatedAt: now,
    createdBy: session.email,
    reach: 0,
    engagement: 0,
  };

  const store = await readStore();
  store.campaigns.unshift(campaign);
  await writeStore(store);
  return campaign;
}

export async function updateCampaign(session: SessionPayload, id: string, input: CampaignUpdateInput) {
  const store = await readStore();
  const index = store.campaigns.findIndex((campaign) => campaign.id === id);
  if (index < 0) return null;
  const current = store.campaigns[index];
  if (!canEditCampaign(session, current)) throw new Error("Campaign not found");

  const nextInput: CampaignInput = {
    title: input.title ?? current.title,
    type: input.type ?? current.type,
    status: input.status ?? current.status,
    channels: input.channels ?? current.channels,
    audience: input.audience ?? current.audience,
    targetCompanyIds: input.targetCompanyIds ?? current.targetCompanyIds,
    body: input.body ?? current.body,
    scheduledFor: input.scheduledFor ?? current.scheduledFor,
    bannerImageUrl: input.bannerImageUrl ?? current.bannerImageUrl,
  };
  validateCampaignInput(nextInput);
  const now = new Date().toISOString();
  const status = nextInput.status ?? current.status;
  const campaign: Campaign = {
    ...current,
    title: nextInput.title.trim(),
    type: nextInput.type,
    status,
    channels: normalizeChannels(nextInput.channels),
    audience: nextInput.audience?.trim() || current.audience,
    targetCompanyIds: await resolveCampaignTargeting(session, nextInput).then((targeting) => targeting.targetCompanyIds),
    body: nextInput.body.trim(),
    bannerImageUrl: nextInput.bannerImageUrl?.trim() || undefined,
    scheduledFor: status === "scheduled" ? nextInput.scheduledFor?.trim() : undefined,
    publishedAt: status === "published" && current.status !== "published" ? formatCampaignDate(now) : current.publishedAt,
    updatedAt: now,
  };
  store.campaigns[index] = campaign;
  await writeStore(store);
  return campaign;
}

function canViewCampaign(session: SessionPayload, campaign: Campaign) {
  if (session.role === "admin") return true;
  if (canEditCampaign(session, campaign)) return true;
  if (session.role === "gsa" && campaign.authorRole === "airline" && campaign.status === "published") {
    return !campaign.targetCompanyIds?.length || Boolean(session.companyId && campaign.targetCompanyIds.includes(session.companyId));
  }
  return false;
}

function canEditCampaign(session: SessionPayload, campaign: Campaign) {
  if (session.role === "admin") return true;
  if (campaign.authorRole !== session.role) return false;
  if (campaign.authorCompanyId && session.companyId) return campaign.authorCompanyId === session.companyId;
  return campaign.createdBy?.toLowerCase() === session.email.toLowerCase();
}

function validateCampaignInput(input: CampaignInput) {
  if (!input.title?.trim()) throw new Error("Campaign title is required");
  if (!input.body?.trim()) throw new Error("Campaign body is required");
  if (!CAMPAIGN_TYPES.has(input.type)) throw new Error("Campaign type is invalid");
  if (input.status && !CAMPAIGN_STATUSES.has(input.status)) throw new Error("Campaign status is invalid");
  for (const channel of input.channels ?? ["platform"]) {
    if (!CAMPAIGN_CHANNELS.has(channel)) throw new Error("Campaign channel is invalid");
  }
  if (input.status === "scheduled" && !input.scheduledFor?.trim()) throw new Error("Scheduled campaigns need a publish date");
}

function normalizeChannels(channels: CampaignChannel[] | undefined): CampaignChannel[] {
  const normalized = Array.from(new Set<CampaignChannel>(channels?.length ? channels : ["platform"]));
  return normalized.filter((channel) => CAMPAIGN_CHANNELS.has(channel));
}

async function resolveCampaignTargeting(session: SessionPayload, input: Pick<CampaignInput, "targetCompanyIds" | "audience">) {
  if (session.role !== "airline") {
    return { audience: input.audience?.trim() || "Local customer accounts", targetCompanyIds: input.targetCompanyIds };
  }

  const contracts = (await listLivePartnerContracts()).filter((contract) => canViewContract(session, contract));
  const eligibleGsaIds = new Set(contracts.map((contract) => contract.gsaCompanyId).filter(Boolean) as string[]);
  const requested = input.targetCompanyIds?.filter((id) => eligibleGsaIds.has(id)) ?? [];
  const targetCompanyIds = requested.length > 0 ? requested : Array.from(eligibleGsaIds);
  const targetMarkets = Array.from(new Set(
    contracts
      .filter((contract) => contract.gsaCompanyId && targetCompanyIds.includes(contract.gsaCompanyId))
      .map((contract) => contract.market)
      .filter(Boolean),
  ));

  return {
    audience: input.audience?.trim() || (targetMarkets.length > 0 ? `Assigned GSA partners: ${targetMarkets.join(", ")}` : "Assigned GSA partners"),
    targetCompanyIds,
  };
}

function formatCampaignDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

async function readStore(): Promise<CampaignStore> {
  const dbStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    return result.rows[0] ? normalizeStore(rowData<Partial<CampaignStore>>(result.rows[0])) : { campaigns: [] };
  });
  if (dbStore) return dbStore;

  assertFileStoreFallbackAllowed("Campaign store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<CampaignStore>);
  } catch {
    return { campaigns: [] };
  }
}

async function writeStore(store: CampaignStore) {
  const saved = await withPostgres(async (client) => {
    await client.query(
      `insert into app_settings (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [STORE_KEY, JSON.stringify(store)],
    );
    return true;
  });
  if (saved) return;

  assertFileStoreFallbackAllowed("Campaign store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function normalizeStore(store: Partial<CampaignStore>): CampaignStore {
  return { campaigns: store.campaigns ?? [] };
}
