import { NextRequest, NextResponse } from "next/server";
import {
  RequestBodyTooLargeError,
  bodyTooLargeResponse,
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit,
} from "@/lib/api/protection";
import { getSession } from "@/lib/auth/session";
import { executeEcargowareOperation, type EcargowareExecuteInput } from "@/lib/integrations/ecargoware-client";
import { getCargoIntegrationRuntimeConfig } from "@/lib/services/cargo-integration-store";

const ECARGOWARE_BODY_LIMIT_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "gsa") {
    return NextResponse.json({ error: "Only signed-in GSA users can use the cargo workspace." }, { status: 403 });
  }

  const rateLimited = enforceRateLimit({
    key: `ecargoware:${session.companyId ?? session.company}:${session.email}:${getClientIp(request)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const payload = await readJsonWithLimit<EcargowareExecuteInput>(request, ECARGOWARE_BODY_LIMIT_BYTES);
    if (!payload.operationId) {
      return NextResponse.json({ error: "operationId is required." }, { status: 400 });
    }

    const integrationConfig = await getCargoIntegrationRuntimeConfig(session, "ecargoware");
    const result = await executeEcargowareOperation(payload, integrationConfig);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return bodyTooLargeResponse(error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    const message = error instanceof Error ? error.message : "eCargoWare request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
