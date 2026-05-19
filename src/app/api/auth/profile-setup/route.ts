import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession, updateSession } from "@/lib/auth/session";
import { updateRailwayAccountProfile } from "@/lib/auth/railway-accounts";

const PROFILE_SETUP_BODY_MAX_BYTES = 8 * 1024;

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = enforceRateLimit({
    key: `profile-setup:${session.email}:${getClientIp(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { name?: unknown; company?: unknown };
  try {
    body = await readJsonWithLimit<{ name?: unknown; company?: unknown }>(req, PROFILE_SETUP_BODY_MAX_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!company) return NextResponse.json({ error: "Company name is required." }, { status: 400 });

  const updated = await updateRailwayAccountProfile(session.email, { name, company });
  if (!updated) return NextResponse.json({ error: "Account could not be updated." }, { status: 500 });

  await updateSession({ name: updated.name, company: updated.company });
  return NextResponse.json({ ok: true, role: updated.role });
}
