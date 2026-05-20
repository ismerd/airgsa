import { realGsaPartners } from "@/lib/real-gsa-data";
import { authenticateRailwayAccount } from "@/lib/auth/railway-accounts";
import { findTeamAccountByCredentials } from "@/lib/services/team-accounts";
import type { SessionPayload } from "./session-cookie";

export type DemoAccount = {
  email: string;
  password: string;
  role: "airline" | "gsa" | "admin";
  accessRole?: SessionPayload["accessRole"];
  name: string;
  company: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@airgsa.demo",
    password: "admin2026",
    role: "admin",
    accessRole: "owner",
    name: "Platform Admin",
    company: "AirGSA",
  },
  {
    email: "airline@airgsa.demo",
    password: "demo2026",
    role: "airline",
    accessRole: "admin",
    name: "Maya Keller",
    company: "AeroNova Cargo",
  },
  {
    email: "ops@aeronova.example",
    password: "demo2026",
    role: "airline",
    accessRole: "operator",
    name: "Nora Weiss",
    company: "AeroNova Cargo",
  },
  {
    email: "lena.hartmann@forto.example",
    password: "demo2026",
    role: "gsa",
    accessRole: "operator",
    name: "Lena Hartmann",
    company: "Forto Logistics",
  },
  ...realGsaPartners
    .map((partner) => ({
      email: partner.email,
      password: "demo2026",
      role: "gsa" as const,
      accessRole: "admin" as const,
      name: partner.contactName,
      company: partner.name,
    })),
];

export function validateCredentials(
  email: string,
  password: string
): DemoAccount | null {
  return (
    DEMO_ACCOUNTS.find(
      (a) =>
        a.email.toLowerCase() === email.toLowerCase() &&
        a.password === password
    ) ?? null
  );
}

export async function authenticateCredentials(email: string, password: string): Promise<SessionPayload | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const railwayAccount = await authenticateRailwayAccount(normalizedEmail, password);
  if (railwayAccount) return railwayAccount;

  if (allowDemoAccounts()) {
    const demoAccount = validateCredentials(normalizedEmail, password);
    if (demoAccount) return demoAccount;

    const teamAccount = await findTeamAccountByCredentials(normalizedEmail, password);
    if (teamAccount) {
      return {
        email: teamAccount.email,
        role: teamAccount.role,
        accessRole: teamAccount.accessRole,
        name: teamAccount.name,
        company: teamAccount.company,
        companyId: teamAccount.companyId,
      };
    }
  }

  return null;
}

function allowDemoAccounts() {
  return process.env.ALLOW_DEMO_ACCOUNTS === "true" || process.env.NODE_ENV !== "production";
}
