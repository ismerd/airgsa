import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { getAllRegistrations, updateRegistrationStatus } from "@/lib/registrations";
import { provisionApprovedRegistration } from "@/lib/auth/account-provisioning";

const REGISTRATION_REVIEW_BODY_LIMIT_BYTES = 16 * 1024;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const rateLimited = enforceRateLimit({
    key: `registration-review:${session.email}:${getClientIp(req)}`,
    limit: 80,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const { id } = await params;
  let body: { action?: "approve" | "reject"; note?: string };
  try {
    body = await readJsonWithLimit<{ action?: "approve" | "reject"; note?: string }>(req, REGISTRATION_REVIEW_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { action, note } = body;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const current = (await getAllRegistrations()).find((registration) => registration.id === id);
  if (!current) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  let provisioningNote = "";
  let oneTimePassword: string | undefined;
  if (action === "approve") {
    try {
      const result = await provisionApprovedRegistration(current);
      if (result.enabled) {
        if (result.provider === "postgres") {
          oneTimePassword = result.temporaryPassword;
          provisioningNote = result.temporaryPassword
            ? `Railway Postgres account created. User ${result.userId}, company ${result.companyId}. Temporary password issued once in admin response.`
            : `Existing Railway Postgres account linked. User ${result.userId}, company ${result.companyId}.`;
        } else {
          provisioningNote = result.invited
            ? `Supabase invite sent. User ${result.userId}, company ${result.companyId}.`
            : `Existing Supabase user linked. User ${result.userId}, company ${result.companyId}.`;
        }
      } else {
        provisioningNote = "No auth provider configured; registration approved without provisioning.";
      }
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  }

  const updated = await updateRegistrationStatus(
    id,
    action === "approve" ? "approved" : "rejected",
    [note, provisioningNote].filter(Boolean).join("\n")
  );

  if (!updated) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  return NextResponse.json(oneTimePassword ? { ...updated, oneTimePassword } : updated);
}
