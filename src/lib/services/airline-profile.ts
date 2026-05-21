import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";

const PROFILE_PATH = path.join(process.cwd(), "data", "airline-profile.json");

export type AirlineProfile = {
  logoPath?: string;
  bannerPath?: string;
  iataCode?: string;
  icaoCode?: string;
  primaryHub?: string;
  secondaryHub?: string;
  headquarters?: string;
  alliance?: string;
  parentGroup?: string;
  keyLanes?: string;
  cargoFocus?: string;
  compliance?: string;
  updatedAt?: string;
};

type AirlineProfileSession = Pick<SessionPayload, "companyId" | "email" | "company"> | null | undefined;

export async function getAirlineProfile(session?: AirlineProfileSession): Promise<AirlineProfile> {
  const tenantKey = getAirlineProfileTenant(session);
  const dbResult = await withPostgres(async (client) => {
    const result = await client.query("select logo_path, updated_at, data from workflow_airline_profiles where tenant_key = $1", [tenantKey]);
    if (!result.rows[0]) return { profile: null };
    const parsed = rowData<Partial<AirlineProfile>>(result.rows[0]);
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

export async function saveAirlineProfile(session: AirlineProfileSession, profile: AirlineProfile): Promise<AirlineProfile> {
  const tenantKey = getAirlineProfileTenant(session);
  const current = await getAirlineProfile(session);
  const normalized = normalizeProfile({ ...current, ...profile, updatedAt: new Date().toISOString() });
  const saved = await withPostgres(async (client) => {
    await client.query(
      `
        insert into workflow_airline_profiles
          (tenant_key, airline_company_id, airline_email, logo_path, updated_at, data)
        values ($1, $2, $3, $4, $5, $6::jsonb)
        on conflict (tenant_key) do update set
          airline_company_id = excluded.airline_company_id,
          airline_email = excluded.airline_email,
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

  assertFileStoreFallbackAllowed("Airline profile store");
  await mkdir(path.dirname(PROFILE_PATH), { recursive: true });
  await writeFile(PROFILE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}

function getAirlineProfileTenant(session?: AirlineProfileSession) {
  return (
    session?.companyId?.trim().toLowerCase() ||
    session?.email?.trim().toLowerCase() ||
    session?.company?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "default"
  );
}

async function readFileProfile(): Promise<AirlineProfile> {
  assertFileStoreFallbackAllowed("Airline profile store");
  try {
    const raw = await readFile(PROFILE_PATH, "utf-8");
    return normalizeProfile(JSON.parse(raw) as Partial<AirlineProfile>);
  } catch {
    return {};
  }
}

function normalizeProfile(profile: Partial<AirlineProfile>): AirlineProfile {
  return {
    logoPath: cleanText(profile.logoPath),
    bannerPath: cleanText(profile.bannerPath),
    iataCode: cleanCode(profile.iataCode, 2),
    icaoCode: cleanCode(profile.icaoCode, 3),
    primaryHub: cleanCode(profile.primaryHub, 4),
    secondaryHub: cleanCode(profile.secondaryHub, 4),
    headquarters: cleanText(profile.headquarters),
    alliance: cleanText(profile.alliance),
    parentGroup: cleanText(profile.parentGroup),
    keyLanes: cleanText(profile.keyLanes),
    cargoFocus: cleanText(profile.cargoFocus),
    compliance: cleanText(profile.compliance),
    updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : undefined,
  };
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : undefined;
}

function cleanCode(value: unknown, maxLength: number) {
  const cleaned = typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}
