import { realGsaPartners } from "@/lib/real-gsa-data";
import { createSupabaseAuthClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SessionPayload } from "./session-cookie";

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
  ...realGsaPartners
    .map((partner) => ({
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

export async function authenticateCredentials(email: string, password: string): Promise<SessionPayload | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    const account = await authenticateWithSupabase(normalizedEmail, password);
    if (account) return account;
  }

  if (allowDemoAccounts()) {
    return validateCredentials(normalizedEmail, password);
  }

  return null;
}

async function authenticateWithSupabase(email: string, password: string): Promise<SessionPayload | null> {
  try {
    const supabase = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("email, full_name, role, company_id")
      .eq("id", authData.user.id)
      .maybeSingle();

    const role = getRole(profile?.role ?? authData.user.user_metadata?.role);
    if (!role) return null;

    let company = getString(authData.user.user_metadata?.company) ?? "AirGSA";
    if (profile?.company_id) {
      const { data: companyRow } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .maybeSingle();
      company = companyRow?.name ?? company;
    }

    return {
      email: profile?.email ?? authData.user.email ?? email,
      role,
      name: profile?.full_name ?? getString(authData.user.user_metadata?.name) ?? authData.user.email ?? email,
      company,
      companyId: profile?.company_id ?? undefined,
    };
  } catch (error) {
    console.warn("[auth] Supabase login failed:", (error as Error).message);
    return null;
  }
}

function allowDemoAccounts() {
  return !isSupabaseConfigured || process.env.ALLOW_DEMO_ACCOUNTS === "true" || process.env.NODE_ENV !== "production";
}

function getRole(value: unknown): SessionPayload["role"] | null {
  return value === "airline" || value === "gsa" || value === "admin" ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
