import { realGsaPartners } from "@/lib/real-gsa-data";

export type DemoAccount = {
  email: string;
  password: string;
  role: "airline" | "gsa" | "admin";
  name: string;
  company: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@airgsa.demo",
    password: "admin2026",
    role: "admin",
    name: "Platform Admin",
    company: "AirGSA",
  },
  {
    email: "saudia@airgsa.demo",
    password: "demo2026",
    role: "airline",
    name: "Ahmed Al-Rashid",
    company: "Saudia Cargo",
  },
  ...realGsaPartners.map((partner) => ({
    email: partner.email,
    password: "demo2026",
    role: "gsa" as const,
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
