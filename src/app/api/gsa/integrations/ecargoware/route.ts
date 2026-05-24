import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import {
  assertCanManageIntegration,
  getCargoIntegrationSettings,
  upsertCargoIntegrationSettings,
  type CargoIntegrationAuthMode,
} from "@/lib/services/cargo-integration-store";

const BODY_LIMIT_BYTES = 32 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "gsa") {
    return NextResponse.json({ error: "GSA login required." }, { status: 403 });
  }
  const integration = await getCargoIntegrationSettings(session, "ecargoware");
  return NextResponse.json({ integration });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  try {
    assertCanManageIntegration(session);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `gsa-integration-ecargoware:${session.companyId ?? session.company}:${session.email}:${getClientIp(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await readJsonWithLimit(req, BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const authMode = parseAuthMode(body.authMode);
  const baseUrl = readString(body.baseUrl);
  if (!baseUrl) return NextResponse.json({ error: "Base URL is required." }, { status: 400 });

  try {
    const integration = await upsertCargoIntegrationSettings(session, "ecargoware", {
      enabled: body.enabled === true,
      baseUrl,
      authMode,
      agentName: readString(body.agentName),
      iataNo: readString(body.iataNo),
      application: readString(body.application) || "AirGSA",
      bearerToken: readOptionalString(body.bearerToken),
      username: readOptionalString(body.username),
      password: readOptionalString(body.password),
      company: readOptionalString(body.company),
    });
    return NextResponse.json({ integration });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

function parseAuthMode(value: unknown): CargoIntegrationAuthMode {
  return value === "login" ? "login" : "bearer";
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const clean = readString(value);
  return clean || undefined;
}
