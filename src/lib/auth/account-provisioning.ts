import { isSupabaseConfigured, createSupabaseAdminClient } from "@/lib/supabase/client";
import type { Registration } from "@/lib/registrations";
import type { SessionPayload } from "./session-cookie";

export type ProvisioningResult =
  | { enabled: false }
  | { enabled: true; userId: string; companyId: string; invited: boolean };

export async function provisionApprovedRegistration(registration: Registration): Promise<ProvisioningResult> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { enabled: false };

  const supabase = createSupabaseAdminClient();
  const companyId = await ensureCompany(registration);
  const user = await inviteOrFindUser(registration);

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
  };
}

async function ensureCompany(registration: Registration) {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", registration.company)
    .eq("company_type", registration.role)
    .maybeSingle();

  if (readError) throw new Error(`Could not read company: ${readError.message}`);
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("companies")
    .insert({
      name: registration.company,
      company_type: registration.role,
      headquarters: registration.country,
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(`Could not create company: ${createError?.message ?? "missing id"}`);
  }

  return created.id as string;
}

async function inviteOrFindUser(registration: Registration) {
  const supabase = createSupabaseAdminClient();
  const metadata: Pick<SessionPayload, "role" | "name" | "company"> = {
    role: registration.role,
    name: registration.name,
    company: registration.company,
  };

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(registration.email, {
    data: metadata,
  });

  if (data.user) return { id: data.user.id, invited: true };

  const existing = await findUserByEmail(registration.email);
  if (existing) return { id: existing.id, invited: false };

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
