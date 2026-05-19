import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { provisionTeamAccount } from "@/lib/auth/account-provisioning";
import type { SessionPayload } from "@/lib/auth/session";
import { createId } from "@/lib/services/ids";
import { assertFileStoreFallbackAllowed, rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";

export type TeamAccount = {
  id: string;
  email: string;
  password?: string;
  authUserId?: string;
  role: "airline" | "gsa";
  accessRole: NonNullable<SessionPayload["accessRole"]>;
  name: string;
  company: string;
  companyId?: string;
  title: string;
  status: "active" | "invited" | "disabled";
  quotes: number;
  bookings: number;
  responseTime: string;
  createdAt: string;
  createdBy?: string;
  invitedAt?: string;
  inviteError?: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "team-accounts.json");
const LEGACY_STORE_KEY = "team_accounts_store";

const seedAccounts: TeamAccount[] = [
  {
    id: "team-gsa-lena",
    email: "lena.hartmann@forto.example",
    password: "demo2026",
    role: "gsa",
    accessRole: "operator",
    name: "Lena Hartmann",
    company: "Forto Logistics",
    companyId: "forto-logistics",
    title: "Cargo operator",
    status: "active",
    quotes: 42,
    bookings: 18,
    responseTime: "14 min",
    createdAt: "2026-05-16T00:00:00.000Z",
  },
  {
    id: "team-airline-fatima",
    email: "fatima.ops@saudia.example",
    password: "demo2026",
    role: "airline",
    accessRole: "operator",
    name: "Fatima Operations",
    company: "Saudia Cargo",
    companyId: "saudia-cargo",
    title: "Capacity operator",
    status: "active",
    quotes: 0,
    bookings: 0,
    responseTime: "18 min",
    createdAt: "2026-05-16T00:00:00.000Z",
  },
];

export async function listTeamAccounts(company?: string, role?: "airline" | "gsa", companyId?: string) {
  const accounts = await readTeamAccounts();
  return accounts.filter((account) => {
    const sameCompany = companyId && account.companyId ? account.companyId === companyId : !company || account.company === company;
    return sameCompany && (!role || account.role === role);
  });
}

export async function findTeamAccountByCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = await readTeamAccounts();
  return accounts.find((account) => account.status === "active" && account.email.toLowerCase() === normalizedEmail && account.password && account.password === password) ?? null;
}

export async function createTeamAccount(input: {
  email: string;
  name: string;
  title: string;
  role: "airline" | "gsa";
  accessRole: NonNullable<SessionPayload["accessRole"]>;
  company: string;
  companyId?: string;
  createdBy?: string;
}) {
  const accounts = await readTeamAccounts();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = accounts.find((account) => account.email.toLowerCase() === normalizedEmail);
  if (existing) return existing;
  const provisioning = await provisionTeamAccount({
    email: normalizedEmail,
    name: input.name.trim(),
    role: input.role,
    accessRole: input.accessRole,
    company: input.company,
    companyId: input.companyId,
  });
  const issueImmediatePassword = !provisioning.enabled && allowSeedTeamAccounts();
  if (!provisioning.enabled && !issueImmediatePassword) {
    throw new Error("Team invites require Railway Postgres and a configured email provider.");
  }
  const invitedAt = provisioning.enabled && provisioning.invited ? new Date().toISOString() : undefined;

  const account: TeamAccount = {
    id: createId("team"),
    email: normalizedEmail,
    password: issueImmediatePassword ? makeDemoPassword(input.name) : undefined,
    authUserId: provisioning.enabled ? provisioning.userId : undefined,
    role: input.role,
    accessRole: input.accessRole,
    name: input.name.trim(),
    company: input.company,
    companyId: provisioning.enabled ? provisioning.companyId : input.companyId,
    title: input.title.trim() || "Operator",
    status: provisioning.enabled ? (provisioning.invited ? "invited" : "active") : issueImmediatePassword ? "active" : "invited",
    quotes: 0,
    bookings: 0,
    responseTime: "-",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    invitedAt,
  };
  const next = [...accounts, account];
  await writeTeamAccounts(next);
  return account;
}

