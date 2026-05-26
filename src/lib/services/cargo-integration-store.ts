import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { SessionPayload } from "@/lib/auth/session";
import { createId } from "@/lib/services/ids";
import { rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";

export type CargoIntegrationProvider = "ecargoware" | "cargowise";
export type CargoIntegrationAuthMode = "bearer" | "login";

export type CargoIntegrationSettings = {
  id: string;
  provider: CargoIntegrationProvider;
  companyId?: string;
  company: string;
  enabled: boolean;
  baseUrl: string;
  authMode: CargoIntegrationAuthMode;
  agentName: string;
  iataNo: string;
  application: string;
  credentialPreview: string;
  hasCredentials: boolean;
  lastTestedAt?: string;
  lastTestStatus?: "success" | "failed";
  lastTestMessage?: string;
  updatedAt: string;
};

export type CargoIntegrationPatch = {
  enabled: boolean;
  baseUrl: string;
  authMode: CargoIntegrationAuthMode;
  agentName: string;
  iataNo: string;
  application: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  company?: string;
};

export type CargoIntegrationRuntimeConfig = {
  provider: CargoIntegrationProvider;
  enabled: boolean;
  baseUrl: string;
  authMode: CargoIntegrationAuthMode;
  agentName: string;
  iataNo: string;
  application: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  company?: string;
};

type EncryptedCredentialPayload = {
  v: 1;
  iv: string;
  tag: string;
  ciphertext: string;
};

type StoredCredentials = {
  bearerToken?: string;
  username?: string;
  password?: string;
  company?: string;
};

type IntegrationData = {
  baseUrl: string;
  authMode: CargoIntegrationAuthMode;
  enabled: boolean;
  agentName: string;
  iataNo: string;
  application: string;
  credentials?: EncryptedCredentialPayload;
  credentialPreview?: string;
  lastTestedAt?: string;
  lastTestStatus?: "success" | "failed";
  lastTestMessage?: string;
};

type IntegrationRow = {
  id: string;
  provider: CargoIntegrationProvider;
  role: "gsa";
  company_id?: string;
  company: string;
  enabled: boolean;
  updated_at: Date | string;
  data: IntegrationData;
};

const DEFAULT_ECARGOWARE_BASE_URL = "https://qa.fr8manage.app";
const FALLBACK_PROVIDER: CargoIntegrationProvider = "ecargoware";

export async function getCargoIntegrationSettings(
  session: SessionPayload | null,
  provider: CargoIntegrationProvider = FALLBACK_PROVIDER,
): Promise<CargoIntegrationSettings | null> {
  if (!session || session.role !== "gsa") return null;
  const row = await getIntegrationRow(session, provider);
  if (!row) return defaultSettings(session, provider);
  return toPublicSettings(row);
}

export async function upsertCargoIntegrationSettings(
  session: SessionPayload,
  provider: CargoIntegrationProvider,
  patch: CargoIntegrationPatch,
): Promise<CargoIntegrationSettings> {
  assertCanManageIntegration(session);

  const now = new Date().toISOString();
  const existing = await getIntegrationRow(session, provider);
  const existingCredentials = existing?.data.credentials ? decryptCredentials(existing.data.credentials) : {};
  const nextCredentials: StoredCredentials = {
    bearerToken: cleanSecret(patch.bearerToken) ?? existingCredentials.bearerToken,
    username: cleanSecret(patch.username) ?? existingCredentials.username,
    password: cleanSecret(patch.password) ?? existingCredentials.password,
    company: cleanSecret(patch.company) ?? existingCredentials.company,
  };
  const encryptedCredentials = hasAnyCredential(nextCredentials) ? encryptCredentials(nextCredentials) : undefined;
  const data: IntegrationData = {
    baseUrl: cleanUrl(patch.baseUrl) || defaultBaseUrl(provider),
    authMode: patch.authMode,
    enabled: patch.enabled,
    agentName: patch.agentName.trim(),
    iataNo: patch.iataNo.trim(),
    application: patch.application.trim(),
    credentials: encryptedCredentials,
    credentialPreview: credentialPreview(patch.authMode, nextCredentials),
    lastTestedAt: existing?.data.lastTestedAt,
    lastTestStatus: existing?.data.lastTestStatus,
    lastTestMessage: existing?.data.lastTestMessage,
  };

  const row = await withPostgresTransaction(async (client) => {
    const id = existing?.id ?? createId("int");
    await client.query(
      `
        insert into workflow_company_integrations (
          id, provider, role, company_id, company_key, company, enabled, created_at, updated_at, data
        )
        values ($1, $2, 'gsa', $3, $4, $5, $6, $7, $7, $8::jsonb)
        on conflict (role, company_key, provider)
        do update set
          company_id = excluded.company_id,
          company = excluded.company,
          enabled = excluded.enabled,
          updated_at = excluded.updated_at,
          data = excluded.data
      `,
      [
        id,
        provider,
        session.companyId ?? null,
        companyIntegrationKey(session),
        session.company,
        data.enabled,
        now,
        JSON.stringify(data),
      ],
    );
    return getIntegrationRowWithClient(client, session, provider);
  });

  if (!row) throw new Error("Integration settings could not be saved.");
  return toPublicSettings(row);
}

export async function getCargoIntegrationRuntimeConfig(
  session: SessionPayload | null,
  provider: CargoIntegrationProvider = FALLBACK_PROVIDER,
): Promise<CargoIntegrationRuntimeConfig | null> {
  if (!session || session.role !== "gsa") return null;
  const row = await getIntegrationRow(session, provider);
  if (!row || !row.enabled || !row.data.credentials) return null;
  const credentials = decryptCredentials(row.data.credentials);
  return {
    provider,
    enabled: row.enabled,
    baseUrl: row.data.baseUrl || defaultBaseUrl(provider),
    authMode: row.data.authMode,
    agentName: row.data.agentName,
    iataNo: row.data.iataNo,
    application: row.data.application,
    bearerToken: credentials.bearerToken,
    username: credentials.username,
    password: credentials.password,
    company: credentials.company,
  };
}

export async function updateCargoIntegrationTestStatus(
  session: SessionPayload,
  provider: CargoIntegrationProvider,
  status: "success" | "failed",
  message: string,
): Promise<CargoIntegrationSettings> {
  assertCanManageIntegration(session);
  const existing = await getIntegrationRow(session, provider);
  if (!existing) throw new Error("Save the integration before testing it.");

  const now = new Date().toISOString();
  const data: IntegrationData = {
    ...existing.data,
    lastTestedAt: now,
    lastTestStatus: status,
    lastTestMessage: message,
  };

  const row = await withPostgresTransaction(async (client) => {
    await client.query(
      `
        update workflow_company_integrations
        set enabled = $2, updated_at = $3, data = $4::jsonb
        where id = $1
      `,
      [existing.id, data.enabled, now, JSON.stringify(data)],
    );
    return getIntegrationRowWithClient(client, session, provider);
  });

  if (!row) throw new Error("Integration test status could not be saved.");
  return toPublicSettings(row);
}

export function assertCanManageIntegration(session: SessionPayload | null): asserts session is SessionPayload {
  if (!session || session.role !== "gsa") {
    throw new Error("GSA login required.");
  }
  if (!["owner", "admin", "manager"].includes(session.accessRole ?? "")) {
    throw new Error("Only GSA owners, admins, or managers can manage integrations.");
  }
}

async function getIntegrationRow(session: SessionPayload, provider: CargoIntegrationProvider) {
  return withPostgres(async (client) => getIntegrationRowWithClient(client, session, provider));
}

async function getIntegrationRowWithClient(
  client: { query: (query: string, values?: unknown[]) => Promise<{ rows: IntegrationRow[] }> },
  session: SessionPayload,
  provider: CargoIntegrationProvider,
) {
  const companyKey = companyIntegrationKey(session);
  const result = await client.query(
    `
      select id, provider, role, company_id, company, enabled, updated_at, data
      from workflow_company_integrations
      where role = 'gsa' and provider = $1 and company_key = $2
      limit 1
    `,
    [provider, companyKey],
  );
  return result.rows[0] ?? null;
}

function defaultSettings(session: SessionPayload, provider: CargoIntegrationProvider): CargoIntegrationSettings {
  const now = new Date().toISOString();
  return {
    id: "",
    provider,
    companyId: session.companyId,
    company: session.company,
    enabled: false,
    baseUrl: defaultBaseUrl(provider),
    authMode: "bearer",
    agentName: session.company,
    iataNo: "",
    application: "AirGSA",
    credentialPreview: "Not configured",
    hasCredentials: false,
    updatedAt: now,
  };
}

function toPublicSettings(row: IntegrationRow): CargoIntegrationSettings {
  const data = rowData<IntegrationData>(row);
  return {
    id: row.id,
    provider: row.provider,
    companyId: row.company_id,
    company: row.company,
    enabled: row.enabled,
    baseUrl: data.baseUrl || defaultBaseUrl(row.provider),
    authMode: data.authMode,
    agentName: data.agentName,
    iataNo: data.iataNo,
    application: data.application,
    credentialPreview: data.credentialPreview ?? "Configured",
    hasCredentials: Boolean(data.credentials),
    lastTestedAt: data.lastTestedAt,
    lastTestStatus: data.lastTestStatus,
    lastTestMessage: data.lastTestMessage,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function companyIntegrationKey(session: Pick<SessionPayload, "companyId" | "company">) {
  return (session.companyId?.trim() || session.company.trim().toLowerCase()).slice(0, 160);
}

function encryptCredentials(credentials: StoredCredentials): EncryptedCredentialPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", integrationKey(), iv);
  const plaintext = JSON.stringify(credentials);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
}

function decryptCredentials(payload: EncryptedCredentialPayload): StoredCredentials {
  const decipher = createDecipheriv("aes-256-gcm", integrationKey(), Buffer.from(payload.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as StoredCredentials;
}

function integrationKey() {
  const secret =
    process.env.INTEGRATION_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("INTEGRATION_SECRET or AUTH_SESSION_SECRET must be configured to store cargo integration credentials.");
    }
    return createHash("sha256").update("airgsa-local-integration-secret").digest();
  }
  return createHash("sha256").update(secret).digest();
}

function cleanSecret(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function hasAnyCredential(credentials: StoredCredentials) {
  return Boolean(credentials.bearerToken || credentials.username || credentials.password || credentials.company);
}

function credentialPreview(authMode: CargoIntegrationAuthMode, credentials: StoredCredentials) {
  if (authMode === "bearer") {
    return credentials.bearerToken ? `Bearer ${maskSecret(credentials.bearerToken)}` : "Bearer token missing";
  }
  if (credentials.username || credentials.company) {
    return `${credentials.username ?? "user not set"} / ${credentials.company ?? "company not set"}`;
  }
  return "Login credentials missing";
}

function maskSecret(value: string) {
  if (value.length <= 8) return "••••";
  return `••••${value.slice(-4)}`;
}

function defaultBaseUrl(provider: CargoIntegrationProvider) {
  if (provider === "ecargoware") return DEFAULT_ECARGOWARE_BASE_URL;
  return "";
}
