import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";

export type TeamAccount = {
  id: string;
  email: string;
  password: string;
  role: "airline" | "gsa";
  accessRole: NonNullable<SessionPayload["accessRole"]>;
  name: string;
  company: string;
  title: string;
  status: "active" | "invited";
  quotes: number;
  bookings: number;
  responseTime: string;
  createdAt: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "team-accounts.json");

const seedAccounts: TeamAccount[] = [
  {
    id: "team-gsa-lena",
    email: "lena.hartmann@forto.example",
    password: "demo2026",
    role: "gsa",
    accessRole: "operator",
    name: "Lena Hartmann",
    company: "Forto Logistics",
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
    title: "Capacity operator",
    status: "active",
    quotes: 0,
    bookings: 0,
    responseTime: "18 min",
    createdAt: "2026-05-16T00:00:00.000Z",
  },
];

export async function listTeamAccounts(company?: string, role?: "airline" | "gsa") {
  const accounts = await readTeamAccounts();
  return accounts.filter((account) => (!company || account.company === company) && (!role || account.role === role));
}

export async function findTeamAccountByCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = await readTeamAccounts();
  return accounts.find((account) => account.email.toLowerCase() === normalizedEmail && account.password === password) ?? null;
}

export async function createTeamAccount(input: {
  email: string;
  name: string;
  title: string;
  role: "airline" | "gsa";
  accessRole: NonNullable<SessionPayload["accessRole"]>;
  company: string;
}) {
  const accounts = await readTeamAccounts();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = accounts.find((account) => account.email.toLowerCase() === normalizedEmail);
  if (existing) return existing;

  const account: TeamAccount = {
    id: `team-${Date.now()}`,
    email: normalizedEmail,
    password: makeDemoPassword(input.name),
    role: input.role,
    accessRole: input.accessRole,
    name: input.name.trim(),
    company: input.company,
    title: input.title.trim() || "Operator",
    status: "active",
    quotes: 0,
    bookings: 0,
    responseTime: "-",
    createdAt: new Date().toISOString(),
  };
  const next = [...accounts, account];
  await writeTeamAccounts(next);
  return account;
}

async function readTeamAccounts(): Promise<TeamAccount[]> {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as TeamAccount[];
    return mergeSeeds(parsed);
  } catch {
    await writeTeamAccounts(seedAccounts);
    return seedAccounts;
  }
}

async function writeTeamAccounts(accounts: TeamAccount[]) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(accounts, null, 2)}\n`, "utf-8");
}

function mergeSeeds(accounts: TeamAccount[]) {
  const existing = new Set(accounts.map((account) => account.email.toLowerCase()));
  return [...accounts, ...seedAccounts.filter((account) => !existing.has(account.email.toLowerCase()))];
}

function makeDemoPassword(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8) || "user";
  return `${slug}2026`;
}
