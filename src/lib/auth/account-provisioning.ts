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
      provider: "postgres";
      temporaryPassword?: string;
    };

export async function provisionApprovedRegistration(registration: Registration): Promise<ProvisioningResult> {
  return provisionRailwayAccount({
    email: registration.email,
    name: registration.name,
    role: registration.role,
    accessRole: "admin",
    company: registration.company,
  });
}

export async function provisionTeamAccount(input: {
  email: string;
  name: string;
  role: "airline" | "gsa";
  accessRole: NonNullable<SessionPayload["accessRole"]>;
  company: string;
  companyId?: string;
}): Promise<ProvisioningResult> {
  return provisionRailwayAccount(input);
}
