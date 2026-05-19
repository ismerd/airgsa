import { isSupabaseConfigured, createSupabaseAdminClient } from "@/lib/supabase/client";
import type { Registration } from "@/lib/registrations";
import { provisionRailwayAccount } from "./railway-accounts";
import type { SessionPayload } from "./session-cookie";

export type ProvisioningResult =
  | { enabled: false }
  | {
      enabled: true;
      userId: string;
      companyId: string;
      invited: boolean;
      provider: "supabase" | "postgres";
      temporaryPassword?: string;
    };

export async function provisionApprovedRegistration(registration: Registration): Promise<ProvisioningResult> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return provisionRailwayAccount({
      email: registration.email,
      name: registration.name,
      role: registration.role,
      accessRole: "admin",
      company: registration.company,
    });
  }

  const supabase = createSupabaseAdminClient();
  const companyId = await ensureCompany({
    company: registration.company,
    role: registration.role,
    country: registration.country,
  });
  const user = await inviteOrFindUser({
    email: registration.email,
    name: registration.name,
    role: registration.role,
    company: registration.company,
    accessRole: "admin",
    companyId,
  });

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: registration.email,
      full_name: registration.name,
      role: registration.role,
      company_id: companyId,
    },
    { onConflict: "id" },
  );

  if (profileError) throw new Error(`Could not create user profile: ${profileError.message}`);

  return {
    enabled: true,
    userId: user.id,
    companyId,
    invited: user.invited,
    provider: "supabase",
  };
}

export async function provisionTeamAccount(input: {
  email: string;
  name: string;
  role: "airline" | "gsa";
  accessRole: NonNullable<SessionPayload["accessRole"]>;
  company: string;
  companyId?: string;
}): Promise<ProvisioningResult> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return provisionRailwayAccount(input);
  }

  const supabase = createSupabaseAdminClient();
  const companyId = input.companyId && isUuid(input.companyId)
    ? input.companyId
    : await ensureCompany({ company: input.company, role: input.role });
  const user = await inviteOrFindUser({ ...input, companyId });

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: input.email,
      full_name: input.name,
      role: input.role,
      company_id: companyId,
    },
    { onConflict: "id" },
  );

  if (profileError) throw new Error(`Could not create user profile: ${profileError.message}`);

  return {
    enabled: true,
    userId: user.id,
    companyId,
    invited: user.invited,
    provider: "supabase",
  };
}

async function ensureCompany(input: { company: string; role: "airline" | "gsa"; country?: string }) {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", input.company)
    .eq("company_type", input.role)
    .maybeSingle();

  if (readError) throw new Error(`Could not read company: ${readError.message}`);
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("companies")
    .insert({
      name: input.company,
      company_type: input.role,
      headquarters: input.country,
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(`Could not create company: ${createError?.message ?? "missing id"}`);
  }

  return created.id as string;
}

async function inviteOrFindUser(input: {
  email: string;
  name: string;
  role: "airline" | "gsa";
  accessRole?: SessionPayload["accessRole"];
  company: string;
  companyId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const metadata: SessionPayload = {
    role: input.role,
    accessRole: input.accessRole,
    name: input.name,
    company: input.company,
    companyId: input.companyId,
    email: input.email,
  };

  const redirectTo = getInviteRedirectTo();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email, {
    data: metadata,
    ...(redirectTo ? { redirectTo } : {}),
  });

  if (data.user) return { id: data.user.id, invited: true };

  const existing = await findUserByEmail(input.email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, { user_metadata: metadata });
    return { id: existing.id, invited: false };
  }

  throw new Error(`Could not invite user: ${error?.message ?? "unknown Supabase error"}`);
}

async function findUserByEmail(email: string) {
  const supabase = createSupabaseAdminClient();
  const normalizedEmail = email.toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`Could not search users: ${error.message}`);
    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 100) return null;
  }

  return null;
}

function isUuid(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function getInviteRedirectTo() {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicitUrl) return new URL("/reset-password", explicitUrl).toString();
  if (process.env.VERCEL_URL) return new URL("/reset-password", `https://${process.env.VERCEL_URL}`).toString();
  return undefined;
}
