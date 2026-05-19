import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { canManageWorkflow } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { createTeamAccount, listTeamAccounts } from "@/lib/services/team-accounts";

const TEAM_INVITE_BODY_LIMIT_BYTES = 12 * 1024;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "airline")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!canManageWorkflow(session)) {
    return NextResponse.json({ error: "Only managers and admins can manage team accounts." }, { status: 403 });
  }
  const rateLimited = enforceRateLimit({
    key: `team-list:${session.companyId ?? session.company}:${session.email}:${getClientIp(request)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const accounts = await listTeamAccounts(session.company, session.role, session.companyId);
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "gsa" && session.role !== "airline")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!canManageWorkflow(session)) {
    return NextResponse.json({ error: "Only managers and admins can invite employees." }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `team-invite:${session.companyId ?? session.company}:${session.email}:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await readJsonWithLimit<Record<string, unknown>>(request, TEAM_INVITE_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "Operator";
  const accessRole = body.accessRole === "manager" || body.accessRole === "admin" ? body.accessRole : "operator";
  if (accessRole === "admin" && session.accessRole !== "owner" && session.accessRole !== "admin") {
    return NextResponse.json({ error: "Only company admins can invite another admin." }, { status: 403 });
  }

  if (!email || !name || !email.includes("@")) {
    return NextResponse.json({ error: "Valid name and email are required." }, { status: 400 });
  }

  let account;
  try {
    account = await createTeamAccount({
      email,
      name,
      title,
      accessRole,
      role: session.role,
      company: session.company,
      companyId: session.companyId,
      createdBy: session.email,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ account });
}