async function readTeamAccounts(): Promise<TeamAccount[]> {
  const dbAccounts = await withPostgres(async (client) => {
    const result = await client.query("select data from team_accounts order by created_at asc");
    return normalizeAccounts(result.rows.flatMap((row) => rowData<TeamAccount>(row)));
  });
  if (dbAccounts?.length) return withDemoSeeds(dbAccounts);

  const legacyAccounts = await readLegacyTeamAccounts();
  if (legacyAccounts.length) {
    await writeTeamAccounts(legacyAccounts);
    return withDemoSeeds(legacyAccounts);
  }
  if (dbAccounts) return withDemoSeeds(dbAccounts);

  assertFileStoreFallbackAllowed("Team account store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as TeamAccount[];
    return withDemoSeeds(normalizeAccounts(parsed));
  } catch {
    const initial = allowSeedTeamAccounts() ? seedAccounts : [];
    if (initial.length) await writeTeamAccounts(initial);
    return initial;
  }
}

async function writeTeamAccounts(accounts: TeamAccount[]) {
  const normalized = normalizeAccounts(accounts);
  const saved = await withPostgresTransaction(async (client) => {
    await client.query("delete from team_accounts");
    for (const account of normalized) {
      await client.query(
        `insert into team_accounts
          (id, email, auth_user_id, role, access_role, company, company_id, status, created_at, invited_at, last_invite_error, updated_at, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12::jsonb)
         on conflict (id) do update set
          email = excluded.email,
          auth_user_id = excluded.auth_user_id,
          role = excluded.role,
          access_role = excluded.access_role,
          company = excluded.company,
          company_id = excluded.company_id,
          status = excluded.status,
          invited_at = excluded.invited_at,
          last_invite_error = excluded.last_invite_error,
          updated_at = excluded.updated_at,
          data = excluded.data`,
        [
          account.id,
          account.email,
          account.authUserId ?? null,
          account.role,
          account.accessRole,
          account.company,
          account.companyId ?? null,
          account.status,
          account.createdAt,
          account.invitedAt ?? null,
          account.inviteError ?? null,
          JSON.stringify(account),
        ],
      );
    }
    return true;
  });
  if (saved) return;

  assertFileStoreFallbackAllowed("Team account store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalizeAccounts(accounts), null, 2)}\n`, "utf-8");
}

async function readLegacyTeamAccounts(): Promise<TeamAccount[]> {
  const dbAccounts = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [LEGACY_STORE_KEY]);
    return result.rows[0] ? normalizeAccounts(rowData<TeamAccount[]>(result.rows[0])) : [];
  });
  if (dbAccounts) return dbAccounts;

  assertFileStoreFallbackAllowed("Team account legacy store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeAccounts(JSON.parse(raw) as TeamAccount[]);
  } catch {
    return [];
  }
}

function withDemoSeeds(accounts: TeamAccount[]) {
  if (!allowSeedTeamAccounts()) return accounts;
  const existing = new Set(accounts.map((account) => account.email.toLowerCase()));
  return [...accounts, ...seedAccounts.filter((account) => !existing.has(account.email.toLowerCase()))];
}

function normalizeAccounts(accounts: TeamAccount[]) {
  const keepLocalPasswords = allowSeedTeamAccounts();
  return accounts.map((account) => ({
    ...account,
    password: keepLocalPasswords && typeof account.password === "string" && account.password ? account.password : undefined,
    authUserId: typeof account.authUserId === "string" && account.authUserId ? account.authUserId : undefined,
    email: account.email.trim().toLowerCase(),
    status: account.status ?? "active",
    quotes: Number.isFinite(account.quotes) ? account.quotes : 0,
    bookings: Number.isFinite(account.bookings) ? account.bookings : 0,
    responseTime: account.responseTime ?? "-",
    invitedAt: typeof account.invitedAt === "string" ? account.invitedAt : undefined,
    inviteError: typeof account.inviteError === "string" && account.inviteError ? account.inviteError : undefined,
  }));
}

function allowSeedTeamAccounts() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_ACCOUNTS === "true";
}

function makeDemoPassword(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8) || "user";
  return `${slug}2026`;
}
