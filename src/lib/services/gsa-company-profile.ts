import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";

const PROFILE_PATH = path.join(process.cwd(), "data", "gsa-profile-assets.json");

export type GsaCompanyProfile = {
  logoPath?: string;
  bannerPath?: string;
  updatedAt?: string;
};

type GsaProfileSession = Pick<SessionPayload, "companyId" | "email" | "company"> | null | undefined;

export async function getGsaCompanyProfile(session?: GsaProfileSession): Promise<GsaCompanyProfile> {
  const tenantKey = getGsaProfileTenant(session);
  const dbResult = await withPostgres(async (client) => {
    const result = await client.query("select logo_path, updated_at, data from workflow_gsa_profiles where tenant_key = $1", [tenantKey]);
    if (!result.rows[0]) return { profile: null };
    const parsed = rowData<Partial<GsaCompanyProfile>>(result.rows[0]);
    return {
      profile: normalizeProfile({
        ...parsed,
        logoPath: result.rows[0].logo_path ?? parsed.logoPath,
        updatedAt: result.rows[0].updated_at?.toISOString?.() ?? parsed.updatedAt,
      }),
    };
  });
  if (dbResult?.profile) return dbResult.profile;
  if (dbResult) return {};

  return readFileProfile();
}

export async function saveGsaCompanyProfile(session: GsaProfileSession, profile: GsaCompanyProfile): Promise<GsaCompanyProfile> {
  const tenantKey = getGsaProfileTenant(session);
  const current = await getGsaCompanyProfile(session);
  const normalized = normalizeProfile({ ...current, ...profile, updatedAt: new Date().toISOString() });
  const saved = await withPostgres(async (client) => {
    await client.query(
      `
        insert into workflow_gsa_profiles
          (tenant_key, gsa_company_id, gsa_email, logo_path, updated_at, data)
        values ($1, $2, $3, $4, $5, $6::jsonb)
        on conflict (tenant_key) do update set
          gsa_company_id = excluded.gsa_company_id,
          gsa_email = excluded.gsa_email,
          logo_path = excluded.logo_path,
          updated_at = excluded.updated_at,
          data = excluded.data
      `,
      [
        tenantKey,
        session?.companyId ?? null,
        session?.email?.toLowerCase() ?? null,
        normalized.logoPath ?? null,
        normalized.updatedAt,
        JSON.stringify(normalized),
      ],
    );
    return normalized;
  });
  if (saved) return saved;

  assertFileStoreFallbackAllowed("GSA profile store");
  await mkdir(path.dirname(PROFILE_PATH), { recursive: true });
  await writeFile(PROFILE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}

function getGsaProfileTenant(session?: GsaProfileSession) {
  return (
    session?.companyId?.trim().toLowerCase() ||
    session?.email?.trim().toLowerCase() ||
    session?.company?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "default"
  );
}

async function readFileProfile(): Promise<GsaCompanyProfile> {
  assertFileStoreFallbackAllowed("GSA profile store");
  try {
    const raw = await readFile(PROFILE_PATH, "utf-8");
    return normalizeProfile(JSON.parse(raw) as Partial<GsaCompanyProfile>);
  } catch {
    return {};
  }
}

function normalizeProfile(profile: Partial<GsaCompanyProfile>): GsaCompanyProfile {
  return {
    logoPath: cleanText(profile.logoPath),
    bannerPath: cleanText(profile.bannerPath),
    updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : undefined,
  };
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : undefined;
}
