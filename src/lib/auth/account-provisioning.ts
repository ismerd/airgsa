import type { Registration } from "@/lib/registrations";
import { hasTransactionalEmailProvider, sendTransactionalEmail } from "@/lib/services/notification-email";
import { createRailwayInviteToken, provisionRailwayAccount } from "./railway-accounts";
import type { SessionPayload } from "./session-cookie";

export type ProvisioningResult =
  | { enabled: false }
  | {
      enabled: true;
      userId: string;
      companyId: string;
      invited: boolean;
      provider: "postgres";
    };

export async function provisionApprovedRegistration(registration: Registration): Promise<ProvisioningResult> {
  const result = await provisionRailwayAccount({
    email: registration.email,
    name: registration.name,
    role: registration.role,
    accessRole: "admin",
    company: registration.company,
  });
  if (!result.enabled) return result;

  await sendAccountInvite({
    email: registration.email,
    name: registration.name,
    company: registration.company,
    role: registration.role,
  });

  return { ...result, invited: true };
}

export async function provisionTeamAccount(input: {
  email: string;
  name: string;
  role: "airline" | "gsa";
  accessRole: NonNullable<SessionPayload["accessRole"]>;
  company: string;
  companyId?: string;
}): Promise<ProvisioningResult> {
  const result = await provisionRailwayAccount(input);
  if (!result.enabled) return result;

  await sendAccountInvite({
    email: input.email,
    name: input.name,
    company: input.company,
    role: input.role,
  });

  return { ...result, invited: true };
}

async function sendAccountInvite(input: {
  email: string;
  name: string;
  company: string;
  role: "airline" | "gsa";
}) {
  if (!hasTransactionalEmailProvider()) {
    throw new Error("Invite email delivery is not configured. Set RESEND_API_KEY, SMTP_HOST, or WORKFLOW_EMAIL_WEBHOOK_URL.");
  }

  const token = await createRailwayInviteToken(input.email);
  if (!token) throw new Error("Could not create account invite token.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required to send invite links.");

  const setupUrl = new URL(`/reset-password?token=${encodeURIComponent(token)}&mode=invite`, appUrl).toString();
  const result = await sendTransactionalEmail({
    to: input.email,
    subject: "Set up your AirGSA account",
    text: `Hello ${input.name},\n\nYour AirGSA access request for ${input.company} has been approved.\n\nSet your password and finish setup here. This link expires in 7 days:\n\n${setupUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">Your AirGSA access has been approved</h2>
        <p>Hello ${escapeHtml(input.name)},</p>
        <p>Your access request for <strong>${escapeHtml(input.company)}</strong> has been approved.</p>
        <p><a href="${escapeHtml(setupUrl)}">Set password and finish setup</a></p>
        <p style="color:#6b7280;font-size:13px">This single-use link expires in 7 days.</p>
      </div>
    `,
  });

  if (result.status === "failed" || result.status === "skipped") {
    throw new Error(result.error ?? "Invite email could not be sent.");
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
