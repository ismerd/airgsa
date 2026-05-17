import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";

export type TeamAccount = {
  id: string;
  email: string;
  password: string;
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
};

const STORE_PATH = path.join(process.cwd(), "data", "team-accounts.json");
const STORE_KEY = "team_accounts_store";

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
  const issueImmediatePassword = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_ACCOUNTS === "true";

  const account: TeamAccount = {
    id: `team-${Date.now()}`,
    email: normalizedEmail,
    password: issueImmediatePassword ? makeDemoPassword(input.name) : "",
    role: input.role,
    accessRole: input.accessRole,
    name: input.name.trim(),
    company: input.company,
    companyId: input.companyId,
    title: input.title.trim() || "Operator",
    status: issueImmediatePassword ? "active" : "invited",
    quotes: 0,
    bookings: 0,
    responseTime: "-",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };
  const next = [...accounts, account];
  await writeTeamAccounts(next);
  return account;
}

async function readTeamAccounts(): Promise<TeamAccount[]> {
  const dbAccounts = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    return result.rows[0] ? normalizeAccounts(rowData<TeamAccount[]>(result.rows[0])) : [];
  });
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
  const saved = await withPostgres(async (client) => {
    await client.query(
      `insert into app_settings (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [STORE_KEY, JSON.stringify(normalizeAccounts(accounts))],
    );
    return true;
  });
  if (saved) return;

  assertFileStoreFallbackAllowed("Team account store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalizeAccounts(accounts), null, 2)}\n`, "utf-8");
}

function withDemoSeeds(accounts: TeamAccount[]) {
  if (!allowSeedTeamAccounts()) return accounts;
  const existing = new Set(accounts.map((account) => account.email.toLowerCase()));
  return [...accounts, ...seedAccounts.filter((account) => !existing.has(account.email.toLowerCase()))];
}

function normalizeAccounts(accounts: TeamAccount[]) {
  return accounts.map((account) => ({
    ...account,
    email: account.email.trim().toLowerCase(),
    status: account.status ?? "active",
    quotes: Number.isFinite(account.quotes) ? account.quotes : 0,
    bookings: Number.isFinite(account.bookings) ? account.bookings : 0,
    responseTime: account.responseTime ?? "-",
  }));
}

function allowSeedTeamAccounts() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_ACCOUNTS === "true";
}

function makeDemoPassword(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8) || "user";
  return `${slug}2026`;
}
